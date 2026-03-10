import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Listing } from '../types';
import { Zap, Tag, Heart, Star } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthProvider';

interface ListingCardProps {
  listing: Listing;
}

export const ListingCard: React.FC<ListingCardProps> = ({ listing }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isFavorite, setIsFavorite] = useState(false);
  const [sellerRating, setSellerRating] = useState<number | null>(null);

  useEffect(() => {
    if (user) {
      checkIfFavorite();
    }
    fetchSellerRating();
  }, [user, listing.id]);

  const checkIfFavorite = async () => {
    const { data } = await supabase
      .from('favorites')
      .select('*')
      .eq('user_id', user?.id)
      .eq('listing_id', listing.id)
      .single();
    
    setIsFavorite(!!data);
  };

  const toggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) {
      navigate('/login');
      return;
    }

    try {
      const response = await fetch('/api/favorites/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId: listing.id, userId: user.id })
      });
      
      if (!response.ok) throw new Error('Failed to toggle favorite');
      const { favorite } = await response.json();
      setIsFavorite(favorite);
    } catch (err) {
      console.error('Error toggling favorite:', err);
    }
  };

  const fetchSellerRating = async () => {
    const { data } = await supabase
      .from('reviews')
      .select('rating')
      .eq('seller_id', listing.seller_id);
    
    if (data && data.length > 0) {
      const avg = data.reduce((acc, r) => acc + r.rating, 0) / data.length;
      setSellerRating(avg);
    }
  };

  return (
    <Link 
      to={`/listing/${listing.id}`}
      className="group bg-white rounded-2xl border border-stone-200 overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col h-full relative"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-stone-100">
        {listing.image_url ? (
          <img 
            src={listing.image_url} 
            alt={listing.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-stone-400">
            No Image
          </div>
        )}
        
        <button
          onClick={toggleFavorite}
          className={`absolute top-3 right-3 p-2 rounded-full backdrop-blur-sm transition-all z-10 ${
            isFavorite 
              ? 'bg-crimson-600 text-white shadow-lg' 
              : 'bg-white/80 text-stone-400 hover:text-crimson-600 hover:bg-white'
          }`}
        >
          <Heart className={`w-4 h-4 ${isFavorite ? 'fill-white' : ''}`} />
        </button>

        {listing.boosted && (
          <div className="absolute top-3 left-3 px-2 py-1 bg-amber-400 text-amber-950 text-[10px] font-bold uppercase tracking-wider rounded-md flex items-center gap-1 shadow-sm">
            <Zap className="w-3 h-3 fill-amber-950" />
            Boosted
          </div>
        )}
        
        <div className="absolute bottom-3 left-3 px-2 py-1 bg-white/90 backdrop-blur-sm text-stone-700 text-[10px] font-semibold rounded-md flex items-center gap-1 shadow-sm">
          <Tag className="w-3 h-3" />
          {listing.category}
        </div>
      </div>
      
      <div className="p-4 flex flex-col flex-grow">
        <div className="flex justify-between items-start gap-2 mb-1">
          <h3 className="font-semibold text-stone-900 line-clamp-1 group-hover:text-crimson-600 transition-colors">
            {listing.title}
          </h3>
          <span className="font-bold text-crimson-600 whitespace-nowrap">
            ${listing.price}
          </span>
        </div>
        
        <div className="flex items-center gap-1 mb-3">
          {sellerRating !== null ? (
            <div className="flex items-center gap-1 text-amber-500">
              <Star className="w-3 h-3 fill-amber-500" />
              <span className="text-xs font-bold">{sellerRating.toFixed(1)}</span>
            </div>
          ) : (
            <span className="text-[10px] text-stone-400 font-medium uppercase tracking-wider">New Seller</span>
          )}
        </div>

        <p className="text-sm text-stone-500 line-clamp-2 mb-4 flex-grow">
          {listing.description}
        </p>
        
        <div className="flex items-center justify-between mt-auto pt-3 border-t border-stone-100">
          <span className="text-[10px] text-stone-400 uppercase tracking-wider font-medium">
            {formatDistanceToNow(new Date(listing.created_at), { addSuffix: true })}
          </span>
          <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">
            UA • TUSCALOOSA
          </span>
        </div>
      </div>
    </Link>
  );
};
