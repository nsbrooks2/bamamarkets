import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../components/AuthProvider';
import { Notification } from '../types';
import { Bell, MessageSquare, Heart, Zap, Check, Trash2, AlertCircle, Users, ChevronRight, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';

export const Notifications: React.FC = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      subscribeToNotifications();
    }
  }, [user]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToNotifications = () => {
    const channel = supabase
      .channel(`notifications:${user?.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user?.id}`
        },
        (payload) => {
          setNotifications((prev) => [payload.new as Notification, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id);

      if (error) throw error;
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user?.id)
        .eq('read', false);

      if (error) throw error;
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'message':
        return <MessageSquare className="w-5 h-5 text-blue-500" />;
      case 'favorite':
        return <Heart className="w-5 h-5 text-crimson-600 fill-crimson-600" />;
      case 'price_drop':
        return <Zap className="w-5 h-5 text-amber-500 fill-amber-500" />;
      case 'offer':
        return <Zap className="w-5 h-5 text-amber-500 fill-amber-500" />;
      case 'follow':
        return <Users className="w-5 h-5 text-emerald-500" />;
      case 'system':
        return <Bell className="w-5 h-5 text-blue-500" />;
      case 'review':
        return <Star className="w-5 h-5 text-amber-500 fill-amber-500" />;
      default:
        return <Bell className="w-5 h-5 text-stone-500" />;
    }
  };

  const getAction = (notification: Notification) => {
    if (notification.type === 'system' && notification.content.includes('review')) {
      let reviewLink = notification.link || '#';
      // Fallback for old notifications that point to /listing/ID
      if (reviewLink.startsWith('/listing/')) {
        const listingId = reviewLink.split('/').pop();
        reviewLink = `/profile?review=${listingId}`;
      }
      
      return (
        <Link 
          to={reviewLink} 
          className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-crimson-600 text-white text-xs font-bold rounded-lg hover:bg-crimson-700 transition-colors"
        >
          <Star className="w-3.5 h-3.5 fill-white" />
          Leave a Review
        </Link>
      );
    }
    if (notification.link) {
      return (
        <Link 
          to={notification.link} 
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-crimson-600 hover:underline"
        >
          View Details
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      );
    }
    return null;
  };

  if (!user) {
    return (
      <div className="text-center py-20">
        <Bell className="w-16 h-16 text-stone-200 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-stone-900">Please log in to see your notifications.</h2>
        <Link 
          to="/login"
          className="mt-4 inline-block px-6 py-2 bg-crimson-600 text-white rounded-lg font-bold"
        >
          Go to Login
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 md:space-y-10 pb-20 md:pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="bg-stone-100 p-3 md:p-4 rounded-xl md:rounded-2xl">
            <Bell className="w-5 h-5 md:w-6 md:h-6 text-stone-600" />
          </div>
          <div>
            <h1 className="text-2xl md:text-4xl font-display font-bold text-stone-900 tracking-tight">Notifications</h1>
            <p className="text-stone-500 text-[10px] md:text-sm mt-0.5 md:mt-1">Stay updated on your marketplace activity.</p>
          </div>
        </div>
        
        {notifications.some(n => !n.read) && (
          <button 
            onClick={markAllAsRead}
            className="text-[10px] md:text-sm font-bold text-crimson-600 hover:text-crimson-700 transition-all flex items-center justify-center gap-2 px-4 py-2 bg-crimson-50 rounded-xl w-full md:w-auto"
          >
            <Check className="w-3.5 h-3.5 md:w-4 md:h-4" />
            Mark all as read
          </button>
        )}
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-crimson-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-stone-500">Loading notifications...</p>
          </div>
        ) : notifications.length > 0 ? (
          <AnimatePresence initial={false}>
            {notifications.map((notification) => (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className={`p-6 rounded-3xl border transition-all flex items-start gap-5 group ${
                  notification.read 
                    ? 'bg-white border-stone-100 hover:border-stone-200' 
                    : 'bg-crimson-50/20 border-crimson-100 shadow-sm'
                }`}
              >
                <div className={`p-2.5 md:p-3 rounded-xl md:rounded-2xl shrink-0 ${notification.read ? 'bg-stone-50' : 'bg-white shadow-sm'}`}>
                  {getIcon(notification.type)}
                </div>
                
                <div className="flex-grow min-w-0">
                  <div className="flex items-start justify-between gap-3 md:gap-4">
                    <div className="space-y-1">
                      <p className={`text-sm md:text-base leading-relaxed ${notification.read ? 'text-stone-600' : 'text-stone-900 font-semibold'}`}>
                        {notification.content}
                      </p>
                      <div className="flex items-center gap-3">
                        <span className="text-[9px] md:text-[10px] text-stone-400 font-bold uppercase tracking-widest">
                          {formatDistanceToNow(new Date(notification.at || notification.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 md:gap-2 md:opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      {!notification.read && (
                        <button 
                          onClick={() => markAsRead(notification.id)}
                          className="p-1.5 md:p-2 bg-stone-50 text-stone-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg md:rounded-xl transition-all"
                          title="Mark as read"
                        >
                          <Check className="w-3.5 h-3.5 md:w-4 md:h-4" />
                        </button>
                      )}
                      <button 
                        onClick={() => deleteNotification(notification.id)}
                        className="p-1.5 md:p-2 bg-stone-50 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg md:rounded-xl transition-all"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                      </button>
                    </div>
                  </div>
                  
                  {getAction(notification)}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        ) : (
          <div className="text-center py-20 bg-stone-50 rounded-3xl border border-dashed border-stone-200">
            <AlertCircle className="w-12 h-12 text-stone-300 mx-auto mb-4" />
            <p className="text-stone-500 font-medium">No notifications yet.</p>
            <p className="text-sm text-stone-400">We'll let you know when something happens.</p>
          </div>
        )}
      </div>
    </div>
  );
};
