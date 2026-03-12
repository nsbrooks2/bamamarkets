import React from 'react';
import { CATEGORIES, Category } from '../types';
import { 
  LayoutGrid, 
  Trophy, 
  Armchair, 
  Monitor, 
  BookOpen, 
  Bed, 
  Shirt, 
  Footprints,
  Ticket, 
  Gift, 
  Wrench,
  MoreHorizontal 
} from 'lucide-react';

interface CategoryFilterProps {
  selectedCategory: Category | 'All';
  onSelect: (category: Category | 'All') => void;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'All': <LayoutGrid className="w-4 h-4" />,
  'Gameday': <Trophy className="w-4 h-4" />,
  'Furniture': <Armchair className="w-4 h-4" />,
  'Electronics': <Monitor className="w-4 h-4" />,
  'Textbooks': <BookOpen className="w-4 h-4" />,
  'Dorm Items': <Bed className="w-4 h-4" />,
  'Clothes': <Shirt className="w-4 h-4" />,
  'Shoes': <Footprints className="w-4 h-4" />,
  'Tickets': <Ticket className="w-4 h-4" />,
  'Free Stuff': <Gift className="w-4 h-4" />,
  'Services': <Wrench className="w-4 h-4" />,
  'Other': <MoreHorizontal className="w-4 h-4" />,
};

export const CategoryFilter: React.FC<CategoryFilterProps> = ({ selectedCategory, onSelect }) => {
  return (
    <div className="flex items-center gap-3 overflow-x-auto pb-4 no-scrollbar">
      <button
        onClick={() => onSelect('All')}
        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${
          selectedCategory === 'All' 
            ? 'bg-stone-900 text-white shadow-lg' 
            : 'bg-white text-stone-600 border border-stone-200 hover:border-stone-400 shadow-sm'
        }`}
      >
        {CATEGORY_ICONS['All']}
        All Items
      </button>
      {CATEGORIES.map((category) => (
        <button
          key={category}
          onClick={() => onSelect(category)}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${
            selectedCategory === category 
              ? category === 'Gameday' 
                ? 'bg-crimson-600 text-white shadow-lg shadow-crimson-200' 
                : 'bg-stone-900 text-white shadow-lg' 
              : category === 'Gameday'
                ? 'bg-crimson-50 text-crimson-700 border border-crimson-100 hover:border-crimson-200 shadow-sm'
                : 'bg-white text-stone-600 border border-stone-200 hover:border-stone-400 shadow-sm'
          }`}
        >
          {CATEGORY_ICONS[category]}
          {category}
        </button>
      ))}
    </div>
  );
};
