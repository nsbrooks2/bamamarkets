import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Filter, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CLOTHING_SIZES, SHOE_SIZES, Category } from '../types';

interface FilterDropdownProps {
  sortBy: 'newest' | 'price_asc' | 'price_desc' | 'popular';
  onSortChange: (sort: 'newest' | 'price_asc' | 'price_desc' | 'popular') => void;
  priceRange: [number, number];
  onPriceChange: (range: [number, number]) => void;
  selectedSize: string;
  onSizeChange: (size: string) => void;
  category: Category | 'All';
}

export const FilterDropdown: React.FC<FilterDropdownProps> = ({
  sortBy,
  onSortChange,
  priceRange,
  onPriceChange,
  selectedSize,
  onSizeChange,
  category
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const sortOptions = [
    { value: 'newest', label: 'Newest First' },
    { value: 'price_asc', label: 'Price: Low to High' },
    { value: 'price_desc', label: 'Price: High to Low' },
    { value: 'popular', label: 'Most Popular' },
  ];

  const isClothingOrShoes = category === 'Clothes' || category === 'Shoes';
  
  const sizes = isClothingOrShoes 
    ? category === 'Clothes' 
      ? [...CLOTHING_SIZES.womens.map(s => `Women's ${s}`), ...CLOTHING_SIZES.mens.map(s => `Men's ${s}`)]
      : [...SHOE_SIZES.womens.map(s => `Women's ${s}`), ...SHOE_SIZES.mens.map(s => `Men's ${s}`)]
    : [];

  const activeFiltersCount = (sortBy !== 'newest' ? 1 : 0) + 
                             (priceRange[0] > 0 || priceRange[1] < 10000 ? 1 : 0) + 
                             (selectedSize ? 1 : 0);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all border ${
          isOpen || activeFiltersCount > 0
            ? 'bg-stone-900 text-white border-stone-900 shadow-lg'
            : 'bg-white text-stone-600 border-stone-200 hover:border-stone-400 shadow-sm'
        }`}
      >
        <Filter className="w-4 h-4" />
        Filters
        {activeFiltersCount > 0 && (
          <span className="flex items-center justify-center w-5 h-5 bg-crimson-600 text-white text-[10px] rounded-full">
            {activeFiltersCount}
          </span>
        )}
        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute right-0 mt-2 w-72 bg-white rounded-3xl border border-stone-200 shadow-2xl z-50 overflow-hidden"
          >
            <div className="p-6 space-y-6">
              {/* Sort Section */}
              <div className="space-y-3">
                <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">Sort By</p>
                <div className="grid grid-cols-1 gap-1">
                  {sortOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => onSortChange(option.value as any)}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                        sortBy === option.value
                          ? 'bg-stone-100 text-stone-900'
                          : 'text-stone-600 hover:bg-stone-50'
                      }`}
                    >
                      {option.label}
                      {sortBy === option.value && <Check className="w-4 h-4 text-crimson-600" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price Section */}
              <div className="space-y-3">
                <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">Price Range</p>
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-xs">$</span>
                    <input
                      type="number"
                      placeholder="Min"
                      value={priceRange[0] || ''}
                      onChange={(e) => onPriceChange([Number(e.target.value), priceRange[1]])}
                      className="w-full pl-6 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-crimson-500/20"
                    />
                  </div>
                  <span className="text-stone-300">-</span>
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-xs">$</span>
                    <input
                      type="number"
                      placeholder="Max"
                      value={priceRange[1] === 10000 ? '' : priceRange[1]}
                      onChange={(e) => onPriceChange([priceRange[0], Number(e.target.value) || 10000])}
                      className="w-full pl-6 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-crimson-500/20"
                    />
                  </div>
                </div>
              </div>

              {/* Size Section */}
              {isClothingOrShoes && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">Size</p>
                    {selectedSize && (
                      <button 
                        onClick={() => onSizeChange('')}
                        className="text-[10px] font-bold text-crimson-600 uppercase hover:underline"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <div className="max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                    <div className="flex flex-wrap gap-2">
                      {sizes.map((size) => (
                        <button
                          key={size}
                          onClick={() => onSizeChange(selectedSize === size ? '' : size)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                            selectedSize === size
                              ? 'bg-crimson-600 text-white border-crimson-600 shadow-md'
                              : 'bg-white text-stone-600 border-stone-200 hover:border-stone-400'
                          }`}
                        >
                          {size.replace("Women's ", "W ").replace("Men's ", "M ")}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-stone-50 border-t border-stone-100 flex items-center justify-between">
              <button
                onClick={() => {
                  onSortChange('newest');
                  onPriceChange([0, 10000]);
                  onSizeChange('');
                }}
                className="text-xs font-bold text-stone-400 hover:text-stone-600 uppercase tracking-widest"
              >
                Reset All
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="px-6 py-2 bg-stone-900 text-white text-xs font-bold rounded-xl hover:bg-stone-800 transition-colors uppercase tracking-widest"
              >
                Apply
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
