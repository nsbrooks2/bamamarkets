import React from 'react';
import { Listing } from '../types';
import { ListingCard } from './ListingCard';
import { AdCard } from './AdCard';
import { motion } from 'motion/react';
import { X, Search } from 'lucide-react';

interface ListingGridProps {
  listings: Listing[];
  loading: boolean;
  emptyMessage?: string;
  emptySubmessage?: string;
}

export const ListingGrid: React.FC<ListingGridProps> = ({ 
  listings, 
  loading, 
  emptyMessage = "No listings found",
  emptySubmessage = "Try adjusting your filters."
}) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-white rounded-3xl border border-stone-200 h-[420px] animate-pulse overflow-hidden">
            <div className="aspect-[4/3] bg-stone-100"></div>
            <div className="p-5 space-y-4">
              <div className="flex justify-between">
                <div className="h-6 bg-stone-100 rounded-md w-2/3"></div>
                <div className="h-6 bg-stone-100 rounded-md w-1/4"></div>
              </div>
              <div className="h-4 bg-stone-100 rounded-md w-full"></div>
              <div className="h-4 bg-stone-100 rounded-md w-5/6"></div>
              <div className="pt-4 border-t border-stone-50 flex justify-between">
                <div className="h-3 bg-stone-100 rounded-md w-1/3"></div>
                <div className="h-3 bg-stone-100 rounded-md w-1/4"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-24 bg-white rounded-4xl border border-dashed border-stone-200 shadow-sm"
      >
        <div className="bg-stone-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 border border-stone-100">
          <Search className="w-10 h-10 text-stone-300" />
        </div>
        <h3 className="text-2xl font-display font-bold text-stone-900">{emptyMessage}</h3>
        <p className="text-stone-500 mt-2 max-w-xs mx-auto font-medium">{emptySubmessage}</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-8 px-8 py-3 bg-stone-900 text-white rounded-xl font-bold hover:bg-stone-800 transition-all shadow-lg shadow-stone-200"
        >
          Refresh Page
        </button>
      </motion.div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {listings.map((listing, index) => (
        <React.Fragment key={listing.id}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            layout
          >
            <ListingCard listing={listing} />
          </motion.div>
          {(index + 1) % 10 === 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              layout
            >
              <AdCard />
            </motion.div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
};
