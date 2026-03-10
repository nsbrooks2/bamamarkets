import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../components/AuthProvider';
import { Listing } from '../types';
import { Trash2, Zap, AlertCircle, ShoppingBag, PlusCircle, ExternalLink, Edit2, X, CheckCircle2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';

export const MyListings: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [boostingListing, setBoostingListing] = useState<Listing | null>(null);
  const [isBoosting, setIsBoosting] = useState(false);

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
    if (!user) return;
    
    const firstConfirm = window.confirm('Are you sure you want to delete this listing?');
    if (!firstConfirm) return;

    const secondConfirm = window.confirm('This action cannot be undone. Final warning: Delete?');
    if (!secondConfirm) return;
    
    try {
      const { error } = await supabase
        .from('listings')
        .delete()
        .eq('id', id)
        .eq('seller_id', user.id);

      if (error) throw error;

      // Force refresh the page to ensure the list is updated
      window.location.reload();
    } catch (err: any) {
      console.error('Error deleting listing:', err);
      alert('Error deleting listing: ' + err.message);
    }
  };

  const handleBoost = async () => {
    if (!user || !boostingListing) return;
    
    setIsBoosting(true);
    try {
      const { error } = await supabase
        .from('listings')
        .update({ boosted: true })
        .eq('id', boostingListing.id);

      if (error) throw error;
      
      setListings(listings.map(l => l.id === boostingListing.id ? { ...l, boosted: true } : l));
      setBoostingListing(null);
    } catch (err) {
      console.error('Error boosting listing:', err);
      alert('Failed to boost listing');
    } finally {
      setIsBoosting(false);
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
                  onClick={() => setBoostingListing(listing)}
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

      {/* Boost Modal */}
      {boostingListing && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl relative"
          >
            <button 
              onClick={() => setBoostingListing(null)}
              className="absolute top-4 right-4 p-2 text-stone-400 hover:text-stone-900 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="bg-amber-100 w-16 h-16 rounded-2xl flex items-center justify-center mb-6">
              <Zap className="w-8 h-8 text-amber-600 fill-amber-600" />
            </div>

            <h2 className="text-2xl font-bold text-stone-900 mb-2">Boost Your Listing</h2>
            <p className="text-stone-500 mb-6">
              Boosting your listing puts it at the very top of the home page for all students to see. 
              This increases visibility and helps you sell faster!
            </p>

            <div className="bg-stone-50 p-4 rounded-2xl border border-stone-100 mb-8">
              <div className="flex justify-between items-center">
                <span className="text-stone-600 font-medium">One-time Boost Fee</span>
                <span className="text-xl font-bold text-stone-900">$2.00</span>
              </div>
            </div>

            <button 
              onClick={handleBoost}
              disabled={isBoosting}
              className="w-full py-4 bg-crimson-600 text-white rounded-xl font-bold hover:bg-crimson-700 transition-all shadow-lg shadow-crimson-200 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isBoosting ? 'Processing...' : 'Confirm Boost'}
              <CheckCircle2 className="w-5 h-5" />
            </button>
            
            <p className="text-center text-xs text-stone-400 mt-4">
              By confirming, you agree to the $2.00 boost fee.
            </p>
          </motion.div>
        </div>
      )}
    </div>
  );
};
