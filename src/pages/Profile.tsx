import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../components/AuthProvider';
import { User as UserProfile, Listing } from '../types';
import { Mail, Package, ShoppingCart, LogOut, Calendar, ShieldCheck, MapPin, Save, Camera, Image as ImageIcon, User as UserIcon, AtSign, Info, Users } from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate, Link } from 'react-router-dom';

export const Profile: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
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
  const [loadingListings, setLoadingListings] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    bio: '',
    locationName: '',
    avatarUrl: '',
    bannerUrl: ''
  });

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchUserStats();
      fetchUserListings();
    } else {
      navigate('/login');
    }
  }, [user]);

  const fetchUserListings = async () => {
    if (!user) return;
    setLoadingListings(true);
    try {
      const { data } = await supabase
        .from('listings')
        .select('*')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });
      
      setUserListings(data || []);
    } catch (error) {
      console.error('Error fetching user listings:', error);
    } finally {
      setLoadingListings(false);
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
        bannerUrl: data.banner_url || ''
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

  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-sm">
        {/* Profile Header */}
        <div className="h-48 bg-stone-100 relative group">
          {formData.bannerUrl ? (
            <img src={formData.bannerUrl} className="w-full h-full object-cover" alt="Banner" />
          ) : (
            <div className="w-full h-full bg-crimson-600" />
          )}
          <button 
            onClick={() => document.getElementById('banner-upload')?.click()}
            className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white gap-2 font-bold"
          >
            <Camera className="w-6 h-6" />
            Change Banner
          </button>
          <input id="banner-upload" type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'banner')} />
          
          <div className="absolute -bottom-16 left-8">
            <div className="relative group/avatar">
              <div className="w-32 h-32 bg-white rounded-3xl border-4 border-white shadow-xl overflow-hidden flex items-center justify-center">
                {formData.avatarUrl ? (
                  <img src={formData.avatarUrl} className="w-full h-full object-cover" alt="Avatar" />
                ) : (
                  <UserIcon className="w-16 h-16 text-stone-300" />
                )}
              </div>
              <button 
                onClick={() => document.getElementById('avatar-upload')?.click()}
                className="absolute inset-0 bg-black/40 rounded-3xl opacity-0 group-hover/avatar:opacity-100 transition-opacity flex items-center justify-center text-white"
              >
                <Camera className="w-6 h-6" />
              </button>
              <input id="avatar-upload" type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'avatar')} />
            </div>
          </div>
        </div>

        <div className="pt-20 pb-8 px-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-stone-900">
                {formData.name || user.email?.split('@')[0]}
              </h1>
              {formData.username && (
                <span className="text-stone-400 font-medium">@{formData.username}</span>
              )}
            </div>
            
            {formData.bio && (
              <p className="text-stone-600 max-w-lg">{formData.bio}</p>
            )}

            <div className="flex flex-wrap items-center gap-4 text-stone-500 pt-2">
              <div className="flex items-center gap-1.5">
                <Mail className="w-4 h-4" />
                <span className="text-sm">{user.email}</span>
              </div>
              {formData.locationName && (
                <div className="flex items-center gap-1.5 text-crimson-600 font-medium">
                  <MapPin className="w-4 h-4" />
                  <span className="text-sm">{formData.locationName}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 text-stone-400">
                <Calendar className="w-4 h-4" />
                <span className="text-xs uppercase tracking-wider font-bold">
                  Joined {new Date(user.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-6 pt-4">
              <div className="flex items-center gap-2">
                <span className="font-bold text-stone-900">{stats.followersCount}</span>
                <span className="text-stone-500 text-sm">Followers</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-stone-900">{stats.followingCount}</span>
                <span className="text-stone-500 text-sm">Following</span>
              </div>
              <Link to={`/profile/${user.id}`} className="text-crimson-600 text-sm font-bold hover:underline ml-2">
                View Public Profile
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm space-y-4"
        >
          <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center">
            <Package className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="text-stone-500 text-sm font-medium">Active Listings</p>
            <p className="text-3xl font-bold text-stone-900">{loading ? '...' : stats.listingsCount}</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm space-y-4"
        >
          <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center">
            <ShoppingCart className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <p className="text-stone-500 text-sm font-medium">Completed Sales</p>
            <p className="text-3xl font-bold text-stone-900">{loading ? '...' : stats.salesCount}</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm space-y-4"
        >
          <div className="w-12 h-12 bg-crimson-50 rounded-2xl flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-crimson-600" />
          </div>
          <div>
            <p className="text-stone-500 text-sm font-medium">Verification Status</p>
            <p className="text-lg font-bold text-crimson-600 uppercase tracking-tight">Verified Student</p>
          </div>
        </motion.div>
      </div>

      {/* Profile Customization */}
      <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm space-y-8">
        <div>
          <h2 className="text-xl font-bold text-stone-900 mb-6 flex items-center gap-2">
            <UserIcon className="w-5 h-5 text-crimson-600" />
            Customize Profile
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

      {/* Account Settings */}
      <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm space-y-8">
        <div>
          <h2 className="text-xl font-bold text-stone-900 mb-6 flex items-center justify-between">
            Active Listings
            <Link to="/my-listings" className="text-sm text-crimson-600 hover:underline">Manage All</Link>
          </h2>
          
          {loadingListings ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="aspect-square bg-stone-100 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : userListings.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {userListings.slice(0, 4).map((listing) => (
                <Link 
                  key={listing.id} 
                  to={`/listing/${listing.id}`}
                  className="group relative aspect-square rounded-2xl overflow-hidden border border-stone-200"
                >
                  <img src={listing.image_url} className="w-full h-full object-cover transition-transform group-hover:scale-110" alt="" referrerPolicy="no-referrer" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                    <p className="text-white text-xs font-bold truncate">${listing.price}</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-stone-50 rounded-2xl border border-dashed border-stone-200">
              <p className="text-stone-500 text-sm">No active listings yet.</p>
              <Link to="/create" className="text-crimson-600 text-sm font-bold hover:underline mt-2 inline-block">Create one now</Link>
            </div>
          )}
        </div>
      </div>

      {/* Account Settings */}
      <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm space-y-8">
        <div>
          <h2 className="text-xl font-bold text-stone-900 mb-6">Preferences</h2>
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-stone-50 rounded-2xl border border-stone-100">
              <div>
                <p className="font-bold text-stone-900">Email Notifications</p>
                <p className="text-sm text-stone-500">Receive alerts for new messages and sales.</p>
              </div>
              <div className="w-12 h-6 bg-crimson-600 rounded-full relative cursor-pointer">
                <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-stone-50 rounded-2xl border border-stone-100">
              <div>
                <p className="font-bold text-stone-900">Public Profile</p>
                <p className="text-sm text-stone-500">Allow others to see your active listings and followers.</p>
              </div>
              <div className="w-12 h-6 bg-crimson-600 rounded-full relative cursor-pointer">
                <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-stone-100 flex items-center justify-between">
          <p className="text-sm text-stone-400">Manage your account and privacy settings.</p>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-6 py-2.5 bg-red-50 text-red-600 rounded-xl font-bold hover:bg-red-100 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};
