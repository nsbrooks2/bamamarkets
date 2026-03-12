import React from 'react';
import { motion } from 'motion/react';
import { ExternalLink, Info } from 'lucide-react';

export const AdCard: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-stone-50 rounded-3xl border border-stone-200 overflow-hidden flex flex-col h-full group"
    >
      <div className="aspect-square bg-stone-200 relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center text-stone-400 font-bold text-xl uppercase tracking-widest">
          Your Ad Here
        </div>
        <div className="absolute top-3 left-3 px-2 py-1 bg-white/90 backdrop-blur-sm rounded-md text-[10px] font-bold text-stone-500 uppercase tracking-wider flex items-center gap-1 shadow-sm">
          <Info className="w-3 h-3" />
          Sponsored
        </div>
      </div>
      
      <div className="p-5 flex-grow flex flex-col justify-between space-y-4">
        <div className="space-y-2">
          <h3 className="font-bold text-stone-900 line-clamp-2 group-hover:text-crimson-600 transition-colors">
            Promote your business to thousands of UA students
          </h3>
          <p className="text-sm text-stone-500 line-clamp-2">
            Reach your target audience directly on BamaMarket. Affordable rates for local businesses.
          </p>
        </div>
        
        <button className="w-full py-3 bg-white border border-stone-200 text-stone-600 rounded-xl font-bold hover:bg-stone-100 transition-all flex items-center justify-center gap-2 text-sm">
          Learn More
          <ExternalLink className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
};
