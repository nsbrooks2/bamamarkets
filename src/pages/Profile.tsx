import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../components/AuthProvider';
import { User as UserProfile, Listing } from '../types';
import { Mail, Package, ShoppingCart, LogOut, Calendar, ShieldCheck, MapPin, Save, Camera, Image as ImageIcon, User as UserIcon, AtSign, Info, Users, CreditCard, ChevronRight, Star, X } from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';

export const Profile: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [stats, setStats] = useState({
    listingsCount: 0,
    salesCount: 0,
    followersCount: 0,
    followingCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userListings, setUserListings] = useState<Listing[]>([]);
  const [userPurchases, setUserPurchases] = useState<any[]>([]);
  const [reviewedListingIds, setReviewedListingIds] = useState<Set<string>>(new Set());
  const [loadingListings, setLoadingListings] = useState(true);
  const [loadingPurchases, setLoadingPurchases] = useState(true);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewingListing, setReviewingListing] = useState<any>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    bio: '',
    locationName: '',
    avatarUrl: '',
    bannerUrl: '',
    venmo_username: '',
    paypal_username: '',
    zelle_email: '',
    cashapp_username: '',
    applepay_contact: '',
    accepts_cash: false
  });

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchUserStats();
      fetchUserListings();
      fetchUserPurchases();
    } else {
      navigate('/login');
    }
  }, [user]);

  useEffect(() => {
    const reviewListingId = searchParams.get('review');
    if (reviewListingId && user) {
      handleAutoOpenReview(reviewListingId);
    }
  }, [searchParams, user]);

  const handleAutoOpenReview = async (listingId: string) => {
    try {
      const { data, error } = await supabase
        .from('listings')
        .select('*, seller:profiles(*)')
        .eq('id', listingId)
        .single();
      
      if (error) throw error;
      if (data) {
        openReviewModal(data);
      }
    } catch (error) {
      console.error('Error auto-opening review modal:', error);
    }
  };

  const fetchUserListings = async () => {
    if (!user) return;
    setLoadingListings(true);
    try {
      const { data } = await supabase
        .from('listings')
        .select('*, seller:profiles(*)')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });
      
      setUserListings(data || []);
    } catch (error) {
      console.error('Error fetching user listings:', error);
    } finally {
      setLoadingListings(false);
    }
  };

  const fetchUserPurchases = async () => {
    if (!user) return;
    setLoadingPurchases(true);
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*, listing:listings(*, seller:profiles(*))')
        .eq('buyer_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setUserPurchases(data || []);

      // Fetch existing reviews to hide the button
      const { data: reviewsData } = await supabase
        .from('reviews')
        .select('listing_id')
        .eq('reviewer_id', user.id);
      
      if (reviewsData) {
        const reviewedIds = new Set(reviewsData.map(r => r.listing_id));
        console.log('Reviewed listing IDs:', Array.from(reviewedIds));
        setReviewedListingIds(reviewedIds);
      }
    } catch (error) {
      console.error('Error fetching user purchases:', error);
    } finally {
      setLoadingPurchases(false);
    }
  };

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (error) throw error;
      setProfile(data);
      setFormData({
        name: data.full_name || '',
        username: data.username || '',
        bio: data.bio || '',
        locationName: data.location || '',
        avatarUrl: data.avatar_url || '',
        bannerUrl: data.banner_url || '',
        venmo_username: data.venmo_username || '',
        paypal_username: data.paypal_username || '',
        zelle_email: data.zelle_email || '',
        cashapp_username: data.cashapp_username || '',
        applepay_contact: data.applepay_contact || '',
        accepts_cash: data.accepts_cash || false
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const fetchUserStats = async () => {
    if (!user) return;
    try {
      // Fetch listings count
      const { count: listingsCount } = await supabase
        .from('listings')
        .select('*', { count: 'exact', head: true })
        .eq('seller_id', user.id);

      // Fetch completed sales count
      const { count: salesCount } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('seller_id', user.id);

      // Fetch followers count
      const { count: followersCount } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', user.id);

      // Fetch following count
      const { count: followingCount } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', user.id);

      setStats({
        listingsCount: listingsCount || 0,
        salesCount: salesCount || 0,
        followersCount: followersCount || 0,
        followingCount: followingCount || 0
      });
    } catch (error) {
      console.error('Error fetching user stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'banner') => {
    if (!e.target.files || !e.target.files[0] || !user) return;
    const file = e.target.files[0];
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('listing-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('listing-images')
        .getPublicUrl(filePath);

      if (type === 'avatar') {
        setFormData(prev => ({ ...prev, avatarUrl: publicUrl }));
      } else {
        setFormData(prev => ({ ...prev, bannerUrl: publicUrl }));
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image');
    }
  };

  const handleUpdateProfile = async () => {
    if (!user) return;
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          full_name: formData.name,
          username: formData.username,
          bio: formData.bio,
          location: formData.locationName,
          avatar_url: formData.avatarUrl,
          banner_url: formData.bannerUrl,
          venmo_username: formData.venmo_username,
          paypal_username: formData.paypal_username,
          zelle_email: formData.zelle_email,
          cashapp_username: formData.cashapp_username,
          applepay_contact: formData.applepay_contact,
          accepts_cash: formData.accepts_cash
        });

      if (error) throw error;
      
      alert('Profile updated successfully!');
      fetchProfile();
    } catch (err: any) {
      alert('Error updating profile: ' + err.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const openReviewModal = (listing: any) => {
    setReviewingListing(listing);
    setReviewRating(5);
    setReviewComment('');
    setIsReviewModalOpen(true);
  };

  const handleReviewSubmit = async () => {
    if (!user || !reviewingListing) return;
    
    if (!reviewingListing.id) {
      alert('Error: Listing information is missing. Cannot submit review.');
      return;
    }

    setSubmittingReview(true);
    try {
      console.log('Submitting review for listing:', reviewingListing.id);
      const response = await fetch('/api/reviews/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sellerId: reviewingListing.seller_id,
          reviewerId: user.id,
          listingId: reviewingListing.id,
          rating: reviewRating,
          comment: reviewComment.trim() || ""
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit review');
      }

      alert('Review submitted successfully!');
      setIsReviewModalOpen(false);
      await fetchUserPurchases(); // Refresh the list
    } catch (err: any) {
      console.error('Error submitting review:', err);
      alert(err.message);
    } finally {
      setSubmittingReview(false);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6 md:space-y-8 pb-20 md:pb-10">
      <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] border border-stone-200 overflow-hidden shadow-xl shadow-stone-200/50">
        {/* Profile Header */}
        <div className="h-48 md:h-64 bg-stone-100 relative group">
          {formData.bannerUrl ? (
            <img src={formData.bannerUrl} className="w-full h-full object-cover" alt="Banner" />
          ) : (
            <div className="w-full h-full bg-crimson-600" />
          )}
          <button 
            onClick={() => document.getElementById('banner-upload')?.click()}
            className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center text-white gap-3 font-bold backdrop-blur-sm"
          >
            <Camera className="w-6 h-6" />
            Change Banner
          </button>
          <input id="banner-upload" type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'banner')} />
          
          <div className="absolute -bottom-12 md:-bottom-20 left-6 md:left-10">
            <div className="relative group/avatar">
              <div className="w-24 h-24 md:w-40 md:h-40 bg-white rounded-2xl md:rounded-[2rem] border-4 md:border-8 border-white shadow-2xl overflow-hidden flex items-center justify-center">
                {formData.avatarUrl ? (
                  <img src={formData.avatarUrl} className="w-full h-full object-cover" alt="Avatar" />
                ) : (
                  <UserIcon className="w-10 h-10 md:w-20 md:h-20 text-stone-200" />
                )}
              </div>
              <button 
                onClick={() => document.getElementById('avatar-upload')?.click()}
                className="absolute inset-0 bg-black/40 rounded-2xl md:rounded-[2rem] opacity-0 group-hover/avatar:opacity-100 transition-all flex items-center justify-center text-white backdrop-blur-sm"
              >
                <Camera className="w-6 md:w-8 h-6 md:h-8" />
              </button>
              <input id="avatar-upload" type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'avatar')} />
            </div>
          </div>
        </div>

        <div className="pt-16 md:pt-24 pb-8 md:pb-10 px-4 md:px-10 flex flex-col md:flex-row md:items-end justify-between gap-6 md:gap-8">
          <div className="space-y-4 w-full">
            <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
              <h1 className="text-2xl md:text-4xl font-display font-bold text-stone-900 tracking-tight">
                {formData.name || user.email?.split('@')[0]}
              </h1>
              <div className="flex items-center gap-2">
                {profile?.verified_student && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-600 text-[9px] md:text-[10px] font-black rounded-full uppercase tracking-widest border border-blue-100">
                    <ShieldCheck className="w-3 md:w-3.5 h-3 md:h-3.5" />
                    Verified Student
                  </div>
                )}
                {formData.username && (
                  <span className="text-stone-400 font-medium text-sm md:text-lg">@{formData.username}</span>
                )}
              </div>
            </div>
            
            {formData.bio && (
              <p className="text-stone-600 text-sm md:text-lg max-w-xl leading-relaxed">{formData.bio}</p>
            )}

            <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-6 text-stone-500 pt-1 md:pt-2">
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 md:w-4 md:h-4 text-stone-400" />
                <span className="text-xs md:text-sm font-medium">{user.email}</span>
              </div>
              <div className="flex items-center gap-4">
                {formData.locationName && (
                  <div className="flex items-center gap-2 text-crimson-600 font-semibold">
                    <MapPin className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    <span className="text-xs md:text-sm">{formData.locationName}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-stone-400">
                  <Calendar className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  <span className="text-[9px] md:text-[10px] uppercase tracking-[0.2em] font-black">
                    Joined {user.created_at && !isNaN(new Date(user.created_at).getTime()) 
                      ? new Date(user.created_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) 
                      : 'Recently'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between md:justify-start gap-6 md:gap-8 pt-4 md:pt-6 border-t border-stone-100 md:border-none">
              <div className="flex items-center gap-2 md:gap-2.5">
                <span className="text-base md:text-xl font-bold text-stone-900">{stats.followersCount}</span>
                <span className="text-stone-500 text-[10px] md:text-sm font-medium">Followers</span>
              </div>
              <div className="flex items-center gap-2 md:gap-2.5">
                <span className="text-base md:text-xl font-bold text-stone-900">{stats.followingCount}</span>
                <span className="text-stone-500 text-[10px] md:text-sm font-medium">Following</span>
              </div>
              <Link to={`/profile/${user.id}`} className="text-crimson-600 text-[9px] md:text-sm font-black uppercase tracking-widest hover:underline">
                Public Profile
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-5 md:p-6 rounded-3xl border border-stone-200 shadow-sm space-y-4"
        >
          <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-50 rounded-2xl flex items-center justify-center">
            <Package className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
          </div>
          <div>
            <p className="text-stone-400 text-[10px] font-bold uppercase tracking-widest">Active Listings</p>
            <p className="text-3xl md:text-4xl font-display font-bold text-stone-900 tracking-tight">{loading ? '...' : stats.listingsCount}</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-5 md:p-6 rounded-3xl border border-stone-200 shadow-sm space-y-4"
        >
          <div className="w-10 h-10 md:w-12 md:h-12 bg-green-50 rounded-2xl flex items-center justify-center">
            <ShoppingCart className="w-5 h-5 md:w-6 md:h-6 text-green-600" />
          </div>
          <div>
            <p className="text-stone-400 text-[10px] font-bold uppercase tracking-widest">Completed Sales</p>
            <p className="text-3xl md:text-4xl font-display font-bold text-stone-900 tracking-tight">{loading ? '...' : stats.salesCount}</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white p-5 md:p-6 rounded-3xl border border-stone-200 shadow-sm space-y-4 sm:col-span-2 md:col-span-1"
        >
          <div className="w-10 h-10 md:w-12 md:h-12 bg-crimson-50 rounded-2xl flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 md:w-6 md:h-6 text-crimson-600" />
          </div>
          <div>
            <p className="text-stone-400 text-[10px] font-bold uppercase tracking-widest">Verification Status</p>
            <p className="text-lg md:text-xl font-display font-bold text-crimson-600 uppercase tracking-tight">Verified Student</p>
          </div>
        </motion.div>
      </div>

      {/* Profile Customization */}
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-stone-200 shadow-sm space-y-8">
        <div>
          <h2 className="text-xl md:text-2xl font-display font-bold text-stone-900 mb-6 md:mb-8 flex items-center gap-3">
            <div className="w-10 h-10 bg-crimson-50 rounded-xl flex items-center justify-center">
              <UserIcon className="w-5 h-5 text-crimson-600" />
            </div>
            Customize Profile
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-stone-700 ml-1 flex items-center gap-2">
                <UserIcon className="w-4 h-4" />
                Full Name
              </label>
              <input 
                type="text"
                placeholder="Your real name"
                className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-crimson-400 outline-none"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-stone-700 ml-1 flex items-center gap-2">
                <AtSign className="w-4 h-4" />
                Username
              </label>
              <input 
                type="text"
                placeholder="unique_username"
                className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-crimson-400 outline-none"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/\s/g, '_') })}
              />
            </div>

            <div className="md:col-span-2 space-y-2">
              <label className="text-sm font-semibold text-stone-700 ml-1 flex items-center gap-2">
                <Info className="w-4 h-4" />
                Bio
              </label>
              <textarea 
                rows={3}
                placeholder="Tell others about yourself..."
                className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-crimson-400 outline-none resize-none"
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-stone-700 ml-1 flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Dorm / Apartment
              </label>
              <input 
                type="text"
                placeholder="e.g. Tutwiler Hall"
                className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-crimson-400 outline-none"
                value={formData.locationName}
                onChange={(e) => setFormData({ ...formData, locationName: e.target.value })}
              />
            </div>
          </div>

          <div className="mt-16">
            <h3 className="text-xl font-display font-bold text-stone-900 mb-6 flex items-center gap-3">
              <div className="w-10 h-10 bg-crimson-50 rounded-xl flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-crimson-600" />
              </div>
              Payment Methods (P2P)
            </h3>
            <p className="text-sm text-stone-500 mb-8 max-w-xl">
              Add your payment handles so other students can pay you directly. 
              Transactions happen outside of BamaMarket.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-stone-700 ml-1">Venmo Username</label>
                <input 
                  type="text"
                  placeholder="@username"
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-crimson-400 outline-none"
                  value={formData.venmo_username}
                  onChange={(e) => setFormData({ ...formData, venmo_username: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-stone-700 ml-1">PayPal Username</label>
                <input 
                  type="text"
                  placeholder="username"
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-crimson-400 outline-none"
                  value={formData.paypal_username}
                  onChange={(e) => setFormData({ ...formData, paypal_username: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-stone-700 ml-1">Zelle Email</label>
                <input 
                  type="email"
                  placeholder="email@example.com"
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-crimson-400 outline-none"
                  value={formData.zelle_email}
                  onChange={(e) => setFormData({ ...formData, zelle_email: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-stone-700 ml-1">Cash App Username</label>
                <input 
                  type="text"
                  placeholder="$username"
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-crimson-400 outline-none"
                  value={formData.cashapp_username}
                  onChange={(e) => setFormData({ ...formData, cashapp_username: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-stone-700 ml-1">Apple Pay Contact</label>
                <input 
                  type="text"
                  placeholder="Phone or Email"
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-crimson-400 outline-none"
                  value={formData.applepay_contact}
                  onChange={(e) => setFormData({ ...formData, applepay_contact: e.target.value })}
                />
              </div>

              <div className="flex items-center gap-3 p-4 bg-stone-50 rounded-xl border border-stone-200">
                <input 
                  type="checkbox"
                  id="accepts_cash"
                  className="w-5 h-5 rounded border-stone-300 text-crimson-600 focus:ring-crimson-500"
                  checked={formData.accepts_cash}
                  onChange={(e) => setFormData({ ...formData, accepts_cash: e.target.checked })}
                />
                <label htmlFor="accepts_cash" className="text-sm font-semibold text-stone-700">
                  Accept Cash (In-Person)
                </label>
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-end">
            <button
              onClick={handleUpdateProfile}
              disabled={updating}
              className="px-8 py-3 bg-crimson-600 text-white rounded-xl font-bold hover:bg-crimson-700 transition-all shadow-lg shadow-crimson-200 disabled:opacity-50 flex items-center gap-2"
            >
              <Save className="w-5 h-5" />
              {updating ? 'Saving Changes...' : 'Save Profile'}
            </button>
          </div>
        </div>
      </div>

      {/* Purchases Section */}
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-stone-200 shadow-sm space-y-6 md:space-y-8">
        <div>
          <h2 className="text-xl md:text-2xl font-display font-bold text-stone-900 mb-6 md:mb-8 flex items-center justify-between">
            Your Purchases
            <span className="text-[10px] md:text-xs font-bold text-stone-400 uppercase tracking-widest">{userPurchases.length} items</span>
          </h2>
          
          {loadingPurchases ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="h-24 bg-stone-100 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : userPurchases.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {userPurchases.map((transaction) => {
                const isReviewed = reviewedListingIds.has(transaction.listing_id);
                return (
                <div 
                  key={transaction.id} 
                  className="flex items-center gap-3 md:gap-4 p-3 md:p-4 bg-stone-50 rounded-2xl border border-stone-200 group hover:border-crimson-200 transition-colors"
                >
                  <div className="w-14 h-14 md:w-16 md:h-16 rounded-xl overflow-hidden shrink-0 border border-stone-200">
                    <img src={transaction.listing?.image_url} className="w-full h-full object-cover" alt="" />
                  </div>
                  <div className="flex-grow min-w-0">
                    <h3 className="font-bold text-stone-900 text-sm truncate">{transaction.listing?.title}</h3>
                    <p className="text-[10px] md:text-xs text-stone-500 truncate">From {transaction.listing?.seller?.full_name || 'Seller'}</p>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-sm font-bold text-crimson-600">${transaction.sale_price}</span>
                      {isReviewed ? (
                        <span className="text-[9px] md:text-[10px] font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1">
                          <Star className="w-2.5 h-2.5 md:w-3 md:h-3 fill-emerald-600" />
                          Reviewed
                        </span>
                      ) : (
                        <button 
                          onClick={() => openReviewModal({ ...transaction.listing, seller_id: transaction.seller_id })}
                          className="px-3 py-1.5 bg-crimson-50 text-crimson-600 text-[9px] md:text-[10px] font-bold rounded-lg uppercase tracking-wider flex items-center gap-1 hover:bg-crimson-100 transition-colors"
                        >
                          Review
                          <ChevronRight className="w-2.5 h-2.5 md:w-3 md:h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );})}
            </div>
          ) : (
            <div className="text-center py-10 md:py-12 bg-stone-50 rounded-2xl border border-dashed border-stone-200">
              <p className="text-stone-500 text-sm">You haven't bought anything yet.</p>
              <Link to="/" className="text-crimson-600 text-sm font-bold hover:underline mt-2 inline-block">Browse Marketplace</Link>
            </div>
          )}
        </div>
      </div>

      {/* Active Listings Section */}
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-stone-200 shadow-sm space-y-6 md:space-y-8">
        <div>
          <h2 className="text-xl md:text-2xl font-display font-bold text-stone-900 mb-6 md:mb-8 flex items-center justify-between">
            Active Listings
            <Link to="/my-listings" className="text-sm font-bold text-crimson-600 hover:underline">Manage All</Link>
          </h2>
          
          {loadingListings ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="aspect-square bg-stone-100 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : userListings.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4">
              {userListings.slice(0, 4).map((listing) => (
                <Link 
                  key={listing.id} 
                  to={`/listing/${listing.id}`}
                  className="group relative aspect-square rounded-2xl overflow-hidden border border-stone-200 shadow-sm hover:shadow-md transition-all"
                >
                  <img src={listing.image_url} className="w-full h-full object-cover transition-transform group-hover:scale-110" alt="" referrerPolicy="no-referrer" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                    <p className="text-white text-[10px] md:text-xs font-bold truncate">${listing.price}</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 md:py-12 bg-stone-50 rounded-2xl border border-dashed border-stone-200">
              <p className="text-stone-500 text-sm">No active listings yet.</p>
              <Link to="/create" className="text-crimson-600 text-sm font-bold hover:underline mt-2 inline-block">Create one now</Link>
            </div>
          )}
        </div>
      </div>

      {/* Account Settings */}
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-stone-200 shadow-sm space-y-6 md:space-y-8">
        <div>
          <h2 className="text-xl md:text-2xl font-display font-bold text-stone-900 mb-6 md:mb-8">Preferences</h2>
          <div className="space-y-3 md:space-y-4">
            <div className="flex items-center justify-between p-4 md:p-6 bg-stone-50 rounded-2xl border border-stone-100 group hover:border-crimson-200 transition-colors">
              <div>
                <p className="font-bold text-stone-900 text-sm md:text-base">Email Notifications</p>
                <p className="text-[10px] md:text-sm text-stone-500">Receive alerts for new messages and sales.</p>
              </div>
              <div className="w-10 h-5 md:w-12 md:h-6 bg-crimson-600 rounded-full relative cursor-pointer">
                <div className="absolute right-1 top-1 w-3 h-3 md:w-4 md:h-4 bg-white rounded-full shadow-sm"></div>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 md:p-6 bg-stone-50 rounded-2xl border border-stone-100 group hover:border-crimson-200 transition-colors">
              <div>
                <p className="font-bold text-stone-900 text-sm md:text-base">Public Profile</p>
                <p className="text-[10px] md:text-sm text-stone-500">Allow others to see your active listings and followers.</p>
              </div>
              <div className="w-10 h-5 md:w-12 md:h-6 bg-crimson-600 rounded-full relative cursor-pointer">
                <div className="absolute right-1 top-1 w-3 h-3 md:w-4 md:h-4 bg-white rounded-full shadow-sm"></div>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-6 md:pt-8 border-t border-stone-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs md:text-sm text-stone-400 text-center sm:text-left">Manage your account and privacy settings.</p>
          <button
            onClick={handleLogout}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-red-50 text-red-600 rounded-xl font-bold hover:bg-red-100 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </div>

      {/* Review Modal */}
      {isReviewModalOpen && reviewingListing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl"
          >
            <div className="p-6 border-b border-stone-100 flex items-center justify-between bg-stone-50">
              <h3 className="text-xl font-bold text-stone-900">Review Item</h3>
              <button 
                onClick={() => setIsReviewModalOpen(false)}
                className="p-2 hover:bg-stone-200 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-stone-400" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex items-center gap-4 p-3 bg-stone-50 rounded-2xl border border-stone-100">
                <img src={reviewingListing.image_url} className="w-16 h-16 rounded-xl object-cover" alt="" />
                <div>
                  <h4 className="font-bold text-stone-900">{reviewingListing.title}</h4>
                  <p className="text-xs text-stone-500">Sold by {reviewingListing.seller?.full_name}</p>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-bold text-stone-700 ml-1">Rating</label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setReviewRating(star)}
                      className="p-1 transition-transform hover:scale-110"
                    >
                      <Star 
                        className={`w-8 h-8 ${
                          star <= reviewRating 
                            ? 'text-amber-400 fill-amber-400' 
                            : 'text-stone-200'
                        }`} 
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-bold text-stone-700 ml-1">Your Feedback</label>
                <textarea
                  rows={4}
                  placeholder="How was your experience with this seller?"
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-crimson-400 outline-none resize-none"
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setIsReviewModalOpen(false)}
                  className="flex-1 px-6 py-3 bg-stone-100 text-stone-600 rounded-xl font-bold hover:bg-stone-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReviewSubmit}
                  disabled={submittingReview || !reviewComment.trim()}
                  className="flex-1 px-6 py-3 bg-crimson-600 text-white rounded-xl font-bold hover:bg-crimson-700 transition-all shadow-lg shadow-crimson-200 disabled:opacity-50"
                >
                  {submittingReview ? 'Submitting...' : 'Submit Review'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
