import React, { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface SearchInputProps {
  placeholder?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  onSearch?: (value: string) => void;
  debounceMs?: number;
  className?: string;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  placeholder = 'Search by name, ID, phone, district...',
  value: controlledValue,
  defaultValue = '',
  onChange,
  onSearch,
  debounceMs = 250,
  className,
}) => {
  const [query, setQuery] = useState(controlledValue !== undefined ? controlledValue : defaultValue);

  useEffect(() => {
    if (controlledValue !== undefined) {
      setQuery(controlledValue);
    }
  }, [controlledValue]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (onChange) onChange(query);
      if (onSearch) onSearch(query);
    }, debounceMs);
    return () => clearTimeout(handler);
  }, [query, debounceMs, onChange, onSearch]);

  const handleClear = () => {
    setQuery('');
    if (onChange) onChange('');
    if (onSearch) onSearch('');
  };

  return (
    <div className={twMerge(clsx('relative flex items-center w-full', className))}>
      <div className="absolute left-3 text-slate-400 pointer-events-none flex items-center">
        <Search className="w-4 h-4" />
      </div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-8 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-gov-600 focus:outline-none focus:ring-2 focus:ring-gov-200"
      />
      {query && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-2.5 p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
