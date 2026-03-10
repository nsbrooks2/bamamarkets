import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { ShoppingBag, MessageSquare, PlusCircle, User, LogOut, Search, TrendingUp, Package, Heart, Bell } from 'lucide-react';
import { supabase } from '../lib/supabase';

export const Navbar: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchUnreadCount();
      fetchUserProfile();
      subscribeToNotifications();
    }
  }, [user]);

  const fetchUserProfile = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('avatar_url')
      .eq('id', user?.id)
      .single();
    
    if (data?.avatar_url) {
      setAvatarUrl(data.avatar_url);
    }
  };

  const fetchUnreadCount = async () => {
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user?.id)
      .eq('read', false);
    
    setUnreadCount(count || 0);
  };

  const subscribeToNotifications = () => {
    const channel = supabase
      .channel(`navbar_notifications:${user?.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user?.id}`
        },
        () => {
          fetchUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <nav className="bg-white border-b border-stone-200 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center gap-2">
            <img 
              src="https://image2url.com/r2/default/images/1773109092662-96a62cec-da16-4e55-8b35-10fc33a12886.png" 
              alt="BamaMarkets Logo" 
              className="w-10 h-10 object-contain"
              referrerPolicy="no-referrer"
            />
            <div className="flex flex-col">
              <span className="text-xl font-bold tracking-tight text-stone-900 leading-none">BamaMarkets</span>
              <span className="text-[10px] font-bold text-crimson-600 uppercase tracking-widest">University of Alabama</span>
            </div>
          </Link>

          <div className="hidden lg:flex items-center gap-6">
            <Link to="/" className="flex items-center gap-1 text-stone-600 hover:text-crimson-600 font-medium transition-colors">
              <ShoppingBag className="w-4 h-4" />
              Home
            </Link>
            <Link to="/trending" className="flex items-center gap-1 text-stone-600 hover:text-crimson-600 font-medium transition-colors">
              <TrendingUp className="w-4 h-4" />
              Trending
            </Link>
            <Link to="/favorites" className="flex items-center gap-1 text-stone-600 hover:text-crimson-600 font-medium transition-colors">
              <Heart className="w-4 h-4" />
              Favorites
            </Link>
            <Link to="/create" className="flex items-center gap-1 text-stone-600 hover:text-crimson-600 font-medium transition-colors">
              <PlusCircle className="w-4 h-4" />
              Create
            </Link>
            <Link to="/my-listings" className="flex items-center gap-1 text-stone-600 hover:text-crimson-600 font-medium transition-colors">
              <Package className="w-4 h-4" />
              My Items
            </Link>
            <Link to="/messages" className="flex items-center gap-1 text-stone-600 hover:text-crimson-600 font-medium transition-colors">
              <MessageSquare className="w-4 h-4" />
              Messages
            </Link>
          </div>

          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-3 sm:gap-4">
                <Link to="/notifications" className="relative p-2 text-stone-400 hover:text-crimson-600 transition-colors">
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-crimson-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Link>
                <Link 
                  to="/profile"
                  className="flex items-center gap-2 p-1 bg-stone-100 rounded-full hover:bg-stone-200 transition-all"
                >
                  <div className="w-8 h-8 bg-white rounded-full overflow-hidden flex items-center justify-center border border-stone-200">
                    {avatarUrl ? (
                      <img src={avatarUrl} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <User className="w-4 h-4 text-stone-500" />
                    )}
                  </div>
                  <span className="text-sm font-medium text-stone-700 truncate max-w-[100px] hidden sm:inline pr-2">
                    {user.user_metadata?.full_name || user.email?.split('@')[0]}
                  </span>
                </Link>
                <button 
                  onClick={handleSignOut}
                  className="p-2 text-stone-400 hover:text-red-500 transition-colors hidden sm:block"
                  title="Sign Out"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <Link 
                to="/login" 
                className="px-4 py-2 bg-crimson-600 text-white rounded-lg font-medium hover:bg-crimson-700 transition-colors"
              >
                Login
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Navigation (Bottom Bar) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 px-2 py-3 z-50">
        <div className="flex justify-between items-center">
          <Link to="/" className="flex flex-col items-center gap-1 text-stone-400 hover:text-crimson-600">
            <img 
              src="https://image2url.com/r2/default/images/1773109092662-96a62cec-da16-4e55-8b35-10fc33a12886.png" 
              alt="Home" 
              className="w-6 h-6 object-contain"
              referrerPolicy="no-referrer"
            />
            <span className="text-[10px] font-bold uppercase tracking-tighter">Home</span>
          </Link>
          <Link to="/favorites" className="flex flex-col items-center gap-1 text-stone-400 hover:text-crimson-600">
            <Heart className="w-6 h-6" />
            <span className="text-[10px] font-bold uppercase tracking-tighter">Saved</span>
          </Link>
          <Link to="/create" className="flex flex-col items-center gap-1 text-stone-400 hover:text-crimson-600">
            <PlusCircle className="w-6 h-6" />
            <span className="text-[10px] font-bold uppercase tracking-tighter">Create</span>
          </Link>
          <Link to="/notifications" className="flex flex-col items-center gap-1 text-stone-400 hover:text-crimson-600 relative">
            <Bell className="w-6 h-6" />
            {unreadCount > 0 && (
              <span className="absolute top-0 right-1 w-3 h-3 bg-crimson-600 rounded-full border-2 border-white"></span>
            )}
            <span className="text-[10px] font-bold uppercase tracking-tighter">Alerts</span>
          </Link>
          <Link to="/messages" className="flex flex-col items-center gap-1 text-stone-400 hover:text-crimson-600">
            <MessageSquare className="w-6 h-6" />
            <span className="text-[10px] font-bold uppercase tracking-tighter">Chat</span>
          </Link>
          <Link to="/profile" className="flex flex-col items-center gap-1 text-stone-400 hover:text-crimson-600">
            <User className="w-6 h-6" />
            <span className="text-[10px] font-bold uppercase tracking-tighter">Profile</span>
          </Link>
        </div>
      </div>
    </nav>
  );
};
