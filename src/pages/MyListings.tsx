import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../components/AuthProvider';
import { Listing } from '../types';
import { Trash2, Zap, AlertCircle, ShoppingBag, PlusCircle, ExternalLink, Edit2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';

export const MyListings: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchMyListings();
  }, [user]);

  const fetchMyListings = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setListings(data || []);
    } catch (err) {
      console.error('Error fetching my listings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!user || !confirm('Are you sure you want to delete this listing?')) return;
    
    try {
      const response = await fetch('/api/listings/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, userId: user.id })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete listing');
      }

      setListings(listings.filter(l => l.id !== id));
    } catch (err: any) {
      alert('Error deleting listing: ' + err.message);
    }
  };

  const handleBoost = async (id: string) => {
    if (!user) return;
    
    try {
      const response = await fetch('/api/payments/create-boost-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId: id,
          userId: user.id
        })
      });
      
      const { url } = await response.json();
      if (url) window.location.href = url;
    } catch (err) {
      console.error('Error creating boost checkout:', err);
    }
  };

  if (!user) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold">Please log in to view your listings.</h2>
        <button 
          onClick={() => navigate('/login')}
          className="mt-4 px-6 py-2 bg-crimson-600 text-white rounded-lg"
        >
          Go to Login
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-stone-900">My Listings</h1>
          <p className="text-stone-500">Manage your active items on the marketplace.</p>
        </div>
        <Link 
          to="/create"
          className="flex items-center gap-2 px-6 py-3 bg-crimson-600 text-white rounded-xl font-bold hover:bg-crimson-700 transition-all shadow-lg shadow-crimson-200"
        >
          <PlusCircle className="w-5 h-5" />
          New Listing
        </Link>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-white rounded-2xl border border-stone-200 animate-pulse"></div>
          ))}
        </div>
      ) : listings.length > 0 ? (
        <div className="space-y-4">
          {listings.map((listing) => (
            <motion.div 
              key={listing.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm flex flex-col md:flex-row gap-6 items-center"
            >
              <div className="w-full md:w-32 aspect-square rounded-xl overflow-hidden bg-stone-100 shrink-0">
                {listing.image_url ? (
                  <img src={listing.image_url} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-stone-300">
                    <ShoppingBag className="w-8 h-8" />
                  </div>
                )}
              </div>

              <div className="flex-grow space-y-1 text-center md:text-left">
                <div className="flex flex-wrap justify-center md:justify-start items-center gap-2">
                  <h3 className="text-lg font-bold text-stone-900">{listing.title}</h3>
                  {listing.boosted && (
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold uppercase tracking-wider rounded-md flex items-center gap-1">
                      <Zap className="w-3 h-3 fill-amber-700" />
                      Boosted
                    </span>
                  )}
                </div>
                <p className="text-crimson-600 font-bold">${listing.price}</p>
                <p className="text-sm text-stone-500 line-clamp-1">{listing.description}</p>
              </div>

              <div className="flex flex-wrap justify-center gap-2 shrink-0">
                <Link 
                  to={`/listing/${listing.id}`}
                  className="p-2 text-stone-400 hover:text-stone-900 transition-colors"
                  title="View Listing"
                >
                  <ExternalLink className="w-5 h-5" />
                </Link>
                <Link 
                  to={`/edit/${listing.id}`}
                  className="p-2 text-stone-400 hover:text-stone-900 transition-colors"
                  title="Edit Listing"
                >
                  <Edit2 className="w-5 h-5" />
                </Link>
                <button 
                  onClick={() => handleBoost(listing.id)}
                  disabled={listing.boosted}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all ${
                    listing.boosted 
                      ? 'bg-stone-100 text-stone-400 cursor-not-allowed' 
                      : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                  }`}
                >
                  <Zap className={`w-4 h-4 ${listing.boosted ? 'fill-stone-400' : 'fill-amber-700'}`} />
                  {listing.boosted ? 'Boosted' : 'Boost for $2'}
                </button>
                <button 
                  onClick={() => handleDelete(listing.id)}
                  className="p-2 text-stone-400 hover:text-red-500 transition-colors"
                  title="Delete Listing"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-stone-300">
          <div className="bg-stone-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShoppingBag className="w-8 h-8 text-stone-400" />
          </div>
          <h3 className="text-xl font-semibold text-stone-900">You haven't listed anything yet</h3>
          <p className="text-stone-500 mt-2">Start selling your items to other students.</p>
          <Link 
            to="/create"
            className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-crimson-600 text-white rounded-xl font-bold hover:bg-crimson-700 transition-all"
          >
            <PlusCircle className="w-5 h-5" />
            Create Your First Listing
          </Link>
        </div>
      )}
    </div>
  );
};
