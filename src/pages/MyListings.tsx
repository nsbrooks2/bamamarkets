import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../components/AuthProvider';
import { Listing } from '../types';
import { Trash2, Zap, ShoppingBag, PlusCircle, ExternalLink, Edit2, X, CheckCircle2, Sparkles, CreditCard } from 'lucide-react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';

export const MyListings: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [boostingListing, setBoostingListing] = useState<Listing | null>(null);
  const [featuringListing, setFeaturingListing] = useState<Listing | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [deleteStatus, setDeleteStatus] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [markingSoldListing, setMarkingSoldListing] = useState<Listing | null>(null);
  const [potentialBuyers, setPotentialBuyers] = useState<any[]>([]);
  const [loadingBuyers, setLoadingBuyers] = useState(false);

  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (user) fetchMyListings();
    
    // Handle success messages from Stripe
    const success = searchParams.get('success');
    if (success) {
      // Trigger a manual sync to ensure the listing is updated even if webhooks failed
      syncPayments(true);
      
      if (success === 'boost') {
        setDeleteStatus('Listing boosted successfully! It will now appear higher in the feed.');
        setTimeout(() => setDeleteStatus(null), 5000);
      } else if (success === 'feature') {
        setDeleteStatus('Listing featured successfully! It is now in the premium section.');
        setTimeout(() => setDeleteStatus(null), 5000);
      }
    }
  }, [user, searchParams]);

  const syncPayments = async (silent = false) => {
    if (!silent) setIsSyncing(true);
    try {
      const response = await fetch('/api/payments/sync', { method: 'POST' });
      if (response.ok) {
        const data = await response.json();
        if (data.syncedCount > 0) {
          console.log(`[PAYMENT] Synced ${data.syncedCount} missing payments`);
          fetchMyListings(); // Refresh to show updated status
          if (!silent) setDeleteStatus(`Successfully synced ${data.syncedCount} payments!`);
        } else if (!silent) {
          setDeleteStatus('All payments are up to date.');
        }
      }
    } catch (err) {
      console.error('Error syncing payments:', err);
      if (!silent) alert('Failed to sync payments. Please try again.');
    } finally {
      if (!silent) {
        setIsSyncing(false);
        setTimeout(() => setDeleteStatus(null), 3000);
      }
    }
  };

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
    setConfirmDeleteId(id);
  };

  const executeDelete = async (id: string) => {
    setConfirmDeleteId(null);
    setDeleteStatus('Deleting listing...');
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch('/api/listings/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, userId: user?.id }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      
      const result = await response.json();

      if (!response.ok) {
        setDeleteStatus(`Error: ${result.error || 'Unknown error'}`);
        alert('Delete failed: ' + (result.error || 'Unknown error'));
        return;
      }

      setDeleteStatus('Listing deleted successfully');
      setListings(prev => prev.filter(l => l.id !== id));
      setTimeout(() => setDeleteStatus(null), 3000);
    } catch (err: any) {
      clearTimeout(timeoutId);
      const errorMessage = err.name === 'AbortError' ? 'Request timed out' : err.message;
      console.error('Delete error:', err);
      setDeleteStatus(`System Error: ${errorMessage}`);
      alert('System Error: ' + errorMessage);
    }
  };
  

  const handleBoost = async () => {
    if (!user || !boostingListing) return;
    
    setIsProcessing(true);
    try {
      const response = await fetch('/api/payments/create-boost-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId: boostingListing.id,
          userId: user.id
        })
      });
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        throw new Error(`Server returned non-JSON response: ${text.slice(0, 100)}`);
      }

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to create checkout session');
      
      if (data.url) {
        // Stripe Checkout cannot be loaded in an iframe. 
        // We must open it in a new tab.
        const newWindow = window.open(data.url, '_blank');
        if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
          // Popup was blocked, fallback to current window
          window.location.href = data.url;
        }
      } else {
        throw new Error('No checkout URL returned from server');
      }
    } catch (err: any) {
      console.error('Error boosting listing:', err);
      alert('Payment Error: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFeature = async () => {
    if (!user || !featuringListing) return;
    
    setIsProcessing(true);
    try {
      const response = await fetch('/api/payments/create-feature-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId: featuringListing.id,
          userId: user.id
        })
      });
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        throw new Error(`Server returned non-JSON response: ${text.slice(0, 100)}`);
      }

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to create checkout session');
      
      if (data.url) {
        // Stripe Checkout cannot be loaded in an iframe. 
        // We must open it in a new tab.
        const newWindow = window.open(data.url, '_blank');
        if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
          // Popup was blocked, fallback to current window
          window.location.href = data.url;
        }
      } else {
        throw new Error('No checkout URL returned from server');
      }
    } catch (err: any) {
      console.error('Error featuring listing:', err);
      alert('Payment Error: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const fetchPotentialBuyers = async (listingId: string) => {
    setLoadingBuyers(true);
    try {
      // Get all unique senders who messaged about this listing
      const { data, error } = await supabase
        .from('messages')
        .select('sender_id, profiles!messages_sender_id_fkey(id, full_name, avatar_url)')
        .eq('listing_id', listingId)
        .eq('receiver_id', user?.id);

      if (error) throw error;

      // Filter unique buyers
      const uniqueBuyers = Array.from(new Map(data.map(item => [item.sender_id, item.profiles])).values());
      setPotentialBuyers(uniqueBuyers);
    } catch (err) {
      console.error('Error fetching potential buyers:', err);
    } finally {
      setLoadingBuyers(false);
    }
  };

  const handleMarkAsSold = async (buyerId: string) => {
    if (!markingSoldListing || !user) return;
    setIsProcessing(true);
    try {
      // Create transaction
      const { error: transError } = await supabase
        .from('transactions')
        .insert({
          listing_id: markingSoldListing.id,
          buyer_id: buyerId,
          seller_id: user.id,
          sale_price: markingSoldListing.price,
          platform_fee: 0, // Manual sale
          university_id: markingSoldListing.university_id
        });

      if (transError) throw transError;

      // Update listing status
      const { error: updateError } = await supabase
        .from('listings')
        .update({ sold: true })
        .eq('id', markingSoldListing.id);

      if (updateError) throw updateError;

      // Notify buyer
      await supabase.from('notifications').insert({
        user_id: buyerId,
        type: 'system',
        content: `The seller marked "${markingSoldListing.title}" as sold to you. You can now leave a review!`,
        link: `/listing/${markingSoldListing.id}`,
        read: false
      });

      setDeleteStatus('Listing marked as sold!');
      setListings(prev => prev.map(l => l.id === markingSoldListing.id ? { ...l, sold: true } : l));
      setMarkingSoldListing(null);
      setTimeout(() => setDeleteStatus(null), 3000);
    } catch (err: any) {
      alert('Error marking as sold: ' + err.message);
    } finally {
      setIsProcessing(false);
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-stone-900">My Listings</h1>
          <p className="text-stone-500">Manage your active items on the marketplace.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => syncPayments()}
            disabled={isSyncing}
            className="flex items-center gap-2 px-4 py-3 bg-white border border-stone-200 text-stone-600 rounded-xl font-bold hover:bg-stone-50 transition-all disabled:opacity-50"
          >
            <CreditCard className={`w-5 h-5 ${isSyncing ? 'animate-pulse' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Refresh Payments'}
          </button>
          <Link 
            to="/create"
            className="flex items-center gap-2 px-6 py-3 bg-crimson-600 text-white rounded-xl font-bold hover:bg-crimson-700 transition-all shadow-lg shadow-crimson-200"
          >
            <PlusCircle className="w-5 h-5" />
            New Listing
          </Link>
        </div>
      </div>

      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center"
          >
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-stone-900 mb-2">Delete Listing?</h3>
            <p className="text-stone-500 mb-8">This action cannot be undone. Are you sure you want to remove this item?</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 px-6 py-3 bg-stone-100 text-stone-600 rounded-xl font-bold hover:bg-stone-200 transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={() => executeDelete(confirmDeleteId)}
                className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-200"
              >
                Delete
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {deleteStatus && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3 animate-pulse">
          <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
          <p className="text-sm font-medium text-amber-800">{deleteStatus}</p>
        </div>
      )}

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
                  {listing.featured && (
                    <span className="px-2 py-0.5 bg-crimson-100 text-crimson-700 text-[10px] font-bold uppercase tracking-wider rounded-md flex items-center gap-1">
                      <Sparkles className="w-3 h-3 fill-crimson-700" />
                      Featured
                    </span>
                  )}
                  {listing.boosted && (
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold uppercase tracking-wider rounded-md flex items-center gap-1">
                      <Zap className="w-3 h-3 fill-amber-700" />
                      Boosted
                    </span>
                  )}
                </div>
                <p className="text-crimson-600 font-bold">{listing.price === 0 ? 'FREE' : `$${listing.price}`}</p>
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
                
                <div className="flex flex-col gap-2">
                  <button 
                    onClick={() => {
                      setMarkingSoldListing(listing);
                      fetchPotentialBuyers(listing.id);
                    }}
                    disabled={listing.sold}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all text-xs ${
                      listing.sold 
                        ? 'bg-green-100 text-green-700 cursor-default' 
                        : 'bg-stone-900 text-white hover:bg-stone-800'
                    }`}
                  >
                    <CheckCircle2 className={`w-3.5 h-3.5 ${listing.sold ? 'text-green-700' : 'text-white'}`} />
                    {listing.sold ? 'Sold' : 'Mark as Sold'}
                  </button>
                  <button 
                    onClick={() => setFeaturingListing(listing)}
                    disabled={listing.featured || listing.sold}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all text-xs ${
                      listing.featured || listing.sold
                        ? 'bg-stone-100 text-stone-400 cursor-not-allowed' 
                        : 'bg-crimson-50 text-crimson-600 hover:bg-crimson-100'
                    }`}
                  >
                    <Sparkles className={`w-3.5 h-3.5 ${listing.featured ? 'fill-stone-400' : 'fill-crimson-600'}`} />
                    {listing.featured ? 'Featured' : 'Feature ($5)'}
                  </button>
                  <button 
                    onClick={() => setBoostingListing(listing)}
                    disabled={listing.boosted || listing.sold}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all text-xs ${
                      listing.boosted || listing.sold
                        ? 'bg-stone-100 text-stone-400 cursor-not-allowed' 
                        : 'bg-amber-50 text-amber-700 hover:bg-amber-200'
                    }`}
                  >
                    <Zap className={`w-3.5 h-3.5 ${listing.boosted ? 'fill-stone-400' : 'fill-amber-700'}`} />
                    {listing.boosted ? 'Boosted' : 'Boost ($1)'}
                  </button>
                </div>

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

      {/* Feature Modal */}
      {featuringListing && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl relative"
          >
            <button 
              onClick={() => setFeaturingListing(null)}
              className="absolute top-4 right-4 p-2 text-stone-400 hover:text-stone-900 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="bg-crimson-100 w-16 h-16 rounded-2xl flex items-center justify-center mb-6">
              <Sparkles className="w-8 h-8 text-crimson-600 fill-crimson-600" />
            </div>

            <h2 className="text-2xl font-bold text-stone-900 mb-2">Feature Your Listing</h2>
            <p className="text-stone-500 mb-6">
              Featured listings appear in a special section at the very top of the home page for 24 hours. 
              This is the best way to get maximum exposure for your item!
            </p>

            <div className="bg-stone-50 p-4 rounded-2xl border border-stone-100 mb-8">
              <div className="flex justify-between items-center">
                <span className="text-stone-600 font-medium">24h Featured Fee</span>
                <span className="text-xl font-bold text-stone-900">$5.00</span>
              </div>
            </div>

            <button 
              onClick={handleFeature}
              disabled={isProcessing}
              className="w-full py-4 bg-crimson-600 text-white rounded-xl font-bold hover:bg-crimson-700 transition-all shadow-lg shadow-crimson-200 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isProcessing ? 'Processing...' : 'Confirm & Pay (New Tab)'}
              <CreditCard className="w-5 h-5" />
            </button>
            
            <p className="text-center text-xs text-stone-400 mt-4">
              By confirming, you agree to the $5.00 featured fee.
            </p>
          </motion.div>
        </div>
      )}
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
                <span className="text-xl font-bold text-stone-900">$1.00</span>
              </div>
            </div>

            <button 
              onClick={handleBoost}
              disabled={isProcessing}
              className="w-full py-4 bg-crimson-600 text-white rounded-xl font-bold hover:bg-crimson-700 transition-all shadow-lg shadow-crimson-200 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isProcessing ? 'Processing...' : 'Confirm & Pay (New Tab)'}
              <CreditCard className="w-5 h-5" />
            </button>
            
            <p className="text-center text-xs text-stone-400 mt-4">
              By confirming, you agree to the $1.00 boost fee.
            </p>
          </motion.div>
        </div>
      )}

      {/* Mark as Sold Modal */}
      {markingSoldListing && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl relative"
          >
            <button 
              onClick={() => setMarkingSoldListing(null)}
              className="absolute top-4 right-4 p-2 text-stone-400 hover:text-stone-900 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="bg-stone-900 w-16 h-16 rounded-2xl flex items-center justify-center mb-6">
              <CheckCircle2 className="w-8 h-8 text-white" />
            </div>

            <h2 className="text-2xl font-bold text-stone-900 mb-2">Who bought this?</h2>
            <p className="text-stone-500 mb-6">
              Select the student who purchased this item. This allows them to leave you a review and helps build your reputation!
            </p>

            <div className="space-y-3 max-h-60 overflow-y-auto mb-8 pr-2 custom-scrollbar">
              {loadingBuyers ? (
                <div className="text-center py-4 text-stone-400">Loading potential buyers...</div>
              ) : potentialBuyers.length > 0 ? (
                potentialBuyers.map((buyer) => (
                  <button
                    key={buyer.id}
                    onClick={() => handleMarkAsSold(buyer.id)}
                    disabled={isProcessing}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-stone-100 hover:border-crimson-200 hover:bg-crimson-50 transition-all group"
                  >
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-stone-100">
                      {buyer.avatar_url ? (
                        <img src={buyer.avatar_url} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-stone-400 font-bold">
                          {buyer.full_name?.[0] || '?'}
                        </div>
                      )}
                    </div>
                    <div className="flex-grow text-left">
                      <p className="font-bold text-stone-900 group-hover:text-crimson-700 transition-colors">
                        {buyer.full_name}
                      </p>
                    </div>
                    <CheckCircle2 className="w-5 h-5 text-stone-200 group-hover:text-crimson-500 transition-colors" />
                  </button>
                ))
              ) : (
                <div className="text-center py-8 bg-stone-50 rounded-2xl border border-dashed border-stone-200">
                  <p className="text-sm text-stone-500">No messages found for this listing yet.</p>
                  <p className="text-xs text-stone-400 mt-1">Buyers must message you first to be selected.</p>
                </div>
              )}
            </div>

            <button 
              onClick={() => setMarkingSoldListing(null)}
              className="w-full py-3 text-stone-500 font-bold hover:text-stone-900 transition-all"
            >
              Cancel
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
};
