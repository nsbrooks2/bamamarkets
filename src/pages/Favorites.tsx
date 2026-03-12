import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../components/AuthProvider';
import { Listing, Favorite } from '../types';
import { ListingGrid } from '../components/ListingGrid';
import { Heart, ShoppingBag } from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';

export const Favorites: React.FC = () => {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchFavorites();
    }
  }, [user]);

  const fetchFavorites = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('favorites')
        .select('*, listing:listings(*)')
        .eq('user_id', user?.id);

      if (error) throw error;
      
      const favoriteListings = (data || [])
        .map((f: any) => f.listing)
        .filter(Boolean);
        
      setFavorites(favoriteListings);
    } catch (error) {
      console.error('Error fetching favorites:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="text-center py-20">
        <Heart className="w-16 h-16 text-stone-200 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-stone-900">Please log in to see your favorites.</h2>
        <Link 
          to="/login"
          className="mt-4 inline-block px-6 py-2 bg-crimson-600 text-white rounded-lg font-bold"
        >
          Go to Login
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <div className="bg-crimson-100 p-3 rounded-2xl">
          <Heart className="w-6 h-6 text-crimson-600 fill-crimson-600" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-stone-900">My Favorites</h1>
          <p className="text-stone-500">Items you've saved for later.</p>
        </div>
      </div>

      <ListingGrid 
        listings={favorites} 
        loading={loading} 
        emptyMessage="No favorites yet"
        emptySubmessage="Heart items you like to save them here."
      />

      {!loading && favorites.length === 0 && (
        <div className="text-center py-12">
          <Link 
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-stone-900 text-white rounded-xl font-bold hover:bg-stone-800 transition-all"
          >
            <ShoppingBag className="w-5 h-5" />
            Browse Listings
          </Link>
        </div>
      )}
    </div>
  );
};
