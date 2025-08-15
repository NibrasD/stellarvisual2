import { NetworkConfig, TransactionDetails, SorobanOperation } from '../types/stellar';
import { fetchTransaction, simulateTransaction, setNetwork } from '../services/stellar';

export class StellarTransactionVisualizer {
  constructor(config?: Partial<NetworkConfig>) {
    if (config) {
      setNetwork({
        isTestnet: config.isTestnet ?? true,
        networkUrl: config.networkUrl ?? 'https://horizon-testnet.stellar.org',
        networkPassphrase: config.networkPassphrase ?? 'Test SDF Network ; September 2015',
      });
    }
  }

  /**
   * Fetches and analyzes a transaction
   * @param hash Transaction hash
   * @returns Detailed transaction information including Soroban operations and events
   */
  async getTransactionDetails(hash: string): Promise<TransactionDetails> {
    return fetchTransaction(hash);
  }

  /**
   * Simulates a transaction to estimate resource usage and potential issues
   * @param hash Transaction hash
   * @returns Simulation results including resource usage and potential errors
   */
  async simulateTransaction(hash: string) {
    return simulateTransaction(hash);
  }

  /**
   * Extracts Soroban-specific operations from a transaction
   * @param transaction Transaction details
   * @returns Array of Soroban operations
   */
  getSorobanOperations(transaction: TransactionDetails): SorobanOperation[] {
    return transaction.sorobanOperations || [];
  }

  /**
   * Gets contract events emitted during transaction execution
   * @param transaction Transaction details
   * @returns Array of contract events
   */
  getContractEvents(transaction: TransactionDetails) {
    return transaction.events || [];
  }
}

// Export types for SDK users
export type {
  NetworkConfig,
  TransactionDetails,
  SorobanOperation,
  SimulationResult,
  ContractEvent,
} from '../types/stellar';