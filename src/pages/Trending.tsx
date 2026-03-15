import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Listing, UA_UNIVERSITY_ID } from '../types';
import { ListingGrid } from '../components/ListingGrid';
import { TrendingUp, Flame, Star } from 'lucide-react';
import { motion } from 'motion/react';

export const Trending: React.FC = () => {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTrendingListings();
  }, []);

  const fetchTrendingListings = async () => {
    setLoading(true);
    try {
      // Fetch listings
      let { data, error } = await supabase
        .from('listings')
        .select('*, seller:profiles(*)');

      if (error) throw error;

      // Process and sort listings
      const processedListings = (data || []).map((listing: any) => ({
        ...listing,
        favorite_count: 0
      }));

      // Trending logic: 
      // 1. Boosted listings always show up
      // 2. Filter out sold items
      // 3. Sort by: Boosted (priority), then views, then date
      const trendingListings = processedListings
        .filter(listing => !listing.sold)
        .filter(listing => listing.boosted || listing.views > 5 || listing.featured)
        .sort((a, b) => {
          // Priority 1: Featured
          if (a.featured && !b.featured) return -1;
          if (!a.featured && b.featured) return 1;

          // Priority 2: Boosted
          if (a.boosted && !b.boosted) return -1;
          if (!a.boosted && b.boosted) return 1;

          // Priority 3: Views
          if (a.views !== b.views) {
            return (b.views || 0) - (a.views || 0);
          }

          // Priority 4: Newest
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        })
        .slice(0, 24); // Limit to top 24 trending items

      setListings(trendingListings);
    } catch (error) {
      console.error('Error fetching trending listings:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4 mb-10">
        <div className="p-4 bg-amber-50 rounded-2xl">
          <TrendingUp className="w-6 h-6 text-amber-600" />
        </div>
        <div>
          <h1 className="text-4xl font-display font-bold tracking-tight text-stone-900">Trending Now</h1>
          <p className="text-stone-500 text-sm mt-1">Most popular items on campus right now.</p>
        </div>
      </div>

      <ListingGrid 
        listings={listings} 
        loading={loading} 
        emptyMessage="No trending items yet"
        emptySubmessage="Check back later for popular listings."
      />
    </div>
  );
};
