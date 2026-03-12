import React from 'react';
import { Listing } from '../types';
import { ListingCard } from './ListingCard';
import { AdCard } from './AdCard';
import { motion } from 'motion/react';
import { X } from 'lucide-react';

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
          <div key={i} className="bg-white rounded-2xl border border-stone-200 h-80 animate-pulse"></div>
        ))}
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-stone-300">
        <div className="bg-stone-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
          <X className="w-8 h-8 text-stone-400" />
        </div>
        <h3 className="text-xl font-semibold text-stone-900">{emptyMessage}</h3>
        <p className="text-stone-500 mt-2">{emptySubmessage}</p>
      </div>
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
