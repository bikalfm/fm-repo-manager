import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, X, Search as SearchIcon } from 'lucide-react';

interface MultiSelectDropdownProps {
  options: string[];
  selectedOptions: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  label?: string;
  className?: string;
}

const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({
  options,
  selectedOptions,
  onChange,
  placeholder = 'Select options...',
  label,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleOption = (option: string) => {
    if (selectedOptions.includes(option)) {
      onChange(selectedOptions.filter((item) => item !== option));
    } else {
      onChange([...selectedOptions, option]);
    }
  };

  const clearSelection = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
    setIsOpen(false); // Optionally close dropdown on clear
  };

  const filteredOptions = options.filter((option) =>
    option.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getSelectionDisplay = () => {
    if (selectedOptions.length === 0) {
      return placeholder;
    }
    if (selectedOptions.length === 1) {
      return selectedOptions[0];
    }
    if (selectedOptions.length === options.length) {
      return 'All selected';
    }
    return `${selectedOptions.length} selected`;
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {label && (
        <label className="block text-sm font-medium text-white mb-1">
          {label}
        </label>
      )}
      <div
        className="flex items-center justify-between w-full border border-gray-700 rounded-md shadow-sm py-2 px-3 bg-gray-800 text-white focus:outline-none focus:ring-1 focus:ring-white focus:border-white sm:text-sm cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="truncate">{getSelectionDisplay()}</span>
        <div className="flex items-center">
          {selectedOptions.length > 0 && (
            <button
              type="button"
              onClick={clearSelection}
              className="text-gray-400 hover:text-white mr-2 p-0.5 rounded-full hover:bg-gray-700"
              title="Clear selection"
            >
              <X size={16} />
            </button>
          )}
          <ChevronDown size={20} className={`transition-transform ${isOpen ? 'transform rotate-180' : ''}`} />
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-gray-800 border border-gray-700 rounded-md shadow-lg max-h-60 scrollbar-thin">
          <div className="p-2">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <SearchIcon className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search..."
                className="block w-full pl-9 pr-3 py-1.5 border border-gray-600 rounded-md leading-5 bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-white focus:border-white sm:text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <ul className="overflow-y-auto max-h-40 scrollbar-thin">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <li
                  key={option}
                  className="px-3 py-2 text-sm text-white hover:bg-gray-700 cursor-pointer flex items-center"
                  onClick={() => toggleOption(option)}
                >
                  <input
                    type="checkbox"
                    checked={selectedOptions.includes(option)}
                    onChange={() => {}} // Managed by li onClick
                    className="form-checkbox h-4 w-4 text-primary-600 bg-gray-700 border-gray-600 rounded focus:ring-primary-500 mr-2 cursor-pointer"
                  />
                  <span className="truncate">{option}</span>
                </li>
              ))
            ) : (
              <li className="px-3 py-2 text-sm text-gray-400 text-center">No options found.</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default MultiSelectDropdown;
