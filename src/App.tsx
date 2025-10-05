import React, { useState } from 'react';
import { Activity, ExternalLink } from 'lucide-react';
import * as Tabs from '@radix-ui/react-tabs';
import { TransactionSearch } from './components/TransactionSearch';
import { TransactionFlow } from './components/TransactionFlow';
import { NetworkSelector } from './components/NetworkSelector';
import { SimulationPanel } from './components/SimulationPanel';
import { TransactionDetailsPanel } from './components/TransactionDetails';
import {
  fetchTransaction,
  createOperationNodes,
  createOperationEdges,
  setNetwork,
  simulateTransaction
} from './services/stellar';
import type { TransactionDetails, NetworkConfig } from './types/stellar';

function App() {
  const [isLoading, setIsLoading] = useState(false);
  const [transactions, setTransactions] = useState<TransactionDetails[]>([]);
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [networkConfig, setNetworkConfig] = useState<NetworkConfig>({
    isTestnet: false,
    networkUrl: 'https://horizon.stellar.org',
    networkPassphrase: 'Public Global Stellar Network ; September 2015',
  });

  const handleNetworkChange = (config: NetworkConfig) => {
    setNetworkConfig(config);
    setNetwork(config);
    setTransactions([]);
    setSelectedTransaction(null);
    setError(null);
  };

  const handleSearch = async (value: string) => {
    setIsLoading(true);
    setError(null);
    console.log('Searching for transaction:', value);

    try {
      const txData = await fetchTransaction(value);
      if (networkConfig.isTestnet) {
        try {
          const { simulateTransactionWithDebugger } = await import('./services/stellar');
          const enhancedResult = await simulateTransactionWithDebugger(value);
          txData.simulationResult = {
            ...enhancedResult.simulation,
            enhancedDebugInfo: enhancedResult.debugInfo,
          };
        } catch (simError: any) {
          console.warn('Simulation failed (this is normal for some transactions):', simError.message);
          txData.simulationResult = {
            success: false,
            estimatedFee: '0',
            potentialErrors: [simError.message || 'Unknown simulation error'],
            resourceUsage: {
              cpuUsage: 0,
              memoryUsage: 0,
            },
          };
        }
      }
      setTransactions([txData]);
      setSelectedTransaction(txData);
    } catch (err: any) {
      console.error('Search error:', err);
      const errorMessage = err.message || 'Failed to fetch data. Please check your input and try again.';
      setError(errorMessage);
      setTransactions([]);
      setSelectedTransaction(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Activity className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
              Stellar Transaction Visualizer
            </h1>
          </div>
          <NetworkSelector config={networkConfig} onConfigChange={handleNetworkChange} />
        </div>

        <div className="mb-8 max-w-3xl">
          <TransactionSearch onSearch={handleSearch} isLoading={isLoading} />
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600">{error}</p>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-[600px] bg-white rounded-xl shadow-lg border border-gray-100">
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="text-gray-600">Fetching data...</p>
            </div>
          </div>
        ) : selectedTransaction ? (
          <div className="space-y-6">
            <Tabs.Root defaultValue="details" className="space-y-6">
              <Tabs.List className="flex space-x-2 border-b border-gray-200">
                <Tabs.Trigger
                  value="details"
                  className="px-4 py-2 text-gray-600 hover:text-gray-900 border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600"
                >
                  Transaction Details
                </Tabs.Trigger>
                <Tabs.Trigger
                  value="flow"
                  className="px-4 py-2 text-gray-600 hover:text-gray-900 border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600"
                >
                  Operation Flow
                </Tabs.Trigger>
                {selectedTransaction.simulationResult && (
                  <Tabs.Trigger
                    value="simulation"
                    className="px-4 py-2 text-gray-600 hover:text-gray-900 border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600"
                  >
                    Simulation Results
                  </Tabs.Trigger>
                )}
              </Tabs.List>

              <Tabs.Content value="details">
                <TransactionDetailsPanel 
                  transaction={selectedTransaction}
                  networkConfig={networkConfig}
                />
              </Tabs.Content>

              <Tabs.Content value="flow">
                <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
                  <h2 className="text-xl font-semibold mb-4">Operation Flow</h2>
                  <TransactionFlow
                    nodes={createOperationNodes(selectedTransaction)}
                    edges={createOperationEdges(selectedTransaction)}
                  />
                </div>
              </Tabs.Content>

              {selectedTransaction.simulationResult && (
                <Tabs.Content value="simulation">
                  <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
                    <SimulationPanel result={selectedTransaction.simulationResult} />
                  </div>
                </Tabs.Content>
              )}
            </Tabs.Root>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-[600px] bg-white rounded-xl shadow-lg border border-gray-100">
            <Activity className="w-16 h-16 text-gray-300 mb-4" />
            <p className="text-gray-600 mb-2">
              Enter a transaction hash to visualize
            </p>
            <div className="text-sm text-gray-500 text-center space-y-1">
              <p>Example: 98efb66edd62eb844b392c44df1e909ae6f48b38f76fc5972900f43208cd0566</p>
              <p className="text-xs text-gray-400 mt-2">
                Currently on: {networkConfig.isTestnet ? 'Testnet' : 'Public Network'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;