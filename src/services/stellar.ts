import * as StellarSdk from '@stellar/stellar-sdk';
import { Contract, xdr as sorobanXdr } from 'soroban-client';
import type { TransactionDetails, NetworkConfig, SimulationResult, SorobanOperation, TransactionDebugInfo } from '../types/stellar';

interface DecodedTransactionResult {
  transactionResultCode: string;
  operationResults: Array<{
    operationIndex: number;
    operationType: string;
    resultCode: string;
    details?: any;
  }>;
}

const defaultConfig: NetworkConfig = {
  isTestnet: true,
  networkUrl: 'https://horizon-testnet.stellar.org',
  networkPassphrase: StellarSdk.Networks.TESTNET,
};

let server = new StellarSdk.Horizon.Server(defaultConfig.networkUrl);

// Add current network config tracking
let currentNetworkConfig = { ...defaultConfig };

export function setNetwork(config: NetworkConfig) {
  server = new StellarSdk.Horizon.Server(config.networkUrl);
  StellarSdk.Networks.use(config.networkPassphrase);
  currentNetworkConfig = { ...config };
  console.log('🌐 Network updated:', config);
}

async function decodeSorobanOperation(op: any): Promise<SorobanOperation> {
  try {
    console.log('Decoding Soroban operation:', op.type, op.id);
    
    if (op.type !== 'invoke_host_function') {
      return {
        type: 'soroban',
        contractId: 'unknown',
        functionName: 'unknown',
        args: [],
        auth: [],
        error: 'Not a Soroban operation',
      };
    }

    // Enhanced XDR parsing similar to Stellar Expert's approach
    if (!op.function_xdr) {
      console.warn('Missing function_xdr for operation:', op.id);
      return {
        type: 'soroban',
        contractId: op.source_account || 'unknown',
        functionName: 'unknown',
        args: [],
        auth: [],
        error: 'Missing function XDR data',
      };
    }

    let contractId = 'unknown';
    let functionName = 'unknown';
    let args: any[] = [];

    try {
      const hostFunction = sorobanXdr.HostFunction.fromXDR(op.function_xdr, 'base64');
      console.log('Decoded host function type:', hostFunction.switch().name);
      
      if (hostFunction.switch().name === 'invokeContract') {
        const invokeArgs = hostFunction.invokeContract();
        
        // Extract contract ID with better error handling
        try {
          const contractAddress = invokeArgs.contractAddress();
          // Handle different contract address formats
          if (contractAddress.switch().name === 'contractId') {
            const contractIdBytes = contractAddress.contractId();
            contractId = StellarSdk.StrKey.encodeContract(contractIdBytes);
          } else {
            contractId = contractAddress.toString();
          }
          console.log('Extracted contract ID:', contractId);
        } catch {
          contractId = op.source_account || 'unknown';
          console.warn('Failed to extract contract ID, using source account');
        }
        
        // Extract function name with better parsing
        try {
          const funcName = invokeArgs.functionName();
          if (typeof funcName === 'string') {
            functionName = funcName;
          } else if (funcName && funcName.toString) {
            functionName = funcName.toString();
          } else {
            functionName = String(funcName);
          }
          console.log('Extracted function name:', functionName);
        } catch {
          functionName = 'unknown';
          console.warn('Failed to extract function name');
        }
        
        // Extract arguments with improved parsing
        try {
          const argsList = invokeArgs.args();
          args = argsList.map((arg: any, index: number) => {
            try {
              // Try to parse different argument types
              if (arg.switch) {
                const argType = arg.switch().name;
                switch (argType) {
                  case 'scvSymbol':
                    return arg.sym().toString();
                  case 'scvString':
                    return arg.str().toString();
                  case 'scvU32':
                    return arg.u32();
                  case 'scvI32':
                    return arg.i32();
                  case 'scvU64':
                    return arg.u64().toString();
                  case 'scvI64':
                    return arg.i64().toString();
                  case 'scvAddress':
                    return arg.address().toString();
                  default:
                    return arg.toString();
                }
              } else {
                return arg.toString();
              }
            } catch {
              console.warn(`Failed to decode arg ${index}, using placeholder`);
              return `<complex_value_${index}>`;
            }
          });
          console.log('Extracted args:', args);
        } catch {
          args = [];
          console.warn('Failed to extract arguments');
        }
      } else {
        console.log('Host function is not invokeContract, type:', hostFunction.switch().name);
      }
    } catch (xdrError) {
      console.error('XDR decoding error:', xdrError);
      contractId = op.source_account || 'unknown';
      functionName = 'xdr_decode_failed';
    }

    const result = {
      type: 'soroban' as const,
      contractId,
      functionName,
      args,
      auth: [],
    };
    
    console.log('Decoded Soroban operation result:', result);
    return result;
  } catch (error) {
    console.error('Error decoding Soroban operation:', error);
    return {
      type: 'soroban',
      contractId: op.source_account || 'unknown',
      functionName: 'unknown',
      args: [],
      auth: [],
      error: error instanceof Error ? error.message : 'Failed to decode operation',
    };
  }
}

function decodeTransactionResult(resultXdr: string): DecodedTransactionResult {
  try {
    console.log('🔍 Decoding transaction result XDR:', resultXdr);
    const decodedResult = StellarSdk.xdr.TransactionResult.fromXDR(resultXdr, 'base64');
    const result = decodedResult.result();
    
    const transactionResultCode = result.switch().name;
    console.log('🎯 Transaction result code:', transactionResultCode);
    const operationResults: Array<{
      operationIndex: number;
      operationType: string;
      resultCode: string;
      details?: any;
    }> = [];

    // If transaction failed, decode operation results
    if (transactionResultCode === 'txFailed' && result.results()) {
      const opResults = result.results();
      console.log('🔍 Found', opResults.length, 'operation results to decode');
      
      for (let i = 0; i < opResults.length; i++) {
        const opResult = opResults[i];
        const opResultCode = opResult.switch().name;
        console.log(`🎯 Operation ${i} result code:`, opResultCode);
        
        let details: any = {};
        
        // Decode specific operation result details based on type
        try {
          switch (opResultCode) {
            case 'opInner':
              const innerResult = opResult.tr();
              const innerCode = innerResult.switch().name;
              console.log(`🎯 Operation ${i} inner code:`, innerCode);
              details.innerResultCode = innerCode;
              
              // Decode specific inner results
              switch (innerCode) {
                case 'createAccountResult':
                  const createAccountResult = innerResult.createAccountResult();
                  const createAccountCode = createAccountResult.switch().name;
                  console.log(`🎯 CreateAccount specific error:`, createAccountCode);
                  details.createAccountCode = createAccountCode;
                  
                  // Map specific create account errors to user-friendly messages
                  switch (createAccountCode) {
                    case 'createAccountLowReserve':
                      details.specificError = 'Starting balance is below minimum reserve (1 XLM)';
                      details.solution = 'Increase starting balance to at least 1 XLM';
                      break;
                    case 'createAccountUnderfunded':
                      details.specificError = 'Source account does not have enough funds';
                      details.solution = 'Add more funds to the source account';
                      break;
                    case 'createAccountAlreadyExist':
                      details.specificError = 'Destination account already exists';
                      details.solution = 'Account already exists - no need to create again';
                      break;
                    case 'createAccountMalformed':
                      details.specificError = 'Invalid destination account or starting balance';
                      details.solution = 'Check account ID format and ensure positive starting balance';
                      break;
                  }
                  break;
                case 'paymentResult':
                  details.paymentCode = innerResult.paymentResult().switch().name;
                  break;
                case 'setOptionsResult':
                  details.setOptionsCode = innerResult.setOptionsResult().switch().name;
                  break;
                case 'changeTrustResult':
                  details.changeTrustCode = innerResult.changeTrustResult().switch().name;
                  break;
                case 'allowTrustResult':
                  details.allowTrustCode = innerResult.allowTrustResult().switch().name;
                  break;
                case 'manageOfferResult':
                  const manageOfferResult = innerResult.manageOfferResult();
                  details.manageOfferCode = manageOfferResult.switch().name;
                  if (manageOfferResult.switch().name === 'manageOfferSuccess') {
                    const success = manageOfferResult.success();
                    details.offersClaimed = success.offersClaimed().length;
                    details.offer = success.offer();
                  }
                  break;
                case 'invokeHostFunctionResult':
                  const invokeResult = innerResult.invokeHostFunctionResult();
                  details.invokeHostFunctionCode = invokeResult.switch().name;
                  if (invokeResult.switch().name === 'invokeHostFunctionTrapped') {
                    details.trapped = true;
                  } else if (invokeResult.switch().name === 'invokeHostFunctionSuccess') {
                    details.success = true;
                  }
                  break;
              }
              break;
          }
        } catch (decodeError) {
          console.warn(`Failed to decode operation ${i} details:`, decodeError);
          details.decodeError = 'Failed to decode operation details';
        }
        
        operationResults.push({
          operationIndex: i,
          operationType: 'unknown', // Will be filled from transaction operations
          resultCode: opResultCode,
          details
        });
      }
    }

    return {
      transactionResultCode,
      operationResults
    };
  } catch (error) {
    console.error('Error decoding transaction result XDR:', error);
    throw new Error('Failed to decode transaction result XDR');
  }
}

function getDetailedErrorDescription(resultCode: string, details?: any): string {
  const baseDescription = getOperationErrorDescription(resultCode);
  
  if (!details) return baseDescription;
  
  // Add specific details based on the error type
  if (details.innerResultCode) {
    const innerDescription = getOperationErrorDescription(details.innerResultCode);
    
    switch (details.innerResultCode) {
      case 'paymentResult':
        if (details.paymentCode) {
    // Debug log for create_account operations
    if (operation.type === 'create_account') {
      console.log('Raw create_account operation:', operation);
      console.log('Operation keys:', Object.keys(operation));
    }

          return `${baseDescription}: ${getOperationErrorDescription(details.paymentCode)}`;
        }
        break;
      sourceAccount: operation.source_account || transaction.sourceAccount
        if (details.createAccountCode) {
          return `${baseDescription}: ${getOperationErrorDescription(details.createAccountCode)}`;
    // Extract operation-specific data based on type
        }
      case 'create_account':
        const createOp = operation as any;
        operationData.destination = createOp.account || createOp.destination || createOp.funder || createOp.to;
        operationData.startingBalance = createOp.starting_balance || createOp.startingBalance || createOp.amount;
        console.log('Extracted create_account data:', {
          destination: operationData.destination,
          startingBalance: operationData.startingBalance,
          allFields: Object.keys(createOp)
        });
        break;
        
        break;
        const paymentOp = operation as any;
        operationData.amount = paymentOp.amount;
        operationData.asset = paymentOp.asset_type === 'native' ? 'XLM' : paymentOp.asset_code;
        operationData.from = paymentOp.from;
        operationData.to = paymentOp.to;
            return `${baseDescription}: Contract execution trapped/panicked - ${sorobanError}`;
        
      case 'begin_sponsoring_future_reserves':
        const sponsorOp = operation as any;
        operationData.sponsoredId = sponsorOp.sponsored_id;
        break;
        
      case 'invoke_host_function':
        const contractOp = operation as any;
        // Extract contract details if available
        if (transaction.sorobanOperations) {
          const sorobanOp = transaction.sorobanOperations.find(sop => 
            sop.contractId === contractOp.source_account || 
            sop.contractId === contractOp.invoker
          );
          if (sorobanOp) {
            operationData.sorobanOperation = sorobanOp;
          }
        }
        break;
    }
    
    return `${baseDescription}: ${innerDescription}`;
  }
  
  return baseDescription;
}

export async function getTransactionDebugInfo(hash: string): Promise<TransactionDebugInfo> {
  try {
    const transaction = await server.transactions().transaction(hash).call();
    
    const debugInfo: TransactionDebugInfo = {
      resultXdr: transaction.result_xdr || undefined,
      envelopeXdr: transaction.envelope_xdr || undefined,
      metaXdr: transaction.result_meta_xdr || undefined,
    };

    // Decode XDR data
    try {
      if (transaction.result_xdr) {
        const decodedResultXdr = StellarSdk.xdr.TransactionResult.fromXDR(transaction.result_xdr, 'base64');
        debugInfo.decodedResult = decodedResultXdr;
        
        // Decode the transaction result for detailed error analysis
        const decodedResult = decodeTransactionResult(transaction.result_xdr);
        
        debugInfo.errorAnalysis = {
          transactionError: decodedResult.transactionResultCode,
          operationErrors: [],
        };
        
        // Get operation types from the transaction operations
        const operations = await server.operations().forTransaction(hash).call();
        
        if (decodedResult.operationResults && decodedResult.operationResults.length > 0) {
          debugInfo.errorAnalysis.operationErrors = decodedResult.operationResults.map((opResult) => {
            const operationType = operations.records[opResult.operationIndex]?.type || 'unknown';
            const detailedDescription = getDetailedErrorDescription(opResult.resultCode, opResult.details);
            
            return {
              operation: opResult.operationIndex,
              error: opResult.resultCode,
              description: detailedDescription,
              operationType,
              details: opResult.details,
            };
          });
        }
      }
      if (transaction.envelope_xdr) {
        debugInfo.decodedEnvelope = StellarSdk.xdr.TransactionEnvelope.fromXDR(transaction.envelope_xdr, 'base64');
      }
      if (transaction.result_meta_xdr) {
        debugInfo.decodedMeta = StellarSdk.xdr.TransactionMeta.fromXDR(transaction.result_meta_xdr, 'base64');
      }
    } catch (decodeError) {
      console.error('Error decoding XDR:', decodeError);
      // If XDR decoding fails, try to extract error info from the transaction response
      if (!transaction.successful && transaction.result_codes) {
        debugInfo.errorAnalysis = {
          transactionError: transaction.result_codes.transaction,
          operationErrors: transaction.result_codes.operations?.map((error, index) => ({
            operation: index,
            error,
            description: getOperationErrorDescription(error),
          })) || [],
        };
      }
    }

    return debugInfo;
  } catch (error) {
    console.error('Error fetching debug info:', error);
    throw error;
  }
}

function getOperationErrorDescription(errorCode: string): string {
  const errorDescriptions: Record<string, string> = {
    // Transaction-level errors
    'txFailed': 'Transaction failed - one or more operations failed',
    'txTooEarly': 'Transaction submitted too early',
    'txTooLate': 'Transaction submitted too late',
    'txMissingOperation': 'Transaction has no operations',
    'txBadSeq': 'Invalid sequence number',
    'txBadAuth': 'Invalid signatures or authorization',
    'txInsufficientBalance': 'Insufficient balance to pay transaction fee',
    'txNoAccount': 'Source account not found',
    'txInsufficientFee': 'Transaction fee too low',
    'txBadAuthExtra': 'Too many signatures or invalid extra signatures',
    'txInternalError': 'Internal error occurred',
    'txNotSupported': 'Transaction type not supported',
    'txFeeExceeded': 'Transaction fee exceeds maximum allowed',
    'txBadSponsorship': 'Invalid sponsorship',
    'txBadMinSeqAgeOrGap': 'Invalid minimum sequence age or gap',
    'txMalformed': 'Transaction is malformed',
    
    // Operation-level errors
    'opInner': 'Operation failed',
    'opBadAuth': 'Operation has invalid authorization',
    'opNoAccount': 'Source account does not exist',
    'opNotSupported': 'Operation not supported',
    'opTooManySubentries': 'Account has too many subentries',
    'opExceededWorkLimit': 'Operation exceeded work limit',
    'opTooManySponsoring': 'Account is sponsoring too many entries',
    
    // Payment errors
    'paymentMalformed': 'Payment operation is malformed or has invalid parameters',
    'paymentUnderfunded': 'Source account does not have enough funds for payment',
    'paymentSrcNoTrust': 'Source account does not trust the asset being sent',
    'paymentSrcNotAuthorized': 'Source account is not authorized to send this asset',
    'paymentNoDestination': 'Destination account does not exist',
    'paymentNoTrust': 'Destination account does not trust this asset',
    'paymentNotAuthorized': 'Destination account is not authorized to receive this asset',
    'paymentLineFull': 'Destination account cannot receive more of this asset (trustline limit reached)',
    'paymentNoIssuer': 'Asset issuer does not exist',
    
    // Create account errors
    'createAccountSuccess': 'Account was successfully created',
    'createAccountMalformed': 'Invalid destination or starting balance parameters',
    'createAccountUnderfunded': 'Source account does not have enough funds to create the account',
    'createAccountLowReserve': 'Starting balance is below the minimum reserve requirement (usually 1 XLM)',
    'createAccountAlreadyExist': 'The destination account already exists',
    
    // Trust line errors
    'changeTrustMalformed': 'Change trust operation is malformed',
    'changeTrustNoIssuer': 'Asset issuer does not exist',
    'changeTrustInvalidLimit': 'Trust limit is invalid',
    'changeTrustLowReserve': 'Account does not have enough funds to create trustline',
    'changeTrustSelfNotAllowed': 'Cannot create trust line to self',
    'changeTrustTrustLineMissing': 'Trustline does not exist',
    'changeTrustCannotDelete': 'Cannot delete trustline with non-zero balance',
    'changeTrustNotAuthMaintainLiabilities': 'Cannot maintain liabilities without authorization',
    
    // Offer errors
    'manageOfferMalformed': 'Manage offer operation is malformed',
    'manageOfferSellNoTrust': 'Account does not trust the selling asset',
    'manageOfferBuyNoTrust': 'Account does not trust the buying asset',
    'manageOfferSellNotAuthorized': 'Account is not authorized to sell this asset',
    'manageOfferBuyNotAuthorized': 'Account is not authorized to buy this asset',
    'manageOfferLineFull': 'Cannot receive more of the buying asset (trustline limit reached)',
    'manageOfferUnderfunded': 'Account does not have enough of the selling asset',
    'manageOfferCrossSelf': 'Cannot create offer that crosses own offer',
    'manageOfferSellNoIssuer': 'Selling asset issuer does not exist',
    'manageOfferBuyNoIssuer': 'Buying asset issuer does not exist',
    'manageOfferNotFound': 'Offer to update/delete does not exist',
    'manageOfferLowReserve': 'Account does not have enough funds to create offer',
    
    // Set options errors
    'setOptionsTooManySigners': 'Too many signers on account (maximum 20)',
    'setOptionsBadFlags': 'Invalid account flags',
    'setOptionsInvalidInflation': 'Invalid inflation destination',
    'setOptionsCantChange': 'Cannot change this account option',
    'setOptionsUnknownFlag': 'Unknown account flag',
    'setOptionsThresholdOutOfRange': 'Threshold is out of valid range (0-255)',
    'setOptionsBadSigner': 'Invalid signer key or weight',
    'setOptionsInvalidHomeDomain': 'Invalid home domain (must be <= 32 characters)',
    'setOptionsAuthRevocableRequired': 'AUTH_REVOCABLE flag is required for this operation',
    'setOptionsAuthImmutableSet': 'Cannot change flags when AUTH_IMMUTABLE is set',
    
    // Soroban errors
    'invokeHostFunctionMalformed': 'Invoke host function operation is malformed',
    'invokeHostFunctionTrapped': 'Contract execution trapped/panicked - check contract logic',
    'invokeHostFunctionResourceLimitExceeded': 'Resource limit exceeded during contract execution',
    'invokeHostFunctionEntryArchived': 'Contract data entry is archived and needs to be restored',
    'invokeHostFunctionInsufficientRefundableFee': 'Insufficient refundable fee for contract execution',
    
    // Allow trust errors
    'allowTrustMalformed': 'Allow trust operation is malformed',
    'allowTrustNoTrustLine': 'Trustline does not exist',
    'allowTrustTrustNotRequired': 'Trustline authorization is not required for this asset',
      
      // Create account specific errors
      'createAccountSuccess': 'Account was successfully created',
      'createAccountMalformed': 'Invalid destination or starting balance parameters',
      'createAccountUnderfunded': 'Source account does not have enough funds to create the account',
      'createAccountLowReserve': 'Starting balance is below the minimum reserve requirement (usually 1 XLM on Testnet)',
      'createAccountAlreadyExist': 'The destination account already exists',
      
      // Create account specific solutions
      'createAccountUnderfunded': 'Add more funds to the source account to cover the starting balance and fees',
      'createAccountLowReserve': 'Increase the starting balance to at least 1 XLM (the minimum reserve requirement)',
      'createAccountAlreadyExist': 'The account already exists - no need to create it again',
      'createAccountMalformed': 'Check that the destination account ID is valid and starting balance is positive',
    'allowTrustCantRevoke': 'Cannot revoke authorization for this asset',
    'allowTrustSelfNotAllowed': 'Cannot authorize/revoke trust to self',
    'allowTrustLowReserve': 'Account does not have enough funds for this operation',
  };

  return errorDescriptions[errorCode] || `Unknown error code: ${errorCode}`;
}

// Enhanced simulation with real-time debugging
export const simulateTransactionWithDebugger = async (hash: string): Promise<{
  simulation: SimulationResult;
  debugInfo: {
    logs: string[];
    stackTrace: any[];
    resourceUsage: {
      cpuInstructions: number;
      memoryBytes: number;
      readBytes: number;
      writeBytes: number;
      readLedgerEntries: number;
      writeLedgerEntries: number;
    };
    timing: {
      simulationTime: number;
      networkLatency: number;
    };
    operationBreakdown: Array<{
      operation: number;
      type: string;
      success: boolean;
      resourceCost: any;
      logs: string[];
      error?: string;
    }>;
  };
}> => {
  const startTime = Date.now();
  const logs: string[] = [];
  const stackTrace: any[] = [];
  
  try {
    logs.push(`[${new Date().toISOString()}] Starting transaction simulation for ${hash}`);
    
    // First get the transaction
    const transaction = await server.transactions().transaction(hash).call();
    logs.push(`[${new Date().toISOString()}] Transaction fetched successfully`);
    
    // Decode the transaction envelope to get the actual transaction
    const envelope = StellarSdk.xdr.TransactionEnvelope.fromXDR(transaction.envelope_xdr, 'base64');
    const tx = envelope.v1().tx();
    
    logs.push(`[${new Date().toISOString()}] Transaction envelope decoded`);
    logs.push(`[${new Date().toISOString()}] Operations count: ${tx.operations().length}`);
    
    // Create a simulation account (we need an account to simulate)
    const sourceAccount = new StellarSdk.Account(transaction.source_account, transaction.source_account_sequence);
    
    // Rebuild the transaction for simulation
    const txBuilder = new StellarSdk.TransactionBuilder(sourceAccount, {
      fee: transaction.fee_charged,
      networkPassphrase: currentNetworkConfig.networkPassphrase,
    });
    
    // Add operations with detailed logging
    const operationBreakdown: any[] = [];
    
    tx.operations().forEach((op: any, index: number) => {
      const opType = op.body().switch().name;
      logs.push(`[${new Date().toISOString()}] Processing operation ${index + 1}: ${opType}`);
      
      try {
        // Convert XDR operation to SDK operation
        const sdkOp = StellarSdk.Operation.fromXDRObject(op);
        txBuilder.addOperation(sdkOp);
        
        operationBreakdown.push({
          operation: index,
          type: opType,
          success: true,
          resourceCost: {},
          logs: [`Operation ${index + 1} (${opType}) added successfully`],
        });
        
        logs.push(`[${new Date().toISOString()}] Operation ${index + 1} converted successfully`);
      } catch (opError: any) {
        logs.push(`[${new Date().toISOString()}] Error processing operation ${index + 1}: ${opError.message}`);
        operationBreakdown.push({
          operation: index,
          type: opType,
          success: false,
          resourceCost: {},
          logs: [`Operation ${index + 1} failed: ${opError.message}`],
          error: opError.message,
        });
        stackTrace.push({
          operation: index,
          error: opError.message,
          stack: opError.stack,
        });
      }
    });
    
    const simulatedTx = txBuilder.build();
    logs.push(`[${new Date().toISOString()}] Transaction rebuilt for simulation`);
    
    // Simulate the transaction
    logs.push(`[${new Date().toISOString()}] Starting Horizon simulation...`);
    const simulationStart = Date.now();
    
    try {
      const simulation = await server.simulateTransaction(simulatedTx);
      const simulationTime = Date.now() - simulationStart;
      
      logs.push(`[${new Date().toISOString()}] Simulation completed in ${simulationTime}ms`);
      
      // Extract detailed resource usage
      const resourceUsage = {
        cpuInstructions: simulation.cost?.cpuInsns ? parseInt(simulation.cost.cpuInsns) : 0,
        memoryBytes: simulation.cost?.memBytes ? parseInt(simulation.cost.memBytes) : 0,
        readBytes: simulation.cost?.readBytes ? parseInt(simulation.cost.readBytes) : 0,
        writeBytes: simulation.cost?.writeBytes ? parseInt(simulation.cost.writeBytes) : 0,
        readLedgerEntries: simulation.cost?.readLedgerEntries ? parseInt(simulation.cost.readLedgerEntries) : 0,
        writeLedgerEntries: simulation.cost?.writeLedgerEntries ? parseInt(simulation.cost.writeLedgerEntries) : 0,
      };
      
      logs.push(`[${new Date().toISOString()}] Resource usage: CPU=${resourceUsage.cpuInstructions}, Memory=${resourceUsage.memoryBytes}B`);
      
      // Process simulation results
      const potentialErrors: string[] = [];
      
      if (simulation.results) {
        simulation.results.forEach((result: any, index: number) => {
          if (result.error) {
            const errorMsg = `Operation ${index + 1}: ${result.error}`;
            potentialErrors.push(errorMsg);
            logs.push(`[${new Date().toISOString()}] ${errorMsg}`);
            
            operationBreakdown[index] = {
              ...operationBreakdown[index],
              success: false,
              error: result.error,
              logs: [...(operationBreakdown[index]?.logs || []), errorMsg],
            };
          }
        });
      }
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      logs.push(`[${new Date().toISOString()}] Total simulation time: ${totalTime}ms`);
      
      return {
        simulation: {
          success: potentialErrors.length === 0,
          estimatedFee: simulation.minResourceFee || '0',
          potentialErrors,
          resourceUsage: {
            cpuUsage: resourceUsage.cpuInstructions,
            memoryUsage: resourceUsage.memoryBytes,
          },
        },
        debugInfo: {
          logs,
          stackTrace,
          resourceUsage,
          timing: {
            simulationTime: simulationTime,
            networkLatency: totalTime - simulationTime,
          },
          operationBreakdown,
        },
      };
      
    } catch (simError: any) {
      logs.push(`[${new Date().toISOString()}] Simulation failed: ${simError.message}`);
      stackTrace.push({
        error: simError.message,
        stack: simError.stack,
        phase: 'simulation',
      });
      
      return {
        simulation: {
          success: false,
          estimatedFee: '0',
          potentialErrors: [simError.message],
          resourceUsage: {
            cpuUsage: 0,
            memoryUsage: 0,
          },
        },
        debugInfo: {
          logs,
          stackTrace,
          resourceUsage: {
            cpuInstructions: 0,
            memoryBytes: 0,
            readBytes: 0,
            writeBytes: 0,
            readLedgerEntries: 0,
            writeLedgerEntries: 0,
          },
          timing: {
            simulationTime: Date.now() - simulationStart,
            networkLatency: 0,
          },
          operationBreakdown,
        },
      };
    }
    
  } catch (error: any) {
    logs.push(`[${new Date().toISOString()}] Fatal error: ${error.message}`);
    stackTrace.push({
      error: error.message,
      stack: error.stack,
      phase: 'setup',
    });
    
    throw error;
  }
};

export async function fetchContractTransactions(contractId: string): Promise<TransactionDetails[]> {
  try {
    const contractIdTrimmed = contractId.trim();
    console.log('🔍 Searching for contract transactions:', contractId);

    // For the specific contract, let's try known transaction hashes first
    if (contractIdTrimmed === 'CBHWKF4RHIKOKSURAKXSJRIIA7RJAMJH4VHRVPYGUF4AJ5L544LYZ35X') {
      console.log('🎯 Using known transactions for this contract');
      const knownTxHashes = [
        // Add known transaction hashes for this contract here
        // These would need to be found manually or through other means
      ];
      
      const transactions: TransactionDetails[] = [];
      for (const hash of knownTxHashes) {
        try {
          const tx = await fetchTransaction(hash);
          transactions.push(tx);
        } catch (e) {
          console.warn(`Failed to fetch known transaction ${hash}`);
        }
      }
      
      if (transactions.length > 0) {
        return transactions;
      }
    }

    // Simple approach: search recent invoke_host_function operations
    console.log('🔍 Searching recent Soroban operations...');
    const operations = await server.operations()
      .limit(200)
      .order('desc')
      .call();

    const contractOps = [];
    for (const op of operations.records) {
      if (op.type === 'invoke_host_function') {
        try {
          const sorobanOp = await decodeSorobanOperation(op);
          if (sorobanOp.contractId === contractIdTrimmed || 
              sorobanOp.contractId.includes(contractIdTrimmed.slice(-8)) ||
              contractIdTrimmed.includes(sorobanOp.contractId.slice(-8))) {
            contractOps.push(op);
            console.log(`✅ Found matching operation: ${op.id}`);
          }
        } catch (e) {
          // Skip operations that can't be decoded
        }
      }
    }

    if (contractOps.length === 0) {
      console.log('❌ No contract operations found');
      return [];
    }

    // Get unique transaction hashes
    const txHashes = [...new Set(contractOps.map(op => op.transaction_hash))];
    console.log(`🔗 Found ${txHashes.length} unique transactions`);

    // Fetch transaction details
    const transactions: TransactionDetails[] = [];
    for (const hash of txHashes.slice(0, 10)) {
      try {
        const tx = await fetchTransaction(hash);
        transactions.push(tx);
        console.log(`✅ Added transaction: ${hash}`);
      } catch (e) {
        console.warn(`❌ Failed to fetch transaction: ${hash}`);
      }
    }

    return transactions.sort((a, b) => b.ledgerTimestamp - a.ledgerTimestamp);

  } catch (error: any) {
    console.error('Error fetching contract transactions:', error);
    return [];
  }
}

async function searchContractTransactionsViaSorobanRPC(contractId: string): Promise<TransactionDetails[]> {
  try {
    console.log('🔍 Starting Soroban RPC search for contract:', contractId);
    console.log('🌐 Current network config:', currentNetworkConfig);
    
    // Try futurenet RPC for better contract support
    const sorobanRpcUrl = currentNetworkConfig.isTestnet 
      ? 'https://rpc-futurenet.stellar.org'
      : 'https://soroban-mainnet.stellar.org';
    
    console.log(`📡 Calling Soroban RPC at ${sorobanRpcUrl} for contract ${contractId}`);
    
    // Get recent ledger info first
    console.log('📊 Getting latest ledger...');
    const latestLedgerResponse = await fetch(sorobanRpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getLatestLedger'
      })
    });
    
    console.log('📊 Latest ledger response status:', latestLedgerResponse.status);
    if (!latestLedgerResponse.ok) {
      throw new Error(`Soroban RPC request failed: ${latestLedgerResponse.status}`);
    }
    
    const latestLedgerData = await latestLedgerResponse.json();
    if (latestLedgerData.error) {
      throw new Error(`Soroban RPC error: ${latestLedgerData.error.message}`);
    }
    
    console.log('📊 Latest ledger data:', latestLedgerData);
    
    if (!latestLedgerData.result || !latestLedgerData.result.sequence) {
      throw new Error('Invalid latest ledger response');
    }
    
    const currentLedger = latestLedgerData.result.sequence;
    const startLedger = Math.max(255, currentLedger - 5000); // Use conservative lookback within server limits
    
    console.log(`🔍 Searching events from ledger ${startLedger} to ${currentLedger} (${currentLedger - startLedger} ledgers)`);
    
    // Get contract events
    console.log('📡 Fetching contract events...');
    const eventsResponse = await fetch(sorobanRpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'getEvents',
        params: {
          startLedger: startLedger,
          filters: [
            {
              type: 'contract',
              contractIds: [contractId]
            },
            {
              type: 'system'
            }
          ],
          pagination: {
            limit: 1000
          }
        }
      })
    });
    
    console.log('📡 Events response status:', eventsResponse.status);
    if (!eventsResponse.ok) {
      throw new Error(`Events request failed: ${eventsResponse.status}`);
    }
    
    const eventsData = await eventsResponse.json();
    console.log('📡 Events response:', eventsData);
    
    if (eventsData.error) {
      throw new Error(`Events request error: ${eventsData.error.message}`);
    }
    
    const events = eventsData.result?.events || [];
    console.log(`🎉 Found ${events.length} events for contract`);
    
    if (events.length === 0) {
      console.log('❌ No events found via Soroban RPC');
      return [];
    }
    
    // Extract unique transaction IDs from events
    const txIds = [...new Set(events.map((event: any) => event.txHash))];
    console.log(`🔗 Found ${txIds.length} unique transaction IDs from events:`, txIds);
    
    // Fetch transaction details for each transaction ID
    const transactions: TransactionDetails[] = [];
    for (const txId of txIds.slice(0, 20)) { // Limit to 20 most recent
      try {
        console.log(`📄 Fetching transaction details for ${txId}`);
        const txDetails = await fetchTransaction(txId);
        
        // Add contract events to the transaction
        const txEvents = events
          .filter((event: any) => event.txHash === txId)
          .map((event: any) => ({
            contractId: contractId,
            type: event.type,
            data: event.value ? parseSorobanValue(event.value) : event.data
          }));
        
        txDetails.events = txEvents;
        transactions.push(txDetails);
        console.log(`✅ Successfully added transaction ${txId}`);
      } catch (txError: any) {
        console.warn(`❌ Failed to fetch transaction ${txId}:`, txError.message);
      }
    }
    
    console.log(`🎉 Soroban RPC search completed with ${transactions.length} transactions`);
    return transactions;
    
  } catch (error: any) {
    console.error('❌ Soroban RPC search error:', error);
    throw error;
  }
}

async function searchContractTransactionsViaStellarExpert(contractId: string): Promise<TransactionDetails[]> {
  try {
    console.log('🔍 Starting Stellar Expert API search for contract:', contractId);
    
    const network = currentNetworkConfig.isTestnet ? 'testnet' : 'public';
    const apiUrl = `https://api.stellar.expert/explorer/${network}/contract/${contractId}`;
    
    console.log(`📡 Calling Stellar Expert API: ${apiUrl}`);
    
    // Try with CORS-friendly headers first
    let response;
    try {
      response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        mode: 'cors',
      });
    } catch (corsError) {
      console.warn('CORS request failed, trying without custom headers:', corsError);
      // Fallback: try with minimal headers
      response = await fetch(apiUrl, {
        method: 'GET',
        mode: 'cors',
      });
    }
    
    if (!response.ok) {
      if (response.status === 404) {
        console.log('Contract not found in Stellar Expert');
        return [];
      }
      throw new Error(`Stellar Expert API error: ${response.status}`);
    }
    
    const contractData = await response.json();
    console.log('📊 Stellar Expert contract data:', contractData);
    
    // Extract transaction hashes from the contract data
    const txHashes: string[] = [];
    
    // Check for transactions in various fields
    if (contractData.transactions) {
      txHashes.push(...contractData.transactions.map((tx: any) => tx.hash || tx.id));
    }
    
    if (contractData.operations) {
      const opTxHashes = contractData.operations
        .map((op: any) => op.transaction_hash || op.tx_hash)
        .filter((hash: string) => hash);
      txHashes.push(...opTxHashes);
    }
    
    if (contractData.activity) {
      const activityTxHashes = contractData.activity
        .map((activity: any) => activity.transaction || activity.tx)
        .filter((hash: string) => hash);
      txHashes.push(...activityTxHashes);
    }
    
    // Remove duplicates
    const uniqueTxHashes = [...new Set(txHashes)].filter(hash => hash && typeof hash === 'string');
    console.log(`🔗 Found ${uniqueTxHashes.length} unique transaction hashes from Stellar Expert`);
    
    if (uniqueTxHashes.length === 0) {
      return [];
    }
    
    // Fetch transaction details for each hash
    const transactions: TransactionDetails[] = [];
    for (const hash of uniqueTxHashes.slice(0, 20)) { // Limit to 20 most recent
      try {
        console.log(`📄 Fetching transaction details for ${hash}`);
        const txDetails = await fetchTransaction(hash);
        transactions.push(txDetails);
        console.log(`✅ Successfully added transaction ${hash}`);
      } catch (txError: any) {
        console.warn(`❌ Failed to fetch transaction ${hash}:`, txError.message);
      }
    }
    
    console.log(`🎉 Stellar Expert search completed with ${transactions.length} transactions`);
    return transactions;
    
  } catch (error: any) {
    console.error('❌ Stellar Expert API search error:', error);
    throw error;
  }
}

function parseSorobanValue(scVal: any): any {
  try {
    if (!scVal || typeof scVal !== 'object') return scVal;
    
    // Handle different ScVal types
    const type = Object.keys(scVal)[0];
    const value = scVal[type];
    
    switch (type) {
      case 'symbol':
        return value;
      case 'string':
        return value;
      case 'u32':
      case 'i32':
        return parseInt(value);
      case 'u64':
      case 'i64':
        return value; // Keep as string for big numbers
      case 'bool':
        return value;
      case 'address':
        return value;
      case 'vec':
        return value?.map(parseSorobanValue) || [];
      case 'map':
        const obj: any = {};
        if (value && Array.isArray(value)) {
          for (const item of value) {
            if (item.key && item.val) {
              obj[parseSorobanValue(item.key)] = parseSorobanValue(item.val);
            }
          }
        }
        return obj;
      default:
        return value;
    }
  } catch (error) {
    console.warn('Error parsing Soroban value:', error);
    return scVal;
  }
}

async function searchContractTransactionsViaOperations(contractId: string): Promise<TransactionDetails[]> {
  try {
    console.log('🔍 Searching via operations for contract:', contractId);
    
    // Try multiple search strategies
    const searchStrategies = [
      // Strategy 1: Search recent invoke_host_function operations
      async () => {
        const operations = await server.operations()
          .limit(200)
          .order('desc')
          .call();
        
        return operations.records.filter(op => op.type === 'invoke_host_function');
      },
      
      // Strategy 2: Search operations for specific account (if contract ID is valid)
      async () => {
        try {
          const operations = await server.operations()
            .forAccount(contractId)
            .limit(50)
            .order('desc')
            .call();
          
          return operations.records;
        } catch {
          return [];
        }
      }
    ];

    let allOperations: any[] = [];
    
    for (const strategy of searchStrategies) {
      try {
        const ops = await strategy();
        allOperations = allOperations.concat(ops);
        console.log(`Found ${ops.length} operations with current strategy`);
      } catch (error) {
        console.warn('Search strategy failed:', error);
      }
    }
    
    // Remove duplicates
    const uniqueOperations = allOperations.filter((op, index, self) => 
      index === self.findIndex(o => o.id === op.id)
    );
    
    console.log(`Total unique operations to analyze: ${uniqueOperations.length}`);

    const contractOperations = [];
    
    for (const op of uniqueOperations) {
      try {
        // Multiple ways to check if operation involves our contract
        let isMatch = false;
        
        // Method 1: Check source account
        if (op.source_account === contractId) {
          isMatch = true;
          console.log(`✓ Found match via source_account: ${op.id}`);
        }
        
        // Method 2: For invoke_host_function, decode XDR
        if (!isMatch && op.type === 'invoke_host_function') {
          const sorobanOp = await decodeSorobanOperation(op);
          if (sorobanOp.contractId === contractId || 
              sorobanOp.contractId.includes(contractId) ||
              contractId.includes(sorobanOp.contractId)) {
            isMatch = true;
            console.log(`✓ Found match via XDR decode: ${op.id} with contract ${sorobanOp.contractId}`);
          }
        }
        
        // Method 3: String search in operation data
        if (!isMatch) {
          const opString = JSON.stringify(op);
          if (opString.includes(contractId)) {
            isMatch = true;
            console.log(`✓ Found match via string search: ${op.id}`);
          }
        }
        
        // Method 4: Check if contract ID appears in any XDR fields
        if (!isMatch && (op.function_xdr || op.auth_xdr)) {
          try {
            const xdrString = (op.function_xdr || '') + (op.auth_xdr || '');
            if (xdrString.includes(contractId.slice(1))) { // Remove 'C' prefix
              isMatch = true;
              console.log(`✓ Found match via XDR content: ${op.id}`);
            }
          } catch {
            // Ignore XDR parsing errors
          }
        }
        
        if (isMatch) {
          contractOperations.push(op);
        }
        
      } catch (error) {
        console.warn(`Error analyzing operation ${op.id}:`, error);
      }
    }

    console.log(`Found ${contractOperations.length} operations involving contract`);

    if (contractOperations.length === 0) {
      return [];
    }

    // Get unique transaction hashes
    const txHashes = [...new Set(contractOperations.map(op => op.transaction_hash))];
    console.log(`Found ${txHashes.length} unique transactions`);

    // Fetch transaction details
    const transactions: TransactionDetails[] = [];
    for (const hash of txHashes.slice(0, 20)) { // Limit to 20 most recent
      try {
        const txDetails = await fetchTransaction(hash);
        transactions.push(txDetails);
      } catch (txError) {
        console.warn(`Failed to fetch transaction ${hash}:`, txError);
      }
    }

    return transactions;
  } catch (error) {
    console.error('Error in operations search:', error);
    return [];
  }
}

async function searchContractTransactionsDirectly(contractId: string): Promise<TransactionDetails[]> {
  try {
    console.log('🔍 Searching via direct transaction search for contract:', contractId);
    
    // Try to get transactions for the contract account directly
    let transactions: any;
    
    try {
      // First try: Get transactions for the contract as an account
      transactions = await server.transactions()
        .forAccount(contractId)
        .limit(50)
        .order('desc')
        .call();
      
      console.log(`Found ${transactions.records.length} transactions for contract account`);
      
      if (transactions.records.length > 0) {
        const contractTransactions: TransactionDetails[] = [];
        
        for (const tx of transactions.records) {
          try {
            const txDetails = await fetchTransaction(tx.hash);
            contractTransactions.push(txDetails);
            console.log(`✓ Added transaction: ${tx.hash}`);
          } catch (txError) {
            console.warn(`Failed to fetch transaction ${tx.hash}:`, txError);
          }
        }
        
        return contractTransactions;
      }
    } catch (accountError) {
      console.log('Contract account search failed, trying general search...');
    }
    
    // Fallback: Search through recent transactions
    transactions = await server.transactions()
      .limit(200)
      .order('desc')
      .call();

    console.log(`Searching through ${transactions.records.length} recent transactions for contract involvement`);

    const contractTransactions: TransactionDetails[] = [];

    for (const tx of transactions.records) {
      try {
        // Quick check: does transaction involve our contract?
        const txString = JSON.stringify(tx);
        if (!txString.includes(contractId) && tx.source_account !== contractId) {
          continue; // Skip if no obvious connection
        }
        
        const operations = await server.operations()
          .forTransaction(tx.hash)
          .call();

        const hasContractOperation = operations.records.some(op => {          
          // Multiple ways to check contract involvement
          if (op.source_account === contractId) return true;
          
          const opString = JSON.stringify(op);
          if (opString.includes(contractId)) return true;
          
          // For invoke_host_function, try XDR decode
          if (op.type === 'invoke_host_function' && op.function_xdr) {
            try {
              const xdrString = op.function_xdr + (op.auth_xdr || '');
              return xdrString.includes(contractId.slice(1)); // Remove 'C' prefix
            } catch {
              return false;
            }
          }
          
          return false;
        });

        if (hasContractOperation) {
          const txDetails = await fetchTransaction(tx.hash);
          contractTransactions.push(txDetails);
          console.log(`✓ Found contract transaction: ${tx.hash}`);
        }
      } catch (txError) {
        console.warn(`Failed to process transaction ${tx.hash}:`, txError);
      }

      // Limit results to avoid too many API calls  
      if (contractTransactions.length >= 20) break;
    }

    return contractTransactions;
  } catch (error) {
    console.error('Error in direct transaction search:', error);
    return [];
  }
}

export async function fetchTransaction(hash: string): Promise<TransactionDetails> {
  try {
    if (!hash || hash.trim() === '') {
      throw new Error('Transaction hash is required');
    }

    if (!/^[0-9a-fA-F]{64}$/.test(hash)) {
      throw new Error('Invalid transaction hash format');
    }

    const transaction = await server.transactions()
      .transaction(hash)
      .call()
      .catch(error => {
        if (error.response?.status === 404) {
          throw new Error(`Transaction ${hash} not found. Please verify the transaction hash and ensure you're on the correct network (${defaultConfig.isTestnet ? 'Testnet' : 'Public Network'}).`);
        }
        throw error;
      });

    const operations = await server.operations()
      .forTransaction(hash)
      .call()
      .catch(error => {
        console.error('Error fetching operations:', error);
        return { records: [] };
      });
    
    // Debug: Log all operations to see their structure
    console.log('🔍 All operations for transaction:', hash);
    operations.records.forEach((op, index) => {
      console.log(`Operation ${index}:`, {
        type: op.type,
        id: op.id,
        allFields: Object.keys(op),
        fullOperation: op
      });
      
      if (op.type === 'create_account') {
        console.log('🎯 CREATE_ACCOUNT operation details:', {
          account: op.account,
          destination: op.destination,
          starting_balance: op.starting_balance,
          startingBalance: op.startingBalance,
          funder: op.funder,
          source_account: op.source_account,
          from: op.from,
          to: op.to,
          allKeys: Object.keys(op)
        });
      }
    });
    
    const sorobanOperations = await Promise.all(
      operations.records
        .filter(op => op.type === 'invoke_host_function')
        .map(async op => {
          const sorobanOp = await decodeSorobanOperation(op);
          try {
            const contract = new Contract(op.source_account);
            const result = await contract.call(sorobanOp.functionName, sorobanOp.args);
            return {
              ...sorobanOp,
              result,
            };
          } catch (error) {
            return {
              ...sorobanOp,
              error: error instanceof Error ? error.message : 'Unknown error',
            };
          }
        })
    );

    const events = transaction.result_meta_xdr
      ? extractEventsFromMetaXDR(transaction.result_meta_xdr)
      : [];

    // Enhanced XDR decoding with better error analysis
    let debugInfo: TransactionDebugInfo | undefined;
    let enhancedSimulation: any = null;
    
    // Always try to get enhanced simulation data for better debugging
    if (currentNetworkConfig.isTestnet) {
      try {
        console.log('Running enhanced simulation with debugger...');
        enhancedSimulation = await simulateTransactionWithDebugger(hash);
        console.log('Enhanced simulation completed:', enhancedSimulation);
      } catch (simError: any) {
        console.warn('Enhanced simulation failed:', simError.message);
      }
    }

    const transactionDetails: TransactionDetails = {
      hash: transaction.hash,
      sourceAccount: transaction.source_account,
      fee: transaction.fee_charged,
      operations: operations.records,
      status: transaction.successful ? 'success' : 'failed',
      errorMessage: transaction.result_codes?.transaction,
      operationErrors: transaction.result_codes?.operations,
      resultCodes: transaction.result_codes,
      sorobanOperations: sorobanOperations.length > 0 ? sorobanOperations : undefined,
      events,
      ledgerTimestamp: new Date(transaction.created_at).getTime(),
    };

    // Add debug info for failed transactions
    if (!transaction.successful) {
      try {
        transactionDetails.debugInfo = await getTransactionDebugInfo(hash);
      } catch (debugError) {
        console.error('Failed to get debug info:', debugError);
      }
    }

    return transactionDetails;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Error fetching transaction:', errorMessage);
    throw new Error(errorMessage);
  }
}

function extractEventsFromMetaXDR(metaXDR: string): any[] {
  try {
    const txMeta = StellarSdk.xdr.TransactionMeta.fromXDR(metaXDR, 'base64');
    const events: any[] = [];

    txMeta.v3().sorobanMeta().forEach((meta: any) => {
      if (meta.events().length() > 0) {
        meta.events().forEach((event: any) => {
          events.push({
            contractId: event.contractId().toString(),
            type: event.type().toString(),
            data: event.data().toString(),
          });
        });
      }
    });

    return events;
  } catch (error) {
    console.error('Error extracting events:', error);
    return [];
  }
}

export async function simulateTransaction(hash: string): Promise<SimulationResult> {
  try {
    const tx = await server.transactions().transaction(hash).call();
    if (!tx) {
      throw new Error('Transaction not found');
    }

    const operations = await server.operations().forTransaction(hash).call();
    
    if (!operations?.records || !operations.records.some(op => op.type === 'invoke_host_function')) {
      return {
        success: tx.successful,
        estimatedFee: tx.fee_charged,
        potentialErrors: tx.result_codes?.transaction ? [tx.result_codes.transaction] : [],
        resourceUsage: {
          cpuUsage: 0,
          memoryUsage: 0,
        },
      };
    }

    try {
      const transactionEnvelope = StellarSdk.xdr.TransactionEnvelope.fromXDR(
        tx.envelope_xdr,
        'base64'
      );

      const simulationResponse = await server.simulateTransaction(transactionEnvelope);
      
      const resourceUsage = {
        cpuUsage: simulationResponse.results.reduce((total, result) => 
          total + (result.cpuInsns || 0), 0),
        memoryUsage: simulationResponse.results.reduce((total, result) => 
          total + (result.memBytes || 0), 0),
      };

      const potentialErrors = simulationResponse.results
        .filter(result => result.error)
        .map(result => result.error);

      return {
        success: potentialErrors.length === 0,
        estimatedFee: simulationResponse.minResourceFee || tx.fee_charged,
        potentialErrors,
        resourceUsage,
      };
    } catch (simError: any) {
      return {
        success: false,
        estimatedFee: tx.fee_charged,
        potentialErrors: [simError.message || 'Simulation failed'],
        resourceUsage: {
          cpuUsage: 0,
          memoryUsage: 0,
        },
      };
    }
  } catch (error: any) {
    console.error('Error simulating transaction:', error);
    throw new Error(error.message || 'Failed to simulate transaction');
  }
}

export function createOperationNodes(transaction: TransactionDetails) {
  console.log('Creating operation nodes for transaction:', transaction.hash);
  console.log('Operations:', transaction.operations);
  
  return transaction.operations.map((op, index) => {
    console.log(`Operation ${index}:`, op);
    
    // Debug create_account operations specifically
    if (op.type === 'create_account') {
      console.log('Create account operation details:', {
        type: op.type,
        account: (op as any).account,
        destination: (op as any).destination,
        starting_balance: (op as any).starting_balance,
        startingBalance: (op as any).startingBalance,
        funder: (op as any).funder,
        source_account: op.source_account,
        allKeys: Object.keys(op)
      });
    }
    
    // Extract create_account specific fields with multiple fallbacks
    let destination, startingBalance;
    if (op.type === 'create_account') {
      // Try different possible field names for destination
      destination = (op as any).account || (op as any).destination || (op as any).to;
      // Try different possible field names for starting balance
      startingBalance = (op as any).starting_balance || (op as any).startingBalance || (op as any).amount;
      
      console.log('🎯 Extracted create_account fields:', {
        destination,
        startingBalance,
        sourceAccount: op.source_account
      });
    }
    
    return {
      id: `${transaction.hash}-${index}`,
      type: 'operation',
      position: { x: 100 + index * 250, y: 100 },
      data: {
        type: op.type,
        operation: op,
        sourceAccount: op.source_account || transaction.sourceAccount,
        // Payment operation
        amount: 'amount' in op ? op.amount : undefined,
        asset: 'asset_type' in op ? (op.asset_type === 'native' ? 'XLM' : op.asset_code || op.asset_type) : undefined,
        from: 'from' in op ? op.from : undefined,
        to: 'to' in op ? op.to : undefined,
        
        // Create account operation - use extracted values
        destination: destination,
        startingBalance: startingBalance,
        
        // Sponsorship operations
        sponsoredId: 'sponsored_id' in op ? op.sponsored_id : undefined,
        
        // Set options operation
        account: 'account' in op ? op.account : undefined,
        homeDomain: 'home_domain' in op ? op.home_domain : undefined,
        setFlags: 'set_flags' in op ? op.set_flags : undefined,
        clearFlags: 'clear_flags' in op ? op.clear_flags : undefined,
        masterWeight: 'master_weight' in op ? op.master_weight : undefined,
        lowThreshold: 'low_threshold' in op ? op.low_threshold : undefined,
        medThreshold: 'med_threshold' in op ? op.med_threshold : undefined,
        highThreshold: 'high_threshold' in op ? op.high_threshold : undefined,
        signer: 'signer' in op ? op.signer : undefined,
        
        // Trust operations
        trustor: 'trustor' in op ? op.trustor : undefined,
        authorize: 'authorize' in op ? op.authorize : undefined,
        limit: 'limit' in op ? op.limit : undefined,
        
        // Offer operations
        selling: 'selling_asset_type' in op ? (op.selling_asset_type === 'native' ? 'XLM' : op.selling_asset_code || op.selling_asset_type) : undefined,
        buying: 'buying_asset_type' in op ? (op.buying_asset_type === 'native' ? 'XLM' : op.buying_asset_code || op.buying_asset_type) : undefined,
        price: 'price' in op ? op.price : undefined,
        
        error: transaction.status === 'failed' ? transaction.errorMessage : undefined,
        sorobanOperation: transaction.sorobanOperations?.find(
          sop => sop.contractId === op.source_account || op.type === 'invoke_host_function'
        ),
      },
    };
  });
}

export function createOperationEdges(transaction: TransactionDetails) {
  return transaction.operations.slice(0, -1).map((_, index) => ({
    id: `${transaction.hash}-edge-${index}`,
    source: `${transaction.hash}-${index}`,
    target: `${transaction.hash}-${index + 1}`,
    type: 'smoothstep',
    animated: true,
    style: { stroke: transaction.status === 'failed' ? '#ef4444' : '#3b82f6' },
  }));
}