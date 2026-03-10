import React from 'react';
import { Search } from 'lucide-react';
import { motion } from 'motion/react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({ value, onChange, placeholder }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="relative max-w-lg mx-auto"
    >
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 w-5 h-5" />
      <input 
        type="text"
        placeholder={placeholder || "Search..."}
        className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl text-stone-900 shadow-xl focus:ring-2 focus:ring-crimson-400 outline-none"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </motion.div>
  );
};
