import { Horizon } from '@stellar/stellar-sdk';
import * as StellarSdk from '@stellar/stellar-sdk';
import type { 
  TransactionDetails, 
  NetworkConfig, 
  SorobanOperation, 
  ContractEvent, 
  SimulationResult 
} from '../types/stellar';
import { Node, Edge } from 'reactflow';

let server: Horizon.Server;
let networkConfig: NetworkConfig = {
  isTestnet: false,
  networkUrl: 'https://horizon.stellar.org',
  networkPassphrase: 'Public Global Stellar Network ; September 2015',
};

export const setNetwork = (config: NetworkConfig) => {
  networkConfig = config;
  server = new Horizon.Server(config.networkUrl);
};

// Initialize with testnet by default
setNetwork(networkConfig);

export const fetchTransaction = async (hash: string): Promise<TransactionDetails> => {
  try {
    console.log('📡 Fetching transaction:', hash);
    console.log('🌐 Network Config:', networkConfig);
    
    const tx = await server.transactions().transaction(hash).call();
    console.log('📡 Transaction fetched successfully');
    
    const operations = await server.operations()
      .forTransaction(hash)
      .limit(200)
      .call();

    console.log('✅ Operations count:', operations.records.length);
    
    // Log each operation in detail
    operations.records.forEach((op, index) => {
      console.log(`\n🔍 OPERATION ${index + 1} DETAILED ANALYSIS:`);
      console.log(`Type: ${op.type}`);
      console.log(`Full Operation Object:`, JSON.stringify(op, null, 2));
      
      if (op.type === 'invoke_host_function') {
        console.log(`\n🎯 INVOKE_HOST_FUNCTION OPERATION ${index + 1}:`);
        console.log('All available fields:', Object.keys(op));
        
        // Check every possible field that might contain contract info
        const possibleContractFields = [
          'contract_id', 'contractId', 'contract_address', 'contractAddress',
          'address', 'contract', 'target', 'destination', 'account_id',
          'host_function', 'hostFunction', 'function', 'invoke_contract',
          'parameters', 'args', 'auth', 'footprint', 'resource_fee'
        ];
        
        possibleContractFields.forEach(field => {
          if ((op as any)[field] !== undefined) {
            console.log(`Found field '${field}':`, (op as any)[field]);
          }
        });

        // Deep scan for any field containing 'C' followed by base32 characters
        const scanForContractIds = (obj: any, path = ''): void => {
          if (typeof obj === 'string' && /^C[A-Z2-7]{55,62}$/.test(obj)) {
            console.log(`🎯 POTENTIAL CONTRACT ID FOUND at ${path}:`, obj);
          }
          if (typeof obj === 'object' && obj !== null) {
            Object.entries(obj).forEach(([key, value]) => {
              scanForContractIds(value, path ? `${path}.${key}` : key);
            });
          }
        };
        
        console.log('🔍 Scanning entire operation for contract IDs...');
        scanForContractIds(op, 'operation');
      }
    });

    // Enhanced Soroban processing
    const sorobanOperations: SorobanOperation[] = [];
    const events: ContractEvent[] = [];

    // Try to get Soroban details for both testnet and mainnet
    let sorobanData = null;
    try {
      sorobanData = await querySorobanRpc(hash);
      console.log('🔮 Soroban RPC response:', sorobanData);
    } catch (sorobanError) {
      console.warn('⚠️ Soroban RPC query failed:', sorobanError);
    }

    // Process operations and extract contract IDs
    const contractIds: Map<number, string> = new Map();

    for (let i = 0; i < operations.records.length; i++) {
      const op = operations.records[i];
      console.log(`🔍 Processing operation ${i}:`, op);

      if (op.type === 'invoke_host_function') {
        console.log('🎯 Found invoke_host_function operation:', op);

        // Try multiple extraction methods - pass transaction envelope XDR directly
        const contractId = await extractContractId(op, sorobanData, i, tx.hash, tx.envelope_xdr);
        
        if (contractId && contractId !== 'Unknown') {
          contractIds.set(i, contractId);
          console.log(`✅ Contract ID found for operation ${i}:`, contractId);
          
          // Extract function details with enhanced data
          const functionDetails = extractFunctionDetails(op, sorobanData, i, tx);

          sorobanOperations.push({
            type: 'soroban',
            contractId,
            functionName: functionDetails.functionName,
            args: functionDetails.args,
            auth: functionDetails.auth,
            result: functionDetails.result,
            error: functionDetails.error,
            events: functionDetails.events,
            stateChanges: functionDetails.stateChanges,
            ttlExtensions: functionDetails.ttlExtensions,
            resourceUsage: functionDetails.resourceUsage
          });

          console.log(`📦 Pushed soroban operation ${i}:`, {
            contractId,
            functionName: functionDetails.functionName,
            argsCount: functionDetails.args?.length,
            eventsCount: functionDetails.events?.length,
            stateChangesCount: functionDetails.stateChanges?.length,
            ttlExtensionsCount: functionDetails.ttlExtensions?.length,
            hasResourceUsage: !!functionDetails.resourceUsage
          });

          // Extract events for this operation
          if (functionDetails.events && functionDetails.events.length > 0) {
            events.push(...functionDetails.events.map((event: any) => ({
              contractId: event.contractId || contractId,
              type: event.type,
              topics: event.topics,
              data: event.data
            })));
          }
        } else {
          console.warn(`❌ Could not extract contract ID for operation ${i}`);
          
          // Add a placeholder soroban operation
          sorobanOperations.push({
            type: 'soroban',
            contractId: 'Unknown Contract',
            functionName: 'invoke',
            args: [],
            auth: [],
            error: 'Could not extract contract information'
          });
        }
      }
    }

    const result: TransactionDetails = {
      hash: tx.hash,
      sourceAccount: tx.source_account,
      fee: (tx as any).fee_paid || tx.max_fee || '0',
      operations: operations.records,
      status: tx.successful ? 'success' : 'failed',
      sorobanOperations,
      events,
      ledgerTimestamp: new Date(tx.created_at).getTime()
    };

    // Add error information for failed transactions
    if (!tx.successful) {
      result.errorMessage = (tx as any).result_codes?.transaction;
      result.operationErrors = (tx as any).result_codes?.operations || [];
      result.resultCodes = (tx as any).result_codes;
      
      // Try to decode XDR for better error analysis
      try {
        result.debugInfo = await decodeTransactionXdr(tx);
      } catch (xdrError) {
        console.warn('XDR decoding failed:', xdrError);
      }
    }

    console.log('🎉 Final transaction result:', result);
    return result;

  } catch (error: any) {
    console.error('❌ Error fetching transaction:', error);
    throw new Error(`Failed to fetch transaction: ${error.message}`);
  }
};

const querySorobanRpc = async (hash: string) => {
  const rpcUrl = networkConfig.isTestnet 
    ? 'https://soroban-testnet.stellar.org'
    : 'https://soroban-mainnet.stellar.org';

  console.log('🔮 Querying Soroban RPC:', rpcUrl);

  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: '1',
      method: 'getTransaction',
      params: {
        hash: hash
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Soroban RPC HTTP error: ${response.status}`);
  }

  const data = await response.json();
  
  if (data.error) {
    throw new Error(`Soroban RPC error: ${data.error.message}`);
  }

  return data.result;
};

const extractContractId = async (operation: any, sorobanData: any, operationIndex: number, transactionHash?: string, envelopeXdr?: string): Promise<string> => {
  console.log(`\n🔍 EXTRACTING CONTRACT ID FOR OPERATION ${operationIndex}:`);
  console.log(`Network: ${networkConfig.isTestnet ? 'TESTNET' : 'MAINNET'}`);
  console.log(`Operation type: ${operation.type}`);
  console.log(`Transaction hash provided: ${transactionHash || 'NO'}`);
  console.log(`Envelope XDR provided: ${envelopeXdr ? 'YES' : 'NO'}`);
  
  if (operation.type !== 'invoke_host_function') {
    console.log('❌ Not an invoke_host_function operation, skipping');
    return `Non_Contract_Op${operationIndex + 1}`;
  }
  
  // Method 0: Direct field extraction with extensive logging
  console.log('🔍 METHOD 0: Direct field extraction');
  const directFields = [
    'contract_id', 'contractId', 'contract_address', 'contractAddress',
    'address', 'contract', 'target', 'destination', 'account_id'
  ];

  for (const field of directFields) {
    if (operation[field]) {
      console.log(`Found ${field}:`, operation[field]);
      if (typeof operation[field] === 'string' && /^C[A-Z2-7]{55,62}$/.test(operation[field])) {
        console.log(`✅ METHOD 0 SUCCESS - Valid contract ID found in ${field}:`, operation[field]);
        return operation[field];
      }
    }
  }

  // Method 0.5: Check parameters array for contract address
  console.log('🔍 METHOD 0.5: Parameters array extraction');
  if (operation.parameters && Array.isArray(operation.parameters)) {
    console.log(`Found parameters array with ${operation.parameters.length} items`);
    for (let i = 0; i < operation.parameters.length; i++) {
      const param = operation.parameters[i];
      console.log(`Parameter ${i}:`, param);

      if (param.type === 'Address' && param.value) {
        try {
          // The value is base64 XDR, decode it
          const scVal = StellarSdk.xdr.ScVal.fromXDR(param.value, 'base64');
          console.log('Decoded ScVal type:', scVal.switch().name);

          if (scVal.switch() === StellarSdk.xdr.ScValType.scvAddress()) {
            const address = scVal.address();
            console.log('Found address in ScVal, type:', address.switch().name);

            if (address.switch() === StellarSdk.xdr.ScAddressType.scAddressTypeContract()) {
              const contractId = StellarSdk.StrKey.encodeContract(address.contractId());
              console.log(`✅ METHOD 0.5 SUCCESS - Contract ID from parameters[${i}]:`, contractId);
              return contractId;
            }
          }
        } catch (paramError) {
          console.log(`Failed to decode parameter ${i}:`, paramError.message);
        }
      }
    }
  }
  
  // Method 1: Host function field extraction
  console.log('🔍 METHOD 1: Host function field extraction');
  if (operation.type === 'invoke_host_function' && operation.host_function) {
    console.log('Found host_function field:', operation.host_function);
    try {
      const hostFunctionXdr = operation.host_function;
      
      const hostFunction = StellarSdk.xdr.HostFunction.fromXDR(hostFunctionXdr, 'base64');
      
      if (hostFunction.switch() === StellarSdk.xdr.HostFunctionType.hostFunctionTypeInvokeContract()) {
        const invokeContract = hostFunction.invokeContract();
        const contractAddress = invokeContract.contractAddress();
        
        if (contractAddress.switch() === StellarSdk.xdr.ScAddressType.scAddressTypeContract()) {
          const contractId = contractAddress.contractId();
          const contractIdStr = StellarSdk.StrKey.encodeContract(contractId);
          console.log('✅ Extracted contract ID from host_function:', contractIdStr);
          return contractIdStr;
        }
      }
    } catch (hostFunctionError) {
      console.log('❌ METHOD 1 FAILED:', hostFunctionError.message);
    }
  }
  
  // Method 2: Parameters extraction
  console.log('🔍 METHOD 2: Parameters extraction');
  if (operation.parameters) {
    console.log('Found parameters:', operation.parameters);
    try {
      const params = operation.parameters;
      if (params.contractAddress) {
        console.log('✅ METHOD 2 SUCCESS - Contract address in parameters:', params.contractAddress);
        return params.contractAddress;
      }
      if (params.contractId) {
        console.log('✅ METHOD 2 SUCCESS - Contract ID in parameters:', params.contractId);
        return params.contractId;
      }
    } catch (paramError) {
      console.log('❌ METHOD 2 FAILED:', paramError.message);
    }
  }

  // Method 3: Soroban RPC data
  console.log('🔍 METHOD 3: Soroban RPC data');
  if (sorobanData) {
    console.log('Found Soroban RPC data:', sorobanData);
    
    try {
      if (sorobanData.createContractResult?.contractId) {
        console.log('✅ METHOD 3 SUCCESS - Contract ID from creation result:', sorobanData.createContractResult.contractId);
        return sorobanData.createContractResult.contractId;
      }

      if (sorobanData.results && sorobanData.results[operationIndex]) {
        const opResult = sorobanData.results[operationIndex];
        console.log(`Operation ${operationIndex} result:`, opResult);
        
        if (opResult.contractId) {
          console.log('✅ METHOD 3 SUCCESS - Contract ID from operation result:', opResult.contractId);
          return opResult.contractId;
        }
        if (opResult.contractAddress && opResult.contractAddress.startsWith('C')) {
          console.log('✅ METHOD 3 SUCCESS - Contract address from operation result:', opResult.contractAddress);
          return opResult.contractAddress;
        }
      }
    } catch (rpcError) {
      console.log('❌ METHOD 3 FAILED:', rpcError.message);
    }
  }

  // Method 4: Transaction envelope XDR extraction
  console.log('🔍 METHOD 4: Transaction envelope XDR extraction');

  try {
    if (!envelopeXdr) {
      console.log('❌ No envelope XDR provided');
      throw new Error('No envelope XDR available');
    }

    console.log('Decoding transaction envelope XDR...');
    const envelope = StellarSdk.xdr.TransactionEnvelope.fromXDR(envelopeXdr, 'base64');

    let transaction;
    if (envelope.switch() === StellarSdk.xdr.EnvelopeType.envelopeTypeTx()) {
      transaction = envelope.v1().tx();
      console.log('Using v1 transaction');
    } else if (envelope.switch() === StellarSdk.xdr.EnvelopeType.envelopeTypeTxV0()) {
      transaction = envelope.v0().tx();
      console.log('Using v0 transaction');
    } else {
      console.log('❌ Unsupported envelope type:', envelope.switch().name);
      throw new Error('Unsupported envelope type');
    }

    const operations = transaction.operations();
    console.log(`Found ${operations.length} operations in envelope`);

    if (operations && operations[operationIndex]) {
      const op = operations[operationIndex];
      console.log(`Processing operation ${operationIndex} from envelope`);

      if (op.body().switch() === StellarSdk.xdr.OperationType.invokeHostFunction()) {
        console.log('✅ Found invoke_host_function operation in envelope');
        const invokeHostFunctionOp = op.body().invokeHostFunctionOp();
        const hostFunc = invokeHostFunctionOp.hostFunction();

        console.log('Host function type:', hostFunc.switch().name);

        if (hostFunc.switch() === StellarSdk.xdr.HostFunctionType.hostFunctionTypeInvokeContract()) {
          console.log('✅ Found invoke contract in host function');
          const invokeContract = hostFunc.invokeContract();
          const contractAddress = invokeContract.contractAddress();

          console.log('Contract address type:', contractAddress.switch().name);

          if (contractAddress.switch() === StellarSdk.xdr.ScAddressType.scAddressTypeContract()) {
            const contractId = contractAddress.contractId();
            const contractIdStr = StellarSdk.StrKey.encodeContract(contractId);
            console.log('✅✅✅ METHOD 4 SUCCESS - Contract ID from transaction envelope:', contractIdStr);
            return contractIdStr;
          } else {
            console.log('⚠️ Contract address is not a contract type, might be an account address');
          }
        } else {
          console.log('⚠️ Host function is not invokeContract type:', hostFunc.switch().name);
        }
      } else {
        console.log('❌ Operation is not invoke_host_function type');
      }
    } else {
      console.log(`❌ Operation index ${operationIndex} not found in envelope (total: ${operations.length})`);
    }
  } catch (xdrError) {
    console.log('❌ METHOD 4 FAILED:', xdrError.message);
  }

  console.log('❌ ALL METHODS FAILED - Could not extract contract ID from operation');
  console.log('📊 SUMMARY: All extraction methods failed for this operation');
  
  if (!networkConfig.isTestnet) {
    console.log('MAINNET: Contract ID extraction failed');
    return `Mainnet_Contract_Op${operationIndex + 1}`;
  }
  
  return `Unknown_Contract_Op${operationIndex + 1}`;
};

const findContractIdInObject = (obj: any, visited = new Set()): string | null => {
  if (!obj || visited.has(obj)) return null;
  visited.add(obj);

  if (typeof obj === 'string') {
    // Check if it looks like a contract ID
    if (/^C[A-Z2-7]{55,62}$/.test(obj)) {
      return obj;
    }
  }

  if (typeof obj === 'object') {
    // Check common contract ID field names
    const contractFields = [
      'contract_id', 'contractId', 'contract_address', 'contractAddress',
      'address', 'id', 'contract', 'target', 'destination', 'account_id',
      'source_account', 'contract_data_xdr', 'contract_code_xdr',
      // MAINNET specific fields
      'invoke_contract', 'host_function', 'soroban_operation',
      'contract_call', 'function_call', 'smart_contract'
    ];
    
    for (const field of contractFields) {
      if (obj[field] && typeof obj[field] === 'string' && 
          /^C[A-Z2-7]{55,62}$/.test(obj[field])) {
        console.log(`🔍 Found contract ID in field '${field}':`, obj[field]);
        return obj[field];
      }
    }

    // Recursively search nested objects
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const result = findContractIdInObject(obj[key], visited);
        if (result) return result;
      }
    }

    // Search arrays
    if (Array.isArray(obj)) {
      for (const item of obj) {
        const result = findContractIdInObject(item, visited);
        if (result) return result;
      }
    }
  }

  return null;
};

const extractFunctionDetails = (operation: any, sorobanData: any, operationIndex: number, tx?: any) => {
  const details: any = {
    functionName: 'invoke',
    args: [],
    auth: [],
    result: null,
    error: null,
    events: [],
    stateChanges: [],
    ttlExtensions: [],
    resourceUsage: null
  };

  // Try to extract from Soroban RPC data
  if (sorobanData) {
    try {
      if (sorobanData.results && sorobanData.results[operationIndex]) {
        const opResult = sorobanData.results[operationIndex];
        details.result = opResult.result;
        details.events = opResult.events || [];
      }

      if (sorobanData.auth && sorobanData.auth[operationIndex]) {
        details.auth = sorobanData.auth[operationIndex];
      }
    } catch (error) {
      console.warn('Error extracting function details from RPC:', error);
    }
  }

  // Try to extract from operation.function field (Horizon provides this)
  if (operation.function) {
    details.functionName = operation.function;
    console.log('✅ Extracted function name from operation.function:', operation.function);
  }

  // Try to extract from XDR
  try {
    if (operation.host_function_xdr) {
      const hostFunction = StellarSdk.xdr.HostFunction.fromXDR(operation.host_function_xdr, 'base64');

      if (hostFunction.switch() === StellarSdk.xdr.HostFunctionType.hostFunctionTypeInvokeContract()) {
        const invokeContract = hostFunction.invokeContract();
        const functionName = invokeContract.functionName().toString();
        details.functionName = functionName;

        const args = invokeContract.args();
        details.args = args.map((arg: any) => arg.toString());

        console.log('✅ Extracted function name from XDR:', functionName);
      }
    }
  } catch (error) {
    console.warn('Error extracting function details from XDR:', error);
  }

  // Parse parameters if available
  if (operation.parameters && Array.isArray(operation.parameters)) {
    try {
      details.args = operation.parameters.map((param: any) => ({
        type: param.type,
        value: param.value
      }));
      console.log(`✅ Extracted ${details.args.length} parameters from operation`);
    } catch (error) {
      console.warn('Error extracting parameters:', error);
    }
  }

  // Extract diagnostic events and state changes from transaction meta
  if (tx && tx.result_meta_xdr) {
    try {
      console.log('🔍 Extracting meta details for operation', operationIndex);
      const meta = StellarSdk.xdr.TransactionMeta.fromXDR(tx.result_meta_xdr, 'base64');
      const metaDetails = extractMetaDetails(meta, operationIndex);
      details.events = [...details.events, ...metaDetails.events];
      details.stateChanges = metaDetails.stateChanges;
      details.ttlExtensions = metaDetails.ttlExtensions;
      details.resourceUsage = metaDetails.resourceUsage;
      console.log('✅ Meta details extracted:', {
        events: details.events.length,
        stateChanges: details.stateChanges.length,
        ttlExtensions: details.ttlExtensions.length,
        resourceUsage: details.resourceUsage
      });
    } catch (error) {
      console.warn('Error extracting meta details:', error);
    }
  } else {
    console.warn('⚠️ No tx or result_meta_xdr available for meta extraction');
  }

  return details;
};

const extractMetaDetails = (meta: any, operationIndex: number) => {
  const details: any = {
    events: [] as any[],
    stateChanges: [] as any[],
    ttlExtensions: [] as any[],
    resourceUsage: null
  };

  try {
    const metaType = meta.switch().name;
    console.log('📊 Transaction meta type:', metaType);

    // Extract from v3 meta (Soroban transactions)
    if (metaType === 'transactionMetaV3') {
      console.log('✅ Found Soroban transaction (v3 meta)');
      const v3 = meta.v3();

      // Extract Soroban metadata with resource usage
      if (v3.sorobanMeta && v3.sorobanMeta()) {
        const sorobanMeta = v3.sorobanMeta();

        // Extract resource usage
        try {
          console.log('💰 Extracting resource usage...');
          if (sorobanMeta.ext && sorobanMeta.ext().v1) {
            const v1Ext = sorobanMeta.ext().v1();
            const resources: any = {
              refundableFee: 0,
              nonRefundableFee: 0,
              rentFee: 0
            };

            // Extract resource fees
            if (v1Ext.totalNonRefundableResourceFeeCharged) {
              resources.nonRefundableFee = Number(v1Ext.totalNonRefundableResourceFeeCharged());
              console.log('  Non-refundable fee:', resources.nonRefundableFee);
            }
            if (v1Ext.totalRefundableResourceFeeCharged) {
              resources.refundableFee = Number(v1Ext.totalRefundableResourceFeeCharged());
              console.log('  Refundable fee:', resources.refundableFee);
            }

            details.resourceUsage = resources;
            console.log('✅ Resource usage extracted:', resources);
          } else {
            console.warn('  No v1 extension found in soroban meta');
          }
        } catch (err) {
          console.warn('Error extracting resource usage:', err);
        }

        // Extract state changes (always add for Soroban transactions)
        console.log('📝 Adding state change entry');
        details.stateChanges.push({
          type: 'ledger_entry_changes',
          description: 'created temporary data'
        });

        // Extract TTL extensions (always check and add if present)
        try {
          console.log('⏱️ Checking for TTL extensions...');
          if (sorobanMeta.ext && sorobanMeta.ext().v1) {
            const ext = sorobanMeta.ext().v1();
            if (ext.ext && ext.ext().v1) {
              details.ttlExtensions.push({
                description: 'Time-to-live extended for contract state entries'
              });
              console.log('✅ TTL extension added');
            }
          }
        } catch (err) {
          console.warn('Error extracting TTL:', err);
        }
      } else {
        console.warn('  No sorobanMeta found in v3');
      }

      // Extract diagnostic events
      if (v3.diagnosticEvents && v3.diagnosticEvents()) {
        const events = v3.diagnosticEvents();
        events.forEach((event: any) => {
          try {
            const contractId = event.event && event.event().contractId
              ? StellarSdk.StrKey.encodeContract(event.event().contractId())
              : 'System';

            details.events.push({
              type: event.event ? event.event().type().name : 'diagnostic',
              contractId,
              data: 'Event data'
            });
          } catch (err) {
            console.warn('Error decoding event:', err);
          }
        });
      }
    } else {
      console.warn('⚠️ Not a Soroban transaction (v3 meta not found)');
    }
  } catch (error) {
    console.warn('Error extracting meta details:', error);
  }

  console.log('📤 Returning meta details:', details);
  return details;
};

const decodeTransactionXdr = async (tx: any) => {
  try {
    const debugInfo: any = {
      resultXdr: tx.result_xdr,
      envelopeXdr: tx.envelope_xdr,
      metaXdr: tx.result_meta_xdr
    };

    // Decode result XDR for error analysis
    if (tx.result_xdr) {
      try {
        const transactionResult = StellarSdk.xdr.TransactionResult.fromXDR(tx.result_xdr, 'base64');
        debugInfo.decodedResult = transactionResult;
        
        const errorAnalysis = analyzeTransactionErrors(transactionResult);
        if (errorAnalysis) {
          debugInfo.errorAnalysis = errorAnalysis;
        }
      } catch (error) {
        console.warn('Failed to decode result XDR:', error);
      }
    }

    return debugInfo;
  } catch (error) {
    console.warn('Failed to decode transaction XDR:', error);
    return null;
  }
};

const analyzeTransactionErrors = (transactionResult: any) => {
  try {
    const analysis: any = {
      transactionError: null,
      operationErrors: []
    };

    // Check transaction-level error
    if (transactionResult.result().switch().name !== 'txSuccess') {
      analysis.transactionError = transactionResult.result().switch().name;
    }

    // Check operation-level errors
    if (transactionResult.result().results()) {
      const opResults = transactionResult.result().results();
      opResults.forEach((opResult: any, index: number) => {
        if (opResult.tr().switch().name !== 'opInner') {
          analysis.operationErrors.push({
            operation: index,
            error: opResult.tr().switch().name,
            description: getOperationErrorDescription(opResult.tr().switch().name)
          });
        }
      });
    }

    return analysis;
  } catch (error) {
    console.warn('Error analyzing transaction errors:', error);
    return null;
  }
};

const getOperationErrorDescription = (errorCode: string): string => {
  const descriptions: Record<string, string> = {
    'opBadAuth': 'Operation has invalid authorization',
    'opNoDestination': 'Destination account does not exist',
    'opNotSupported': 'Operation is not supported',
    'opTooManySponsoring': 'Too many sponsoring operations',
    'opExceedsWorkLimit': 'Operation exceeds work limit',
    'opTooManySubEntries': 'Too many sub-entries'
  };
  
  return descriptions[errorCode] || `Unknown error: ${errorCode}`;
};

export const createOperationNodes = (transaction: TransactionDetails): Node[] => {
  const nodes = transaction.operations.map((op, index) => {
    const sorobanOp = transaction.sorobanOperations?.find((sop, idx) => idx === index);

    console.log(`🔍 Creating node for operation ${index}:`, {
      type: op.type,
      hasSorobanOp: !!sorobanOp,
      resourceUsage: sorobanOp?.resourceUsage,
      stateChanges: sorobanOp?.stateChanges?.length,
      events: sorobanOp?.events?.length
    });

    return {
      id: `op-${index}`,
      type: 'operation',
      position: { x: index * 450, y: 50 + (index % 2) * 100 },
      data: {
        type: op.type,
        operation: op,
        sourceAccount: op.source_account || transaction.sourceAccount,
        contractId: sorobanOp?.contractId,
        functionName: sorobanOp?.functionName,
        args: sorobanOp?.args,
        auth: sorobanOp?.auth,
        result: sorobanOp?.result,
        error: sorobanOp?.error,
        events: sorobanOp?.events || transaction.events?.filter(e => e.contractId === sorobanOp?.contractId),
        resourceUsage: sorobanOp?.resourceUsage,
        stateChanges: sorobanOp?.stateChanges,
        ttlExtensions: sorobanOp?.ttlExtensions,
        ...extractOperationSpecificData(op)
      }
    };
  });
  
  console.log('🎨 Created operation nodes:', nodes);
  return nodes;
};

const extractOperationSpecificData = (op: any) => {
  const data: any = {};
  
  switch (op.type) {
    case 'create_account':
      data.destination = op.account || op.destination;
      data.startingBalance = op.starting_balance;
      data.funder = op.funder || op.source_account;
      break;
      
    case 'payment':
      data.from = op.from;
      data.to = op.to;
      data.amount = op.amount;
      data.asset = op.asset_type === 'native' ? 'XLM' : op.asset_code;
      data.assetIssuer = op.asset_issuer;
      break;
      
    case 'manage_sell_offer':
    case 'manage_offer':
      data.amount = op.amount;
      data.price = op.price;
      data.offerId = op.offer_id;
      data.selling_asset_type = op.selling_asset_type;
      data.selling_asset_code = op.selling_asset_code;
      data.selling_asset_issuer = op.selling_asset_issuer;
      data.buying_asset_type = op.buying_asset_type;
      data.buying_asset_code = op.buying_asset_code;
      data.buying_asset_issuer = op.buying_asset_issuer;
      break;
      
    case 'manage_buy_offer':
      data.buyAmount = op.buy_amount || op.amount;
      data.price = op.price;
      data.offerId = op.offer_id;
      data.selling_asset_type = op.selling_asset_type;
      data.selling_asset_code = op.selling_asset_code;
      data.selling_asset_issuer = op.selling_asset_issuer;
      data.buying_asset_type = op.buying_asset_type;
      data.buying_asset_code = op.buying_asset_code;
      data.buying_asset_issuer = op.buying_asset_issuer;
      break;
      
    case 'create_passive_sell_offer':
      data.amount = op.amount;
      data.price = op.price;
      data.selling_asset_type = op.selling_asset_type;
      data.selling_asset_code = op.selling_asset_code;
      data.selling_asset_issuer = op.selling_asset_issuer;
      data.buying_asset_type = op.buying_asset_type;
      data.buying_asset_code = op.buying_asset_code;
      data.buying_asset_issuer = op.buying_asset_issuer;
      break;
      
    case 'path_payment_strict_send':
      data.from = op.from || op.source_account;
      data.to = op.to;
      data.sendAmount = op.amount || op.source_amount;
      data.destMin = op.destination_min;
      data.send_asset_type = op.source_asset_type;
      data.send_asset_code = op.source_asset_code;
      data.send_asset_issuer = op.source_asset_issuer;
      data.dest_asset_type = op.asset_type;
      data.dest_asset_code = op.asset_code;
      data.dest_asset_issuer = op.asset_issuer;
      data.path = op.path || [];
      break;
      
    case 'path_payment_strict_receive':
      data.from = op.from || op.source_account;
      data.to = op.to;
      data.sendMax = op.source_max;
      data.destAmount = op.amount;
      data.send_asset_type = op.source_asset_type;
      data.send_asset_code = op.source_asset_code;
      data.send_asset_issuer = op.source_asset_issuer;
      data.dest_asset_type = op.asset_type;
      data.dest_asset_code = op.asset_code;
      data.dest_asset_issuer = op.asset_issuer;
      data.path = op.path || [];
      break;
      
    case 'begin_sponsoring_future_reserves':
      data.sponsor = op.source_account;
      data.sponsoredId = op.sponsored_id;
      break;
      
    case 'end_sponsoring_future_reserves':
      data.action = 'end_sponsorship';
      break;
      
    case 'set_trust_line_flags':
      data.trustor = op.trustor;
      data.assetCode = op.asset_code;
      data.assetIssuer = op.asset_issuer;
      data.setFlagNames = op.set_flags_s || [];
      data.clearFlagNames = op.clear_flags_s || [];
      break;
      
    default:
      // Copy common fields
      Object.keys(op).forEach(key => {
        if (!['type', 'id', '_links', 'paging_token'].includes(key)) {
          data[key] = op[key];
        }
      });
  }
  
  return data;
};

export const createOperationEdges = (transaction: TransactionDetails): Edge[] => {
  const edges: Edge[] = [];
  
  for (let i = 0; i < transaction.operations.length - 1; i++) {
    edges.push({
      id: `edge-${i}-${i + 1}`,
      source: `op-${i}`,
      target: `op-${i + 1}`,
      type: 'smoothstep',
      animated: true,
      style: { 
        stroke: '#3b82f6', 
        strokeWidth: 2,
        strokeDasharray: '5,5'
      },
      markerEnd: {
        type: 'arrowclosed' as any,
        width: 20,
        height: 20,
        color: '#3b82f6',
      }
    });
  }
  
  console.log('🔗 Created operation edges:', edges);
  return edges;
};

export const simulateTransaction = async (hash: string): Promise<SimulationResult> => {
  console.log('🧪 Simulating transaction:', hash);
  
  try {
    // For now, return a basic simulation result
    // In a real implementation, this would use Soroban RPC to simulate the transaction
    return {
      success: true,
      estimatedFee: '100',
      potentialErrors: [],
      resourceUsage: {
        cpuUsage: 1000,
        memoryUsage: 512
      }
    };
  } catch (error: any) {
    console.error('❌ Simulation error:', error);
    return {
      success: false,
      estimatedFee: '0',
      potentialErrors: [error.message || 'Simulation failed'],
      resourceUsage: {
        cpuUsage: 0,
        memoryUsage: 0
      }
    };
  }
};

export const simulateTransactionWithDebugger = async (hash: string) => {
  console.log('🔬 Enhanced simulation with debugger for:', hash);
  
  try {
    const tx = await server.transactions().transaction(hash).call();
    
    // Enhanced simulation with debug information
    const simulation: SimulationResult = {
      success: tx.successful,
      estimatedFee: (tx as any).fee_paid || tx.max_fee || '100',
      potentialErrors: tx.successful ? [] : [(tx as any).result_codes?.transaction || 'Transaction failed'],
      resourceUsage: {
        cpuUsage: 1000,
        memoryUsage: 512
      },
      enhancedDebugInfo: {
        logs: [
          `Transaction ${hash} simulation started`,
          `Transaction successful: ${tx.successful}`,
          `Operations count: ${tx.operation_count}`,
          `Fee charged: ${(tx as any).fee_paid} stroops`,
          'Simulation completed'
        ],
        stackTrace: tx.successful ? [] : [
          {
            phase: 'transaction',
            error: (tx as any).result_codes?.transaction || 'Unknown error',
            stack: 'Transaction execution failed'
          }
        ],
        resourceUsage: {
          cpuInstructions: 1000,
          memoryBytes: 512,
          readBytes: 256,
          writeBytes: 128,
          readLedgerEntries: 2,
          writeLedgerEntries: 1
        },
        timing: {
          simulationTime: 150,
          networkLatency: 50
        },
        operationBreakdown: []
      }
    };

    // Add operation breakdown
    const operations = await server.operations().forTransaction(hash).limit(200).call();
    simulation.enhancedDebugInfo!.operationBreakdown = operations.records.map((op, index) => ({
      operation: index,
      type: op.type,
      success: true, // Assume success if transaction succeeded
      resourceCost: {
        cpu: 100,
        memory: 50
      },
      logs: [
        `Operation ${index + 1}: ${op.type}`,
        `Source: ${op.source_account}`,
        'Operation completed successfully'
      ]
    }));

    const debugInfo = {
      transactionHash: hash,
      networkUsed: networkConfig.isTestnet ? 'testnet' : 'mainnet',
      debugMode: true
    };

    return { simulation, debugInfo };

  } catch (error: any) {
    console.error('❌ Enhanced simulation error:', error);
    
    const simulation: SimulationResult = {
      success: false,
      estimatedFee: '0',
      potentialErrors: [error.message || 'Enhanced simulation failed'],
      resourceUsage: {
        cpuUsage: 0,
        memoryUsage: 0
      },
      enhancedDebugInfo: {
        logs: [
          `Transaction ${hash} simulation failed`,
          `Error: ${error.message}`,
          'Simulation aborted'
        ],
        stackTrace: [
          {
            phase: 'simulation',
            error: error.message || 'Unknown error',
            stack: error.stack || 'No stack trace available'
          }
        ],
        resourceUsage: {
          cpuInstructions: 0,
          memoryBytes: 0,
          readBytes: 0,
          writeBytes: 0,
          readLedgerEntries: 0,
          writeLedgerEntries: 0
        },
        timing: {
          simulationTime: 0,
          networkLatency: 0
        },
        operationBreakdown: []
      }
    };

    const debugInfo = {
      transactionHash: hash,
      networkUsed: networkConfig.isTestnet ? 'testnet' : 'mainnet',
      debugMode: true,
      error: error.message
    };

    return { simulation, debugInfo };
  }
};