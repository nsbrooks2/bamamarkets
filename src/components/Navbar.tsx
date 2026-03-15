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
    <nav className="bg-white/80 backdrop-blur-xl border-b border-stone-200 sticky top-0 z-50">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row md:items-center md:h-20 gap-2 md:gap-4 py-3 md:py-0">
          <div className="flex items-center justify-between w-full md:w-auto">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="p-1 bg-stone-50 rounded-xl border border-stone-100 group-hover:scale-110 transition-transform duration-300">
                <img 
                  src="https://image2url.com/r2/default/images/1773109092662-96a62cec-da16-4e55-8b35-10fc33a12886.png" 
                  alt="BamaMarkets Logo" 
                  className="w-8 h-8 md:w-10 md:h-10 object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-xl md:text-2xl font-display font-black tracking-tight text-stone-900 leading-none">BamaMarkets</span>
                <span className="text-[8px] md:text-[10px] font-black text-crimson-600 uppercase tracking-[0.2em]">The Capstone</span>
              </div>
            </Link>

            {/* Mobile-only user actions in header */}
            <div className="flex md:hidden items-center gap-3">
              {user && (
                <Link to="/notifications" className="relative p-2 text-stone-400">
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-crimson-600 rounded-full border border-white" />}
                </Link>
              )}
              <Link to="/profile" className="w-8 h-8 rounded-full overflow-hidden border border-stone-200">
                {avatarUrl ? (
                  <img src={avatarUrl} className="w-full h-full object-cover" alt="" />
                ) : (
                  <User className="w-full h-full p-1.5 text-stone-400" />
                )}
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-6 md:gap-8 overflow-x-auto no-scrollbar md:justify-center w-full md:w-auto py-2 md:py-0">
            {[
              { to: "/", icon: ShoppingBag, label: "Market" },
              { to: "/trending", icon: TrendingUp, label: "Trending" },
              { to: "/favorites", icon: Heart, label: "Saved" },
              { to: "/my-listings", icon: Package, label: "My Listings" },
              { to: "/create", icon: PlusCircle, label: "Sell" },
              { to: "/messages", icon: MessageSquare, label: "Chat" },
            ].map((item) => (
              <Link 
                key={item.to}
                to={item.to} 
                className="flex items-center gap-2 text-stone-500 hover:text-crimson-600 font-bold text-[10px] md:text-xs uppercase tracking-widest transition-all hover:-translate-y-0.5 whitespace-nowrap shrink-0"
              >
                <item.icon className="w-3.5 h-3.5 md:w-4 md:h-4" />
                {item.label}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center justify-end gap-4">
            {user ? (
              <div className="flex items-center gap-2 sm:gap-4">
                <Link to="/notifications" className="relative p-2.5 text-stone-400 hover:text-crimson-600 hover:bg-stone-50 rounded-full transition-all">
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-2 right-2 w-4 h-4 bg-crimson-600 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Link>
                <Link 
                  to="/profile"
                  className="flex items-center gap-3 p-1.5 bg-stone-50 rounded-full hover:bg-stone-100 transition-all border border-stone-200"
                >
                  <div className="w-8 h-8 bg-white rounded-full overflow-hidden flex items-center justify-center border border-stone-200 shadow-sm">
                    {avatarUrl ? (
                      <img src={avatarUrl} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <User className="w-4 h-4 text-stone-400" />
                    )}
                  </div>
                  <span className="text-xs font-black text-stone-900 truncate max-w-[100px] hidden sm:inline pr-2 uppercase tracking-wider">
                    {user.user_metadata?.full_name?.split(' ')[0] || user.email?.split('@')[0]}
                  </span>
                </Link>
                <button 
                  onClick={handleSignOut}
                  className="p-2.5 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all hidden sm:block"
                  title="Sign Out"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <Link 
                to="/login" 
                className="px-6 py-2.5 bg-stone-900 text-white rounded-xl font-bold text-sm hover:bg-stone-800 transition-all shadow-lg shadow-stone-200"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Navigation (Bottom Bar) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-stone-200 px-2 py-3 z-50 shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">
        <div className="flex justify-around items-center max-w-md mx-auto">
          <Link to="/" className="flex flex-col items-center gap-1 text-stone-400 hover:text-crimson-600 transition-colors">
            <img 
              src="https://image2url.com/r2/default/images/1773109092662-96a62cec-da16-4e55-8b35-10fc33a12886.png" 
              alt="Home" 
              className="w-6 h-6 object-contain"
              referrerPolicy="no-referrer"
            />
            <span className="text-[9px] font-black uppercase tracking-tighter">Home</span>
          </Link>
          <Link to="/favorites" className="flex flex-col items-center gap-1 text-stone-400 hover:text-crimson-600 transition-colors">
            <Heart className="w-5.5 h-5.5" />
            <span className="text-[9px] font-black uppercase tracking-tighter">Saved</span>
          </Link>
          <Link to="/create" className="flex flex-col items-center gap-1 text-stone-400 hover:text-crimson-600 transition-colors">
            <PlusCircle className="w-5.5 h-5.5" />
            <span className="text-[9px] font-black uppercase tracking-tighter">Sell</span>
          </Link>
          <Link to="/notifications" className="flex flex-col items-center gap-1 text-stone-400 hover:text-crimson-600 transition-colors relative">
            <Bell className="w-5.5 h-5.5" />
            {unreadCount > 0 && (
              <span className="absolute top-0 right-1 w-2.5 h-2.5 bg-crimson-600 rounded-full border-2 border-white"></span>
            )}
            <span className="text-[9px] font-black uppercase tracking-tighter">Alerts</span>
          </Link>
          <Link to="/messages" className="flex flex-col items-center gap-1 text-stone-400 hover:text-crimson-600 transition-colors">
            <MessageSquare className="w-5.5 h-5.5" />
            <span className="text-[9px] font-black uppercase tracking-tighter">Chat</span>
          </Link>
          <Link to="/profile" className="flex flex-col items-center gap-1 text-stone-400 hover:text-crimson-600 transition-colors">
            <User className="w-5.5 h-5.5" />
            <span className="text-[9px] font-black uppercase tracking-tighter">Profile</span>
          </Link>
        </div>
      </div>
    </nav>
  );
};
