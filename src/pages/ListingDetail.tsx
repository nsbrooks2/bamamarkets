import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../components/AuthProvider';
import { Listing, User } from '../types';
import { MessageSquare, CreditCard, User as UserIcon, Tag, Calendar, ChevronLeft, Zap, AlertCircle, Heart, Star, MapPin, ChevronRight, ChevronLeft as ChevronLeftIcon, Copy, Check, DollarSign, CheckCircle2, Eye, CheckCircle } from 'lucide-react';
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
  const [messageSent, setMessageSent] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [canReview, setCanReview] = useState(false);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  useEffect(() => {
    fetchListing();
  }, [id]);

  useEffect(() => {
    if (user && id) {
      checkIfFavorite();
    }
  }, [id, user]);

  useEffect(() => {
    if (id) {
      // Increment view count (non-blocking)
      supabase.rpc('increment_views', { listing_id: id }).then(({ error }) => {
        if (error) console.error('Error incrementing views:', error);
      });
    }
  }, [id]);

  const fetchListing = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('listings')
        .select('*, seller:profiles(*)')
        .eq('id', id)
        .single();

      if (error) throw error;
      setListing(data);
      setSeller(data.seller);

      // Fetch reviews for the seller
      console.log('Fetching reviews for seller:', data.seller_id);
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('reviews')
        .select('*, reviewer:profiles!reviewer_id(*)')
        .eq('seller_id', data.seller_id)
        .order('created_at', { ascending: false });
      
      if (reviewsError) {
        console.error('Error fetching reviews:', reviewsError);
        // Try without join if it fails
        const { data: simpleReviews } = await supabase
          .from('reviews')
          .select('*')
          .eq('seller_id', data.seller_id)
          .order('created_at', { ascending: false });
        if (simpleReviews) setReviews(simpleReviews);
      } else {
        console.log('Fetched reviews:', reviewsData);
        setReviews(reviewsData || []);
      }

      // Check if user can review
      if (user && data.seller_id !== user.id) {
        const { data: transaction } = await supabase
          .from('transactions')
          .select('id')
          .eq('listing_id', id)
          .eq('buyer_id', user.id)
          .maybeSingle();
        
        const { data: existingReview } = await supabase
          .from('reviews')
          .select('id')
          .eq('listing_id', id)
          .eq('reviewer_id', user.id)
          .maybeSingle();

        console.log('Review check:', { 
          hasTransaction: !!transaction, 
          hasExistingReview: !!existingReview, 
          userId: user.id, 
          listingId: id 
        });

        setCanReview(!!transaction && !existingReview);
      }
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
      .maybeSingle();
    
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
      alert('Failed to update favorite. Please try again.');
    }
  };

  const handleReviewSubmit = async () => {
    if (!user || !listing || !canReview) return;
    setSubmittingReview(true);
    try {
      const response = await fetch('/api/reviews/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sellerId: listing.seller_id,
          reviewerId: user.id,
          listingId: listing.id,
          rating: newReview.rating,
          comment: newReview.comment.trim() || ""
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit review');
      }
      
      alert('Review submitted successfully!');
      setNewReview({ rating: 5, comment: '' });
      setCanReview(false); // Disable after submission
      
      // Refresh reviews
      const { data: reviewsData } = await supabase
        .schema('public')
        .from('reviews')
        .select('*, reviewer:profiles(*)')
        .eq('seller_id', listing.seller_id)
        .order('created_at', { ascending: false });
      
      setReviews(reviewsData || []);
      fetchListing(); // Refresh reviews
    } catch (err: any) {
      console.error('Error submitting review:', err);
      setError(err.message);
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

      setMessage('');
      setMessageSent(true);
      setTimeout(() => {
        navigate(`/messages?listingId=${listing.id}&userId=${listing.seller_id}`);
      }, 1500);
    } catch (err: any) {
      alert('Error sending message: ' + err.message);
    } finally {
      setSendingMessage(false);
    }
  };

  if (loading) return <div className="text-center py-20">Loading...</div>;
  if (!listing) return <div className="text-center py-20">Listing not found</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-8">
      <div className="flex items-center justify-between mb-6 md:mb-10">
        <button 
          onClick={() => navigate(-1)}
          className="group flex items-center gap-3 text-stone-400 hover:text-stone-900 transition-all font-black uppercase tracking-widest text-[9px] md:text-[10px]"
        >
          <div className="p-1.5 md:p-2 bg-white rounded-full border border-stone-100 group-hover:border-stone-200 shadow-sm">
            <ChevronLeft className="w-3.5 h-3.5 md:w-4 h-4" />
          </div>
          Back to Market
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleFavorite}
            className={`p-3.5 rounded-full transition-all shadow-lg border ${
              isFavorite 
                ? 'bg-crimson-50 border-crimson-100 text-crimson-600 shadow-crimson-100' 
                : 'bg-white border-stone-100 text-stone-300 hover:text-crimson-600 hover:border-crimson-100'
            }`}
          >
            <Heart className={`w-5 h-5 ${isFavorite ? 'fill-crimson-600' : ''}`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16">
        {/* Left: Image Gallery (7 cols) */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-7 space-y-4 md:space-y-8"
        >
          <div className="relative aspect-[4/5] rounded-[1.5rem] md:rounded-[2rem] overflow-hidden bg-stone-50 border border-stone-100 shadow-2xl group">
            {images.length > 0 ? (
              <>
                <motion.img 
                  key={currentImageIndex}
                  initial={{ opacity: 0, scale: 1.1 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
                  src={images[currentImageIndex]} 
                  alt={listing.title}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />

                {images.length > 1 && (
                  <>
                    <button 
                      onClick={() => setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))}
                      className="absolute left-6 top-1/2 -translate-y-1/2 p-4 bg-white/90 backdrop-blur-md rounded-full text-stone-900 opacity-0 group-hover:opacity-100 transition-all hover:scale-110 shadow-xl"
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                    <button 
                      onClick={() => setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))}
                      className="absolute right-6 top-1/2 -translate-y-1/2 p-4 bg-white/90 backdrop-blur-md rounded-full text-stone-900 opacity-0 group-hover:opacity-100 transition-all hover:scale-110 shadow-xl"
                    >
                      <ChevronRight className="w-6 h-6" />
                    </button>
                    
                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
                      {images.map((_, idx) => (
                        <button 
                          key={idx}
                          onClick={() => setCurrentImageIndex(idx)}
                          className={`h-1.5 rounded-full transition-all duration-500 ${idx === currentImageIndex ? 'bg-white w-8' : 'bg-white/40 w-2'}`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-stone-300 gap-4">
                <Eye className="w-12 h-12 opacity-20" />
                <span className="font-black uppercase tracking-[0.2em] text-xs">No Visuals Available</span>
              </div>
            )}
          </div>

          {images.length > 1 && (
            <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar px-2">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentImageIndex(idx)}
                  className={`relative w-24 h-24 rounded-2xl overflow-hidden border-2 transition-all shrink-0 shadow-sm ${
                    idx === currentImageIndex ? 'border-crimson-600 scale-105 shadow-crimson-100' : 'border-transparent opacity-40 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </button>
              ))}
            </div>
          )}
        </motion.div>

        {/* Right: Info (5 cols) */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-5 space-y-8 md:space-y-12"
        >
          <div className="space-y-4 md:space-y-6">
            <div className="flex flex-wrap items-center gap-2 md:gap-3">
              {listing.sold && (
                <span className="px-3 md:px-4 py-1 md:py-1.5 bg-stone-900 text-white text-[9px] md:text-[10px] font-black uppercase tracking-[0.15em] rounded-full flex items-center gap-1.5 md:gap-2">
                  <CheckCircle2 className="w-3 md:w-3.5 h-3 md:w-3.5" />
                  Sold Out
                </span>
              )}
              <span className="px-3 md:px-4 py-1 md:py-1.5 bg-crimson-50 text-crimson-600 text-[9px] md:text-[10px] font-black uppercase tracking-[0.15em] rounded-full flex items-center gap-1.5 md:gap-2 border border-crimson-100">
                <Tag className="w-3 md:w-3.5 h-3 md:w-3.5" />
                {listing.category}
              </span>
              {listing.boosted && (
                <span className="px-3 md:px-4 py-1 md:py-1.5 bg-amber-50 text-amber-600 text-[9px] md:text-[10px] font-black uppercase tracking-[0.15em] rounded-full flex items-center gap-1.5 md:gap-2 border border-amber-100">
                  <Zap className="w-3 md:w-3.5 h-3 md:w-3.5 fill-amber-600" />
                  Premium
                </span>
              )}
            </div>
            
            <div className="space-y-1 md:space-y-2">
              <h1 className="text-4xl md:text-5xl font-display font-black text-stone-900 leading-[0.9] tracking-tight">{listing.title}</h1>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl md:text-4xl font-display font-black text-crimson-600">${listing.price}</span>
                <span className="text-stone-400 font-bold uppercase tracking-widest text-[9px] md:text-[10px]">USD</span>
              </div>
            </div>
          </div>

          <div className="space-y-4 md:space-y-6">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3 md:pb-4">
              <h3 className="font-black text-stone-900 uppercase tracking-[0.2em] text-[10px] md:text-xs">The Narrative</h3>
              <div className="flex items-center gap-3 md:gap-4 text-stone-400">
                <div className="flex items-center gap-1.5">
                  <Eye className="w-3 md:w-3.5 h-3 md:w-3.5" />
                  <span className="text-[9px] md:text-[10px] font-bold uppercase">{listing.views || 0}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3 md:w-3.5 h-3 md:w-3.5" />
                  <span className="text-[9px] md:text-[10px] font-bold uppercase">{formatDistanceToNow(new Date(listing.created_at), { addSuffix: false })}</span>
                </div>
              </div>
            </div>
            <p className="text-stone-500 leading-relaxed text-base md:text-lg font-medium">
              {listing.description}
            </p>
          </div>

          {/* Seller Profile Card */}
          <Link to={`/profile/${listing.seller_id}`} className="block group">
            <div className="p-6 bg-stone-50 rounded-[2rem] border border-stone-100 group-hover:bg-stone-100 transition-all duration-500">
              <div className="flex items-center gap-5">
                <div className="relative">
                  <div className="w-16 h-16 bg-white rounded-2xl overflow-hidden border border-stone-200 shadow-sm flex items-center justify-center p-1 group-hover:rotate-6 transition-transform">
                    {seller?.avatar_url ? (
                      <img src={seller.avatar_url} className="w-full h-full object-cover rounded-xl" alt="" />
                    ) : (
                      <UserIcon className="w-8 h-8 text-stone-200" />
                    )}
                  </div>
                  {seller?.verified_student && (
                    <div className="absolute -top-2 -right-2 bg-blue-600 text-white p-1 rounded-full border-2 border-white shadow-lg">
                      <CheckCircle className="w-3 h-3" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] mb-1">Curated By</p>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xl font-display font-black text-stone-900">
                      {seller?.full_name || seller?.email?.split('@')[0] || 'Anonymous'}
                    </h4>
                  </div>
                  <p className="text-xs font-bold text-stone-500 uppercase tracking-widest">University of Alabama</p>
                </div>
                <ChevronRight className="w-6 h-6 text-stone-300 group-hover:text-crimson-600 group-hover:translate-x-2 transition-all" />
              </div>
            </div>
          </Link>

          {user?.id !== listing.seller_id ? (
            <div className="space-y-8">
              {/* Payment Handles - Minimalist Grid */}
              <div className="grid grid-cols-2 gap-4">
                {[
                  { id: 'venmo', label: 'Venmo', value: seller?.venmo_username, color: 'bg-blue-50 text-blue-600' },
                  { id: 'cashapp', label: 'Cash App', value: seller?.cashapp_username, color: 'bg-emerald-50 text-emerald-600' },
                  { id: 'paypal', label: 'PayPal', value: seller?.paypal_username, color: 'bg-indigo-50 text-indigo-600' },
                  { id: 'zelle', label: 'Zelle', value: seller?.zelle_email, color: 'bg-purple-50 text-purple-600' },
                ].filter(p => p.value).map((p) => (
                  <button 
                    key={p.id}
                    onClick={() => copyToClipboard(p.value!, p.id)}
                    className="flex flex-col items-start p-4 bg-white border border-stone-100 rounded-2xl hover:border-stone-200 hover:shadow-md transition-all group"
                  >
                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full mb-2 ${p.color}`}>
                      {p.label}
                    </span>
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-black text-stone-900 truncate">{p.value}</span>
                      {copiedField === p.id ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3 text-stone-300 group-hover:text-stone-900" />}
                    </div>
                  </button>
                ))}
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <textarea 
                    rows={4}
                    placeholder="Express your interest..."
                    className="w-full px-6 py-5 bg-stone-50 border border-stone-100 rounded-[2rem] focus:bg-white focus:ring-4 focus:ring-crimson-50 focus:border-crimson-200 outline-none resize-none text-stone-900 font-medium transition-all"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                  <div className="absolute bottom-4 right-6 text-[10px] font-black text-stone-300 uppercase tracking-widest">Direct Message</div>
                </div>
                <button 
                  onClick={handleSendMessage}
                  disabled={sendingMessage || messageSent || !message.trim()}
                  className={`w-full py-5 rounded-[2rem] font-black uppercase tracking-[0.2em] text-xs transition-all disabled:opacity-50 flex items-center justify-center gap-3 shadow-2xl ${
                    messageSent 
                      ? 'bg-emerald-600 text-white shadow-emerald-100' 
                      : 'bg-stone-900 text-white hover:bg-stone-800 shadow-stone-200 hover:-translate-y-1'
                  }`}
                >
                  {sendingMessage ? (
                    'Transmitting...'
                  ) : messageSent ? (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      Sent Successfully
                    </>
                  ) : (
                    'Initiate Contact'
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="p-8 bg-crimson-50/50 border border-crimson-100 rounded-[2rem] flex items-start gap-4 text-crimson-900">
              <div className="p-2 bg-white rounded-xl shadow-sm">
                <AlertCircle className="w-5 h-5 text-crimson-600" />
              </div>
              <div>
                <p className="font-black uppercase tracking-widest text-xs mb-1">Your Listing</p>
                <p className="text-sm font-medium opacity-80">You can manage and edit this item from your dashboard.</p>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Reviews & Social Proof Section */}
      <div className="mt-20 md:mt-32 pt-12 md:pt-20 border-t border-stone-100">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16">
          <div className="lg:col-span-4 space-y-4 md:space-y-6">
            <h2 className="text-3xl md:text-4xl font-display font-black text-stone-900 leading-none tracking-tight">Vouches & Reviews</h2>
            <p className="text-stone-500 font-medium text-sm md:text-base">Authentic feedback from the Capstone community.</p>
            
            {reviews.length > 0 && (
              <div className="p-6 md:p-8 bg-stone-900 rounded-[1.5rem] md:rounded-[2rem] text-white space-y-3 md:space-y-4 shadow-2xl shadow-stone-200">
                <div className="flex items-center gap-1.5 md:gap-2">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 md:w-5 h-4 md:w-5 text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <div className="space-y-1">
                  <p className="text-3xl md:text-4xl font-display font-black">
                    {(reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)}
                  </p>
                  <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">Average Seller Rating</p>
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {reviews.length > 0 ? (
                reviews.map((review) => (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    key={review.id} 
                    className="p-8 bg-white rounded-[2rem] border border-stone-100 shadow-sm hover:shadow-xl transition-all duration-500 space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <Link to={`/profile/${review.reviewer_id}`} className="flex items-center gap-3 group">
                        <div className="w-8 h-8 bg-stone-50 rounded-lg flex items-center justify-center border border-stone-100 group-hover:border-stone-200 transition-colors">
                          <UserIcon className="w-4 h-4 text-stone-300" />
                        </div>
                        <span className="font-black text-[10px] uppercase tracking-widest text-stone-900 group-hover:text-crimson-600 transition-colors">
                          {review.reviewer?.full_name?.split(' ')[0] || 'Anonymous'}
                        </span>
                      </Link>
                      <div className="flex gap-0.5">
                        {[...Array(5)].map((_, i) => (
                          <Star 
                            key={i} 
                            className={`w-3 h-3 ${i < review.rating ? 'text-amber-400 fill-amber-400' : 'text-stone-100'}`} 
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-stone-500 font-medium text-sm leading-relaxed italic">"{review.comment}"</p>
                    <p className="text-[9px] font-black text-stone-300 uppercase tracking-[0.2em]">
                      {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
                    </p>
                  </motion.div>
                ))
              ) : (
                <div className="col-span-2 py-20 bg-stone-50 rounded-[2rem] border border-dashed border-stone-200 flex flex-col items-center justify-center gap-4">
                  <Star className="w-12 h-12 text-stone-200" />
                  <p className="font-black uppercase tracking-[0.2em] text-xs text-stone-400">No Vouchers Yet</p>
                </div>
              )}
            </div>

            {user && user.id !== listing.seller_id && canReview && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-12 p-10 bg-crimson-50/30 rounded-[3rem] border border-crimson-100/50 space-y-8"
              >
                <div className="space-y-2">
                  <h4 className="text-2xl font-display font-black text-stone-900 leading-none">Vouch for this Seller</h4>
                  <p className="text-stone-500 font-medium text-sm">Share your transaction experience with the community.</p>
                </div>

                <div className="flex gap-3">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setNewReview({ ...newReview, rating: star })}
                      className="group transition-transform hover:scale-110"
                    >
                      <Star 
                        className={`w-10 h-10 transition-all duration-300 ${
                          star <= newReview.rating ? 'text-amber-400 fill-amber-400 drop-shadow-lg' : 'text-stone-200'
                        }`} 
                      />
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <textarea 
                    rows={3}
                    placeholder="Write your vouch..."
                    className="w-full px-8 py-6 bg-white border border-stone-100 rounded-[2rem] focus:ring-4 focus:ring-crimson-50 focus:border-crimson-200 outline-none resize-none text-stone-900 font-medium transition-all shadow-sm"
                    value={newReview.comment}
                    onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                  />
                </div>

                <button 
                  onClick={handleReviewSubmit}
                  disabled={submittingReview || !newReview.comment.trim()}
                  className="px-10 py-4 bg-stone-900 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-xs hover:bg-stone-800 transition-all disabled:opacity-50 shadow-xl shadow-stone-200"
                >
                  {submittingReview ? 'Processing...' : 'Post Vouch'}
                </button>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
