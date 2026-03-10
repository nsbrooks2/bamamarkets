import React from 'react';
import { CATEGORIES, Category } from '../types';

interface CategoryFilterProps {
  selectedCategory: Category | 'All';
  onSelect: (category: Category | 'All') => void;
}

export const CategoryFilter: React.FC<CategoryFilterProps> = ({ selectedCategory, onSelect }) => {
  return (
    <div className="flex items-center gap-4 overflow-x-auto pb-4 no-scrollbar">
      <button
        onClick={() => onSelect('All')}
        className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
          selectedCategory === 'All' 
            ? 'bg-stone-900 text-white shadow-md' 
            : 'bg-white text-stone-600 border border-stone-200 hover:border-stone-400'
        }`}
      >
        All Items
      </button>
      {CATEGORIES.map((category) => (
        <button
          key={category}
          onClick={() => onSelect(category)}
          className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
            selectedCategory === category 
              ? 'bg-stone-900 text-white shadow-md' 
              : 'bg-white text-stone-600 border border-stone-200 hover:border-stone-400'
          }`}
        >
          {category}
        </button>
      ))}
    </div>
  );
};
