import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../components/AuthProvider';
import { User, Mail, Package, ShoppingCart, LogOut, Calendar, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';

export const Profile: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    listingsCount: 0,
    salesCount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchUserStats();
    } else {
      navigate('/login');
    }
  }, [user]);

  const fetchUserStats = async () => {
    setLoading(true);
    try {
      // Fetch listings count
      const { count: listingsCount, error: listingsError } = await supabase
        .from('listings')
        .select('*', { count: 'exact', head: true })
        .eq('seller_id', user?.id);

      if (listingsError) throw listingsError;

      // Fetch completed sales count
      const { count: salesCount, error: salesError } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('seller_id', user?.id);

      if (salesError) throw salesError;

      setStats({
        listingsCount: listingsCount || 0,
        salesCount: salesCount || 0,
      });
    } catch (error) {
      console.error('Error fetching user stats:', error);
    } finally {
      setLoading(false);
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
        <div className="h-32 bg-crimson-600 relative">
          <div className="absolute -bottom-12 left-8">
            <div className="w-24 h-24 bg-white rounded-2xl border-4 border-white shadow-xl flex items-center justify-center">
              <User className="w-12 h-12 text-stone-300" />
            </div>
          </div>
        </div>

        <div className="pt-16 pb-8 px-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-stone-900">
              {user.user_metadata?.full_name || user.email?.split('@')[0]}
            </h1>
            <div className="flex items-center gap-2 text-stone-500">
              <Mail className="w-4 h-4" />
              <span className="text-sm">{user.email}</span>
            </div>
            <div className="flex items-center gap-2 text-stone-400 mt-2">
              <Calendar className="w-4 h-4" />
              <span className="text-xs uppercase tracking-wider font-bold">
                Joined {new Date(user.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
              </span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-6 py-2.5 bg-stone-100 text-stone-700 rounded-xl font-bold hover:bg-stone-200 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
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

      {/* Account Settings Placeholder */}
      <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm">
        <h2 className="text-xl font-bold text-stone-900 mb-6">Account Settings</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-stone-50 rounded-2xl border border-stone-100">
            <div>
              <p className="font-bold text-stone-900">Email Notifications</p>
              <p className="text-sm text-stone-500">Receive alerts for new messages and sales.</p>
            </div>
            <div className="w-12 h-6 bg-crimson-600 rounded-full relative">
              <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div>
            </div>
          </div>
          <div className="flex items-center justify-between p-4 bg-stone-50 rounded-2xl border border-stone-100">
            <div>
              <p className="font-bold text-stone-900">Public Profile</p>
              <p className="text-sm text-stone-500">Allow others to see your active listings.</p>
            </div>
            <div className="w-12 h-6 bg-crimson-600 rounded-full relative">
              <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
