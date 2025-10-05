import React from 'react';
import * as Switch from '@radix-ui/react-switch';
import { NetworkConfig } from '../types/stellar';

interface NetworkSelectorProps {
  config: NetworkConfig;
  onConfigChange: (config: NetworkConfig) => void;
}

export function NetworkSelector({ config, onConfigChange }: NetworkSelectorProps) {
  const handleNetworkChange = (checked: boolean) => {
    onConfigChange({
      isTestnet: checked,
      networkUrl: checked 
        ? 'https://horizon-testnet.stellar.org'
        : 'https://horizon.stellar.org',
      networkPassphrase: checked 
        ? 'Test SDF Network ; September 2015'
        : 'Public Global Stellar Network ; September 2015',
    });
  };

  return (
    <div className="flex items-center gap-4">
      <label className="text-sm text-gray-600" htmlFor="network-switch">
        Use Testnet
      </label>
      <Switch.Root
        id="network-switch"
        checked={config.isTestnet}
        onCheckedChange={handleNetworkChange}
        className="w-11 h-6 bg-gray-200 rounded-full relative data-[state=checked]:bg-blue-600 outline-none cursor-pointer"
      >
        <Switch.Thumb className="block w-5 h-5 bg-white rounded-full shadow-lg transition-transform duration-100 translate-x-0.5 will-change-transform data-[state=checked]:translate-x-[22px]" />
      </Switch.Root>
    </div>
  );
}