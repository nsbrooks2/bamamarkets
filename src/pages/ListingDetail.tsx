import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../components/AuthProvider';
import { Listing, User } from '../types';
import { MessageSquare, CreditCard, User as UserIcon, Tag, Calendar, ChevronLeft, Zap, AlertCircle, Heart, Star, MapPin, ChevronRight, ChevronLeft as ChevronLeftIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { formatDistanceToNow } from 'date-fns';
import { Favorite, Review } from '../types';

export const ListingDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [listing, setListing] = useState<Listing | null>(null);
  const [seller, setSeller] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' });
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    fetchListing();
    if (user && id) {
      checkIfFavorite();
    }
  }, [id, user]);

  const fetchListing = async () => {
    if (!id) return;
    setLoading(true);
    console.log('Searching for ID:', id);
    try {
      const { data, error } = await supabase
        .from('listings')
        .select('*, seller:profiles(*)')
        .eq('id', id)
        .single();

      console.log('Supabase Response:', { data, error });

      if (error) throw error;
      setListing(data);
      setSeller(data.seller);

      // Fetch reviews for the seller
      const { data: reviewsData } = await supabase
        .from('reviews')
        .select('*, reviewer:profiles(*)')
        .eq('seller_id', data.seller_id)
        .order('created_at', { ascending: false });
      
      setReviews(reviewsData || []);

      // Increment view count (non-blocking)
      supabase.rpc('increment_views', { listing_id: id }).then(({ error }) => {
        if (error) console.error('Error incrementing views:', error);
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const checkIfFavorite = async () => {
    const { data } = await supabase
      .from('favorites')
      .select('*')
      .eq('user_id', user?.id)
      .eq('listing_id', id)
      .single();
    
    setIsFavorite(!!data);
  };

  const toggleFavorite = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    try {
      const response = await fetch('/api/favorites/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId: id, userId: user.id })
      });
      
      if (!response.ok) throw new Error('Failed to toggle favorite');
      const { favorite } = await response.json();
      setIsFavorite(favorite);
    } catch (err) {
      console.error('Error toggling favorite:', err);
    }
  };

  const handleReviewSubmit = async () => {
    if (!user || !listing || !newReview.comment.trim()) return;
    setSubmittingReview(true);
    try {
      const { error } = await supabase
        .from('reviews')
        .insert({
          reviewer_id: user.id,
          seller_id: listing.seller_id,
          rating: newReview.rating,
          comment: newReview.comment.trim()
        });

      if (error) throw error;
      
      alert('Review submitted!');
      setNewReview({ rating: 5, comment: '' });
      fetchListing(); // Refresh reviews
    } catch (err: any) {
      alert('Error submitting review: ' + err.message);
    } finally {
      setSubmittingReview(false);
    }
  };

  const images = listing?.images && listing.images.length > 0 
    ? listing.images 
    : [listing?.image_url].filter(Boolean) as string[];

  const handleSendMessage = async () => {
    if (!user || !listing || !message.trim()) return;
    setSendingMessage(true);
    try {
      const response = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId: listing.id,
          senderId: user.id,
          receiverId: listing.seller_id,
          message: message.trim()
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to send message');
      }

      alert('Message sent!');
      setMessage('');
    } catch (err: any) {
      alert('Error sending message: ' + err.message);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleBuy = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    try {
      const response = await fetch('/api/payments/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId: listing?.id,
          userId: user.id
        })
      });
      
      const { url } = await response.json();
      if (url) window.location.href = url;
    } catch (err) {
      console.error('Error creating checkout session:', err);
    }
  };

  if (loading) return <div className="text-center py-20">Loading...</div>;
  if (!listing) return <div className="text-center py-20">Listing not found</div>;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-stone-500 hover:text-stone-900 transition-colors font-medium"
        >
          <ChevronLeft className="w-5 h-5" />
          Back to Listings
        </button>

        <button
          onClick={toggleFavorite}
          className={`p-3 rounded-full transition-all shadow-sm border ${
            isFavorite 
              ? 'bg-crimson-50 border-crimson-100 text-crimson-600' 
              : 'bg-white border-stone-200 text-stone-400 hover:text-crimson-600'
          }`}
        >
          <Heart className={`w-6 h-6 ${isFavorite ? 'fill-crimson-600' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Left: Image Gallery */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-6"
        >
          <div className="relative aspect-square rounded-3xl overflow-hidden bg-stone-100 border border-stone-200 shadow-lg group">
            {images.length > 0 ? (
              <>
                <img 
                  src={images[currentImageIndex]} 
                  alt={listing.title}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                
                {images.length > 1 && (
                  <>
                    <button 
                      onClick={() => setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))}
                      className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/80 backdrop-blur-sm rounded-full text-stone-900 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/80 backdrop-blur-sm rounded-full text-stone-900 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                    
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                      {images.map((_, idx) => (
                        <div 
                          key={idx}
                          className={`w-2 h-2 rounded-full transition-all ${idx === currentImageIndex ? 'bg-white w-4' : 'bg-white/50'}`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-stone-400">
                No Image
              </div>
            )}
          </div>

          {images.length > 1 && (
            <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentImageIndex(idx)}
                  className={`relative w-20 h-20 rounded-xl overflow-hidden border-2 transition-all shrink-0 ${
                    idx === currentImageIndex ? 'border-crimson-600 shadow-md' : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </button>
              ))}
            </div>
          )}

          {/* Location Section */}
          {listing.location_name && (
            <div className="p-6 bg-white rounded-2xl border border-stone-200 shadow-sm space-y-4">
              <h3 className="font-bold text-stone-900 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-crimson-600" />
                Location
              </h3>
              <div className="p-4 bg-stone-50 rounded-xl border border-stone-100 flex items-center gap-3">
                <div className="bg-white p-2 rounded-lg shadow-sm">
                  <MapPin className="w-4 h-4 text-stone-400" />
                </div>
                <p className="font-medium text-stone-700">{listing.location_name}</p>
              </div>
            </div>
          )}
        </motion.div>

        {/* Right: Info */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-8"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 bg-crimson-100 text-crimson-700 text-xs font-bold uppercase tracking-wider rounded-full flex items-center gap-1">
                <Tag className="w-3 h-3" />
                {listing.category}
              </span>
              {listing.boosted && (
                <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-bold uppercase tracking-wider rounded-full flex items-center gap-1">
                  <Zap className="w-3 h-3 fill-amber-700" />
                  Boosted
                </span>
              )}
            </div>
            
            <h1 className="text-4xl font-bold text-stone-900 leading-tight">{listing.title}</h1>
            <p className="text-3xl font-bold text-crimson-600">${listing.price}</p>
          </div>

          <div className="p-6 bg-white rounded-2xl border border-stone-200 shadow-sm space-y-4">
            <h3 className="font-bold text-stone-900 flex items-center gap-2">
              Description
            </h3>
            <p className="text-stone-600 leading-relaxed whitespace-pre-wrap">
              {listing.description}
            </p>
          </div>

          <Link to={`/profile/${listing.seller_id}`} className="flex items-center gap-4 p-4 bg-stone-100 rounded-2xl hover:bg-stone-200 transition-all group">
            <div className="bg-white p-2 rounded-xl shadow-sm overflow-hidden w-10 h-10 flex items-center justify-center">
              {seller?.avatar_url ? (
                <img src={seller.avatar_url} className="w-full h-full object-cover" alt="" />
              ) : (
                <UserIcon className="w-6 h-6 text-stone-400" />
              )}
            </div>
            <div>
              <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">Seller</p>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-stone-900 group-hover:text-crimson-600 transition-colors">
                  {seller?.full_name || seller?.email?.split('@')[0] || 'Anonymous'}
                </p>
                {seller?.username && <span className="text-xs text-stone-400 font-medium">@{seller.username}</span>}
              </div>
              <p className="text-xs text-stone-500">University of Alabama Student</p>
            </div>
            <div className="ml-auto text-right flex flex-col items-end gap-1">
              <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">Posted</p>
              <p className="text-sm text-stone-600">{formatDistanceToNow(new Date(listing.created_at), { addSuffix: true })}</p>
              <ChevronRight className="w-4 h-4 text-stone-300 group-hover:text-crimson-400 transition-colors" />
            </div>
          </Link>

          {user?.id !== listing.seller_id ? (
            <div className="space-y-4">
              <div className="flex gap-4">
                <button 
                  onClick={handleBuy}
                  className="flex-1 py-4 bg-crimson-600 text-white rounded-2xl font-bold hover:bg-crimson-700 transition-all shadow-lg shadow-crimson-200 flex items-center justify-center gap-2"
                >
                  <CreditCard className="w-5 h-5" />
                  Buy Now
                </button>
              </div>

              <div className="p-6 bg-white rounded-2xl border border-stone-200 shadow-sm space-y-4">
                <h3 className="font-bold text-stone-900 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-crimson-600" />
                  Message Seller
                </h3>
                <textarea 
                  rows={3}
                  placeholder="Is this still available? I can pick it up today."
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-crimson-400 outline-none resize-none"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
                <button 
                  onClick={handleSendMessage}
                  disabled={sendingMessage || !message.trim()}
                  className="w-full py-3 bg-stone-900 text-white rounded-xl font-bold hover:bg-stone-800 transition-all disabled:opacity-50"
                >
                  {sendingMessage ? 'Sending...' : 'Send Message'}
                </button>
              </div>
            </div>
          ) : (
            <div className="p-6 bg-crimson-50 border border-crimson-100 rounded-2xl flex items-start gap-3 text-crimson-700">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <div>
                <p className="font-bold">This is your listing</p>
                <p className="text-sm">You can manage this listing from your profile page.</p>
              </div>
            </div>
          )}
          {/* Reviews Section */}
          <div className="p-6 bg-white rounded-2xl border border-stone-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-stone-900 flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                Seller Reviews ({reviews.length})
              </h3>
              {reviews.length > 0 && (
                <div className="flex items-center gap-1 text-amber-500 font-bold">
                  <Star className="w-4 h-4 fill-amber-500" />
                  {(reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)}
                </div>
              )}
            </div>

            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 no-scrollbar">
              {reviews.length > 0 ? (
                reviews.map((review) => (
                  <div key={review.id} className="p-4 bg-stone-50 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <Link to={`/profile/${review.reviewer_id}`} className="font-bold text-sm text-stone-900 hover:text-crimson-600 transition-colors">
                        {review.reviewer?.full_name || review.reviewer?.email?.split('@')[0] || 'Anonymous'}
                      </Link>
                      <div className="flex gap-0.5">
                        {[...Array(5)].map((_, i) => (
                          <Star 
                            key={i} 
                            className={`w-3 h-3 ${i < review.rating ? 'text-amber-500 fill-amber-500' : 'text-stone-300'}`} 
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-stone-600 leading-relaxed">{review.comment}</p>
                    <p className="text-[10px] text-stone-400 uppercase tracking-wider">
                      {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-center py-8 text-stone-400 italic">No reviews yet. Be the first to review this seller!</p>
              )}
            </div>

            {user && user.id !== listing.seller_id && (
              <div className="pt-4 border-t border-stone-100 space-y-4">
                <p className="text-sm font-bold text-stone-900">Leave a Review</p>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setNewReview({ ...newReview, rating: star })}
                      className="p-1"
                    >
                      <Star 
                        className={`w-6 h-6 transition-all ${
                          star <= newReview.rating ? 'text-amber-500 fill-amber-500 scale-110' : 'text-stone-300'
                        }`} 
                      />
                    </button>
                  ))}
                </div>
                <textarea 
                  rows={2}
                  placeholder="Share your experience with this seller..."
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-crimson-400 outline-none resize-none text-sm"
                  value={newReview.comment}
                  onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                />
                <button 
                  onClick={handleReviewSubmit}
                  disabled={submittingReview || !newReview.comment.trim()}
                  className="w-full py-2 bg-stone-900 text-white rounded-xl font-bold hover:bg-stone-800 transition-all disabled:opacity-50 text-sm"
                >
                  {submittingReview ? 'Submitting...' : 'Post Review'}
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};
