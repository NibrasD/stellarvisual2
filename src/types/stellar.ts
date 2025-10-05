export interface TransactionDetails {
  hash: string;
  sourceAccount: string;
  fee: string;
  operations: any[];
  status: 'success' | 'failed' | 'pending';
  errorMessage?: string;
  operationErrors?: string[];
  resultCodes?: {
    transaction?: string;
    operations?: string[];
  };
  simulationResult?: SimulationResult;
  sorobanOperations?: SorobanOperation[];
  events?: ContractEvent[];
  ledgerTimestamp: number;
  debugInfo?: TransactionDebugInfo;
}

export interface OperationNode {
  id: string;
  type: string;
  data: any;
  position: { x: number; y: number };
}

export interface OperationEdge {
  id: string;
  source: string;
  target: string;
}

export interface SimulationResult {
  success: boolean;
  estimatedFee: string;
  potentialErrors: string[];
  resourceUsage: {
    cpuUsage: number;
    memoryUsage: number;
  };
  enhancedDebugInfo?: {
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
}

export interface ContractInteraction {
  contractId: string;
  functionName: string;
  inputs: any[];
  output?: any;
  error?: string;
}

export interface NetworkConfig {
  isTestnet: boolean;
  networkUrl: string;
  networkPassphrase: string;
}

export interface SorobanOperation {
  type: 'soroban';
  contractId: string;
  functionName: string;
  args: any[];
  auth: any[];
  result?: any;
  error?: string;
  events?: ContractEvent[];
  stateChanges?: StateChange[];
  ttlExtensions?: TtlExtension[];
  resourceUsage?: ResourceUsage;
}

export interface ResourceUsage {
  refundableFee?: number;
  nonRefundableFee?: number;
  rentFee?: number;
}

export interface StateChange {
  type: string;
  description: string;
  key?: string;
  value?: any;
}

export interface TtlExtension {
  description: string;
  ledgerSeq?: number;
  entryHash?: string;
}

export interface ContractEvent {
  contractId: string;
  type: string;
  topics?: string[];
  data: any;
}

export interface TransactionDebugInfo {
  resultXdr?: string;
  envelopeXdr?: string;
  metaXdr?: string;
  decodedResult?: any;
  decodedEnvelope?: any;
  decodedMeta?: any;
  errorAnalysis?: {
    transactionError?: string;
    operationErrors?: Array<{
      operation: number;
      error: string;
      description?: string;
      operationType?: string;
      details?: any;
    }>;
  };
}

export interface OperationError {
  title: string;
  description: string;
  solution?: string;
  code: string;
  xdrDetails?: {
    description?: string;
    details?: any;
  };
}