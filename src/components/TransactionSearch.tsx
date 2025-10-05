import React, { useState } from 'react';
import { Search, X } from 'lucide-react';

interface TransactionSearchProps {
  onSearch: (value: string) => void;
  isLoading: boolean;
}

export function TransactionSearch({ onSearch, isLoading }: TransactionSearchProps) {
  const [searchValue, setSearchValue] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchValue.trim()) {
      onSearch(searchValue.trim());
    }
  };

  const handleClear = () => {
    setSearchValue('');
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          placeholder="Enter Stellar transaction hash..."
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