import React, { useState } from 'react';
import { Search, X, Hash, Code } from 'lucide-react';
import * as Tabs from '@radix-ui/react-tabs';

interface TransactionSearchProps {
  onSearch: (value: string, type: 'transaction' | 'contract') => void;
  isLoading: boolean;
}

export function TransactionSearch({ onSearch, isLoading }: TransactionSearchProps) {
  const [searchValue, setSearchValue] = useState('');
  const [searchType, setSearchType] = useState<'transaction' | 'contract'>('transaction');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchValue.trim()) {
      onSearch(searchValue.trim(), searchType);
    }
  };

  const handleClear = () => {
    setSearchValue('');
  };

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-4">
      <Tabs.Root value={searchType} onValueChange={(value) => setSearchType(value as 'transaction' | 'contract')}>
        <Tabs.List className="flex space-x-2 mb-4">
          <Tabs.Trigger
            value="transaction"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors
                     data-[state=active]:bg-blue-600 data-[state=active]:text-white
                     data-[state=inactive]:bg-gray-100 data-[state=inactive]:text-gray-600
                     hover:data-[state=inactive]:bg-gray-200"
          >
            <Hash className="w-4 h-4" />
            Transaction Hash
          </Tabs.Trigger>
          <Tabs.Trigger
            value="contract"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors
                     data-[state=active]:bg-blue-600 data-[state=active]:text-white
                     data-[state=inactive]:bg-gray-100 data-[state=inactive]:text-gray-600
                     hover:data-[state=inactive]:bg-gray-200"
          >
            <Code className="w-4 h-4" />
            Contract ID
          </Tabs.Trigger>
        </Tabs.List>
      </Tabs.Root>

      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          placeholder={searchType === 'transaction' 
            ? "Enter Stellar transaction hash (64 characters)..." 
            : "Enter Soroban contract ID (32-64 characters)..."}
          className="w-full pl-10 pr-16 py-3 text-gray-900 bg-white border border-gray-200 rounded-xl 
                   focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm
                   placeholder:text-gray-400"
          disabled={isLoading}
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-2">
          {searchValue && !isLoading && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:bg-gray-100 rounded-full mr-1"
            >
              <X className="h-4 w-4 text-gray-400" />
            </button>
          )}
          <button
            type="submit"
            disabled={isLoading || !searchValue.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
                     disabled:opacity-50 disabled:cursor-not-allowed transition-colors
                     flex items-center gap-2"
          >
            <span>Search</span>
          </button>
        </div>
      </div>
    </form>
  );
}