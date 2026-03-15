import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../components/AuthProvider';
import { User, Listing, Review, Follow } from '../types';
import { Mail, MapPin, Calendar, Package, Star, Users, UserPlus, UserMinus, ChevronRight, Tag, Zap, CheckCircle, Share2, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';
import { formatDistanceToNow } from 'date-fns';

export const PublicProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<User | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [stats, setStats] = useState({
    followersCount: 0,
    followingCount: 0,
    listingsCount: 0
  });

  useEffect(() => {
    if (id) {
      fetchProfileData();
    }
  }, [id, currentUser]);

  const fetchProfileData = async () => {
    setLoading(true);
    try {
      // Fetch user profile
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (userError) throw userError;
      setProfile(userData);

      // Fetch listings
      const { data: listingsData } = await supabase
        .from('listings')
        .select('*, seller:profiles(*)')
        .eq('seller_id', id)
        .order('created_at', { ascending: false });
      
      setListings(listingsData || []);

      // Fetch reviews
      console.log('Fetching reviews for profile:', id);
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('reviews')
        .select('*, reviewer:profiles!reviewer_id(*)')
        .eq('seller_id', id)
        .order('created_at', { ascending: false });
      
      if (reviewsError) {
        console.error('Error fetching reviews:', reviewsError);
        // Try without join
        const { data: simpleReviews } = await supabase
          .from('reviews')
          .select('*')
          .eq('seller_id', id)
          .order('created_at', { ascending: false });
        if (simpleReviews) setReviews(simpleReviews);
      } else {
        console.log('Fetched reviews for profile:', reviewsData);
        setReviews(reviewsData || []);
      }

      // Fetch stats
      const { count: followersCount } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', id);

      const { count: followingCount } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', id);

      setStats({
        followersCount: followersCount || 0,
        followingCount: followingCount || 0,
        listingsCount: listingsData?.length || 0
      });

      // Check if current user is following
      if (currentUser && currentUser.id !== id) {
        const { data: followData } = await supabase
          .from('follows')
          .select('*')
          .eq('follower_id', currentUser.id)
          .eq('following_id', id)
          .single();
        
        setIsFollowing(!!followData);
      }
    } catch (error) {
      console.error('Error fetching profile data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFollowToggle = async () => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    if (currentUser.id === id) return;

    setFollowLoading(true);
    try {
      const response = await fetch('/api/profile/follow/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          followerId: currentUser.id,
          followingId: id
        })
      });

      if (!response.ok) throw new Error('Failed to toggle follow');
      const { following } = await response.json();
      setIsFollowing(following);
      
      // Update stats locally
      setStats(prev => ({
        ...prev,
        followersCount: following ? prev.followersCount + 1 : prev.followersCount - 1
      }));
    } catch (error) {
      console.error('Error toggling follow:', error);
    } finally {
      setFollowLoading(false);
    }
  };

  if (loading) return <div className="text-center py-20">Loading profile...</div>;
  if (!profile) return <div className="text-center py-20">User not found</div>;

  const averageRating = reviews.length > 0 
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  return (
    <div className="max-w-5xl mx-auto space-y-6 md:space-y-10 pb-20 md:pb-10">
      {/* Profile Header */}
      <div className="bg-white rounded-[2rem] md:rounded-[3rem] border border-stone-200 overflow-hidden shadow-xl shadow-stone-200/50">
        <div className="h-48 md:h-80 bg-stone-100 relative">
          {profile.banner_url ? (
            <img src={profile.banner_url} className="w-full h-full object-cover" alt="Banner" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-crimson-600 to-crimson-800" />
          )}
          
          <div className="absolute -bottom-12 md:-bottom-24 left-6 md:left-12">
            <div className="w-24 h-24 md:w-48 md:h-48 bg-white rounded-2xl md:rounded-[2.5rem] border-4 md:border-8 border-white shadow-2xl overflow-hidden flex items-center justify-center">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} className="w-full h-full object-cover" alt="Avatar" />
              ) : (
                <Users className="w-10 h-10 md:w-24 md:h-24 text-stone-200" />
              )}
            </div>
          </div>
        </div>

        <div className="pt-16 md:pt-28 pb-8 md:pb-12 px-4 md:px-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 md:gap-10">
            <div className="space-y-4 md:space-y-6 w-full">
              <div className="space-y-2 md:space-y-3">
                <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
                  <h1 className="text-2xl md:text-5xl font-display font-bold text-stone-900 tracking-tight">
                    {profile.full_name || profile.email?.split('@')[0]}
                  </h1>
                  <div className="flex items-center gap-2">
                    {profile.verified_student && (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-600 text-[9px] md:text-[10px] font-black rounded-full uppercase tracking-widest border border-blue-100">
                        <ShieldCheck className="w-3 md:w-3.5 h-3 md:h-3.5" />
                        Verified Student
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3 text-stone-400 font-medium text-sm md:text-xl">
                  <span>@{profile.username || 'user'}</span>
                  <span className="hidden md:block w-1 h-1 bg-stone-300 rounded-full" />
                  <div className="flex items-center gap-1.5 text-crimson-600">
                    <MapPin className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    <span className="text-xs md:text-base">{profile.location || 'University of Alabama'}</span>
                  </div>
                </div>
              </div>
              
              {profile.bio && (
                <p className="text-stone-600 text-sm md:text-xl max-w-2xl leading-relaxed font-medium">
                  {profile.bio}
                </p>
              )}

              <div className="flex items-center justify-between md:justify-start gap-6 md:gap-10 pt-2 border-t border-stone-100 md:border-none pt-4 md:pt-2">
                <div className="flex flex-col">
                  <span className="text-base md:text-2xl font-display font-bold text-stone-900 leading-none">{stats.followersCount}</span>
                  <span className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 mt-1">Followers</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-base md:text-2xl font-display font-bold text-stone-900 leading-none">{stats.followingCount}</span>
                  <span className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 mt-1">Following</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-base md:text-2xl font-display font-bold text-stone-900 leading-none">{stats.listingsCount}</span>
                  <span className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 mt-1">Listings</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 md:gap-4 w-full md:w-auto">
              {currentUser?.id !== id && (
                <button
                  onClick={handleFollowToggle}
                  disabled={followLoading}
                  className={`flex-1 md:flex-none flex items-center justify-center gap-3 px-6 md:px-10 py-3 md:py-4 rounded-xl md:rounded-2xl font-bold transition-all shadow-xl ${
                    isFollowing 
                      ? 'bg-stone-100 text-stone-700 hover:bg-stone-200 shadow-none' 
                      : 'bg-crimson-600 text-white hover:bg-crimson-700 shadow-crimson-200'
                  }`}
                >
                  {isFollowing ? (
                    <>
                      <UserMinus className="w-4 h-4 md:w-5 md:h-5" />
                      Unfollow
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 md:w-5 md:h-5" />
                      Follow
                    </>
                  )}
                </button>
              )}
              <button className="p-3 md:p-4 bg-stone-100 text-stone-600 rounded-xl md:rounded-2xl hover:bg-stone-200 transition-all">
                <Share2 className="w-5 md:w-6 h-5 md:h-6" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-12">
        {/* Listings Section */}
        <div className="lg:col-span-2 space-y-6 md:space-y-8">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-xl md:text-2xl font-display font-bold text-stone-900 flex items-center gap-3">
              <div className="w-10 h-10 bg-crimson-50 rounded-xl flex items-center justify-center">
                <Package className="w-5 h-5 text-crimson-600" />
              </div>
              Active Listings
            </h2>
            <span className="text-xs font-bold text-stone-400 uppercase tracking-widest">{listings.length} items</span>
          </div>

          {listings.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
              {listings.map((listing) => (
                <motion.div
                  key={listing.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-sm hover:shadow-md transition-all group"
                >
                  <Link to={`/listing/${listing.id}`}>
                    <div className="relative aspect-[4/3] overflow-hidden">
                      <img 
                        src={listing.image_url} 
                        alt={listing.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute top-3 left-3 flex flex-col gap-2">
                        <span className="px-3 py-1 bg-white/90 backdrop-blur-sm text-stone-900 text-[10px] font-bold uppercase tracking-wider rounded-full shadow-sm">
                          {listing.category}
                        </span>
                        {listing.boosted && (
                          <span className="px-3 py-1 bg-amber-400 text-white text-[10px] font-bold uppercase tracking-wider rounded-full shadow-sm flex items-center gap-1">
                            <Zap className="w-3 h-3 fill-white" />
                            Boosted
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="p-5 space-y-2">
                      <div className="flex justify-between items-start gap-2">
                        <h3 className="font-bold text-stone-900 line-clamp-1">{listing.title}</h3>
                        <p className="font-bold text-crimson-600">${listing.price}</p>
                      </div>
                      <div className="flex items-center justify-between text-xs text-stone-400">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {listing.location_name || 'Campus'}
                        </span>
                        <span>{formatDistanceToNow(new Date(listing.created_at), { addSuffix: true })}</span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="bg-white p-12 rounded-3xl border border-stone-200 text-center space-y-4">
              <div className="bg-stone-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto">
                <Package className="w-8 h-8 text-stone-300" />
              </div>
              <p className="text-stone-500 font-medium">No active listings from this user.</p>
            </div>
          )}
        </div>

        {/* Reviews Section */}
        <div className="space-y-6 md:space-y-8">
          <h2 className="text-xl md:text-2xl font-display font-bold text-stone-900 flex items-center gap-3 px-2">
            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
              <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
            </div>
            Vouches & Reviews
          </h2>

          <div className="space-y-4">
            {reviews.length > 0 ? (
              reviews.map((review) => (
                <div key={review.id} className="bg-white p-5 md:p-6 rounded-[1.5rem] md:rounded-3xl border border-stone-200 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <Link to={`/profile/${review.reviewer_id}`} className="flex items-center gap-3 group">
                      <div className="w-10 h-10 bg-stone-100 rounded-xl overflow-hidden flex items-center justify-center">
                        {review.reviewer?.avatar_url ? (
                          <img src={review.reviewer.avatar_url} className="w-full h-full object-cover" alt="" />
                        ) : (
                          <Users className="w-5 h-5 text-stone-300" />
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-stone-900 group-hover:text-crimson-600 transition-colors">
                          {review.reviewer?.full_name || review.reviewer?.email?.split('@')[0]}
                        </p>
                        <p className="text-[10px] text-stone-400 uppercase tracking-wider">
                          {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </Link>
                    <div className="flex gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star 
                          key={i} 
                          className={`w-3 h-3 ${i < review.rating ? 'text-amber-500 fill-amber-500' : 'text-stone-200'}`} 
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-stone-600 leading-relaxed italic">"{review.comment}"</p>
                </div>
              ))
            ) : (
              <div className="bg-white p-12 rounded-3xl border border-stone-200 text-center space-y-4">
                <p className="text-stone-400 italic">No reviews yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
