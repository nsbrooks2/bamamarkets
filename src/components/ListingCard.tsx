import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Listing } from '../types';
import { Zap, Tag, Heart, Star, Sparkles, Gift, TrendingUp, Eye, CheckCircle } from 'lucide-react';
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
      .maybeSingle();
    
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
      alert('Failed to update favorite. Please try again.');
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
      className="group bg-white rounded-3xl border border-stone-200 overflow-hidden hover:shadow-2xl hover:shadow-stone-200 transition-all duration-500 flex flex-col h-full relative"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-stone-100">
        {listing.image_url ? (
          <img 
            src={listing.image_url} 
            alt={listing.title}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-stone-300 bg-stone-50">
            <Tag className="w-8 h-8 opacity-20" />
          </div>
        )}
        
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

        <button
          onClick={toggleFavorite}
          className={`absolute top-4 right-4 p-2.5 rounded-full backdrop-blur-md transition-all z-10 ${
            isFavorite 
              ? 'bg-crimson-600 text-white shadow-lg scale-110' 
              : 'bg-white/90 text-stone-400 hover:text-crimson-600 hover:bg-white hover:scale-110 shadow-sm'
          }`}
        >
          <Heart className={`w-4 h-4 ${isFavorite ? 'fill-white' : ''}`} />
        </button>

        {listing.sold && (
          <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-[2px] z-20 flex items-center justify-center">
            <div className="px-6 py-2 bg-white text-stone-900 text-xs font-black uppercase tracking-[0.2em] rounded-full shadow-2xl">
              Sold
            </div>
          </div>
        )}

        <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
          {listing.featured && (
            <div className="px-2.5 py-1 bg-crimson-600 text-white text-[10px] font-bold uppercase tracking-wider rounded-lg flex items-center gap-1.5 shadow-lg">
              <Sparkles className="w-3 h-3 fill-white" />
              Featured
            </div>
          )}

          {listing.boosted && !listing.featured && (
            <div className="px-2.5 py-1 bg-amber-400 text-amber-950 text-[10px] font-bold uppercase tracking-wider rounded-lg flex items-center gap-1.5 shadow-md">
              <Zap className="w-3 h-3 fill-amber-950" />
              Boosted
            </div>
          )}

          {((listing.favorite_count && listing.favorite_count >= 5) || listing.views > 50) && !listing.featured && !listing.boosted && (
            <div className="px-2.5 py-1 bg-orange-500 text-white text-[10px] font-bold uppercase tracking-wider rounded-lg flex items-center gap-1.5 shadow-md">
              <TrendingUp className="w-3 h-3" />
              Trending
            </div>
          )}
        </div>
        
        <div className="absolute bottom-4 left-4 px-2.5 py-1 bg-white/95 backdrop-blur-sm text-stone-900 text-[10px] font-bold rounded-lg flex items-center gap-1.5 shadow-sm border border-stone-100">
          <Tag className="w-3 h-3 text-crimson-600" />
          {listing.category}
        </div>
      </div>
      
      <div className="p-5 flex flex-col flex-grow space-y-3">
        <div className="space-y-1">
          <div className="flex justify-between items-start gap-4">
            <h3 className="font-display font-bold text-stone-900 text-lg leading-tight line-clamp-1 group-hover:text-crimson-600 transition-colors">
              {listing.title}
            </h3>
            <span className="font-display font-black text-crimson-600 text-lg">
              {listing.price === 0 ? 'FREE' : `$${listing.price}`}
            </span>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            {sellerRating !== null ? (
              <div className="flex items-center gap-1 text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-100">
                <Star className="w-3 h-3 fill-amber-500" />
                <span className="text-[10px] font-black">{sellerRating.toFixed(1)}</span>
              </div>
            ) : (
              <span className="text-[9px] text-stone-400 font-bold uppercase tracking-widest bg-stone-50 px-1.5 py-0.5 rounded-md border border-stone-100">New Seller</span>
            )}
            {listing.seller?.verified_student && (
              <div className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 text-blue-600 text-[9px] font-bold rounded-md uppercase tracking-widest border border-blue-100">
                <CheckCircle className="w-2.5 h-2.5" />
                Verified
              </div>
            )}
            {listing.size && (
              <span className="px-1.5 py-0.5 bg-stone-100 text-stone-600 text-[9px] font-bold rounded-md uppercase tracking-widest border border-stone-200">
                {listing.size}
              </span>
            )}
          </div>
        </div>

        <p className="text-sm text-stone-500 line-clamp-2 leading-relaxed flex-grow">
          {listing.description}
        </p>
        
        <div className="flex items-center justify-between pt-4 border-t border-stone-100">
          <div className="flex items-center gap-4">
            <span className="text-[10px] text-stone-400 uppercase tracking-widest font-bold">
              {formatDistanceToNow(new Date(listing.created_at), { addSuffix: true })}
            </span>
            <div className="flex items-center gap-1 text-stone-400">
              <Eye className="w-3.5 h-3.5" />
              <span className="text-[10px] font-black">{listing.views || 0}</span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-stone-300">
            <span className="text-[9px] font-black uppercase tracking-[0.2em]">
              UA • TUSC
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
};
