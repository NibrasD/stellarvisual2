# Stellar Transaction Visualizer SDK

A powerful SDK for visualizing and analyzing Stellar transactions, with first-class support for Soroban smart contracts.

## Features

- 🔍 Detailed transaction analysis
- 🔮 Transaction simulation
- 🤖 Soroban smart contract support
- 📊 Operation flow visualization
- 🎯 Event tracking
- 🛠 Resource usage estimation

## Installation

```bash
npm install @stellar/transaction-visualizer
```

## Usage

```typescript
import { StellarTransactionVisualizer } from '@stellar/transaction-visualizer';

// Initialize with custom network config (optional)
const visualizer = new StellarTransactionVisualizer({
  isTestnet: true,
  networkUrl: 'https://horizon-testnet.stellar.org',
  networkPassphrase: 'Test SDF Network ; September 2015',
});

// Analyze a transaction
const txDetails = await visualizer.getTransactionDetails(
  'your-transaction-hash'
);

// Get Soroban operations
const sorobanOps = visualizer.getSorobanOperations(txDetails);

// Get contract events
const events = visualizer.getContractEvents(txDetails);

// Simulate transaction
const simulation = await visualizer.simulateTransaction(
  'your-transaction-hash'
);
```

## Integration Examples

### StellarExpert Integration

```typescript
import { StellarTransactionVisualizer } from '@stellar/transaction-visualizer';

class StellarExpertPlugin {
  private visualizer: StellarTransactionVisualizer;

  constructor() {
    this.visualizer = new StellarTransactionVisualizer({
      isTestnet: false // Use public network
    });
  }

  async enhanceTransactionView(hash: string) {
    const txDetails = await this.visualizer.getTransactionDetails(hash);
    const sorobanOps = this.visualizer.getSorobanOperations(txDetails);
    
    // Add visualization to StellarExpert UI
    this.renderOperationFlow(sorobanOps);
    this.renderContractEvents(txDetails.events);
  }
}
```

### Wallet Integration

```typescript
import { StellarTransactionVisualizer } from '@stellar/transaction-visualizer';

class WalletTransactionAnalyzer {
  private visualizer: StellarTransactionVisualizer;

  constructor(networkConfig) {
    this.visualizer = new StellarTransactionVisualizer(networkConfig);
  }

  async analyzeBeforeSigning(xdr: string) {
    const simulation = await this.visualizer.simulateTransaction(xdr);
    
    return {
      estimatedFee: simulation.estimatedFee,
      resourceUsage: simulation.resourceUsage,
      potentialIssues: simulation.potentialErrors,
    };
  }
}
```

## Contributing

We welcome contributions! Please see our contributing guidelines for details.

## License

MIT