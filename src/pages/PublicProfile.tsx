import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../components/AuthProvider';
import { User, Listing, Review, Follow } from '../types';
import { Mail, MapPin, Calendar, Package, Star, Users, UserPlus, UserMinus, ChevronRight, Tag, Zap } from 'lucide-react';
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
        .select('*')
        .eq('seller_id', id)
        .order('created_at', { ascending: false });
      
      setListings(listingsData || []);

      // Fetch reviews
      const { data: reviewsData } = await supabase
        .from('reviews')
        .select('*, reviewer:profiles(*)')
        .eq('seller_id', id)
        .order('created_at', { ascending: false });
      
      setReviews(reviewsData || []);

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
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Profile Header */}
      <div className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-sm">
        <div className="h-64 bg-stone-100 relative">
          {profile.banner_url ? (
            <img src={profile.banner_url} className="w-full h-full object-cover" alt="Banner" />
          ) : (
            <div className="w-full h-full bg-crimson-600" />
          )}
          
          <div className="absolute -bottom-16 left-8">
            <div className="w-32 h-32 bg-white rounded-3xl border-4 border-white shadow-xl overflow-hidden flex items-center justify-center">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} className="w-full h-full object-cover" alt="Avatar" />
              ) : (
                <Users className="w-16 h-16 text-stone-300" />
              )}
            </div>
          </div>
        </div>

        <div className="pt-20 pb-8 px-8 flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-stone-900">
                {profile.full_name || profile.email?.split('@')[0]}
              </h1>
              {profile.username && (
                <span className="text-stone-400 font-medium">@{profile.username}</span>
              )}
            </div>
            
            {profile.bio && (
              <p className="text-stone-600 max-w-2xl leading-relaxed">{profile.bio}</p>
            )}

            <div className="flex flex-wrap items-center gap-6 text-stone-500 pt-2">
              {profile.location && (
                <div className="flex items-center gap-1.5 text-crimson-600 font-medium">
                  <MapPin className="w-4 h-4" />
                  <span className="text-sm">{profile.location}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                <span className="text-sm">Joined {new Date(profile.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</span>
              </div>
              {averageRating && (
                <div className="flex items-center gap-1.5 text-amber-500 font-bold">
                  <Star className="w-4 h-4 fill-amber-500" />
                  <span className="text-sm">{averageRating} ({reviews.length} reviews)</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-6 pt-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-stone-900">{stats.followersCount}</span>
                <span className="text-stone-500 text-sm">Followers</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-stone-900">{stats.followingCount}</span>
                <span className="text-stone-500 text-sm">Following</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-stone-900">{stats.listingsCount}</span>
                <span className="text-stone-500 text-sm">Listings</span>
              </div>
            </div>
          </div>

          {currentUser?.id !== id && (
            <button
              onClick={handleFollowToggle}
              disabled={followLoading}
              className={`px-8 py-3 rounded-xl font-bold transition-all shadow-lg flex items-center gap-2 ${
                isFollowing 
                  ? 'bg-stone-100 text-stone-700 hover:bg-stone-200 shadow-none' 
                  : 'bg-crimson-600 text-white hover:bg-crimson-700 shadow-crimson-200'
              }`}
            >
              {isFollowing ? (
                <>
                  <UserMinus className="w-5 h-5" />
                  Unfollow
                </>
              ) : (
                <>
                  <UserPlus className="w-5 h-5" />
                  Follow
                </>
              )}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Listings Section */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-stone-900 flex items-center gap-2">
              <Package className="w-6 h-6 text-crimson-600" />
              Active Listings
            </h2>
            <span className="text-stone-400 text-sm font-medium">{listings.length} items</span>
          </div>

          {listings.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-stone-900 flex items-center gap-2">
            <Star className="w-6 h-6 text-amber-500 fill-amber-500" />
            Reviews
          </h2>

          <div className="space-y-4">
            {reviews.length > 0 ? (
              reviews.map((review) => (
                <div key={review.id} className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm space-y-3">
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
