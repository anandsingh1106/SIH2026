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
      <div className="absolute left-3.5 text-ink-soft pointer-events-none flex items-center">
        <Search className="w-4 h-4" />
      </div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-line-strong bg-surface py-2.5 pl-11 pr-10 text-base text-ink placeholder:text-ink-soft/70 shadow-subtle transition-all duration-200 hover:border-sand-400 focus:border-gov-600 focus:outline-none focus:ring-4 focus:ring-gov-600/15"
      />
      {query && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-2.5 p-1.5 text-ink-soft hover:text-ink rounded-full hover:bg-sand-100 transition-colors"
          aria-label="Clear search"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
