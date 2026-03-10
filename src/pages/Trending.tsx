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
      // Trending logic: Boosted first, then by views, then by date
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('university_id', UA_UNIVERSITY_ID)
        .order('boosted', { ascending: false })
        .order('views', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setListings(data || []);
    } catch (error) {
      console.error('Error fetching trending listings:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-amber-100 rounded-2xl">
          <TrendingUp className="w-6 h-6 text-amber-600" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-stone-900">Trending Now</h1>
          <p className="text-stone-500">Most popular items on campus right now.</p>
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
