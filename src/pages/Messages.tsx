import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../components/AuthProvider';
import { useSearchParams, Link } from 'react-router-dom';
import { Message, User } from '../types';
import { MessageSquare, Send, User as UserIcon, ShoppingBag, ExternalLink, ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatDistanceToNow } from 'date-fns';

export const Messages: React.FC = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const listingIdParam = searchParams.get('listingId');
  const userIdParam = searchParams.get('userId');
  
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConv, setSelectedConv] = useState<any | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (user) fetchConversations();
  }, [user]);

  useEffect(() => {
    if (selectedConv) {
      fetchMessages(selectedConv.listing_id, selectedConv.other_user.id);
      
      // Subscribe to new messages
      const channel = supabase
        .channel('messages')
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages',
          filter: `listing_id=eq.${selectedConv.listing_id}`
        }, (payload) => {
          const msg = payload.new as Message;
          if (
            (msg.sender_id === user?.id && msg.receiver_id === selectedConv.other_user.id) ||
            (msg.sender_id === selectedConv.other_user.id && msg.receiver_id === user?.id)
          ) {
            setMessages(prev => {
              // Prevent duplicates
              if (prev.some(m => m.id === msg.id)) return prev;
              return [...prev, msg];
            });
          }
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [selectedConv, user]);

  const fetchConversations = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // This is a bit complex for a simple query, but we want unique conversations per listing + user
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          listing:listings(title, image_url),
          sender:profiles!sender_id(*),
          receiver:profiles!receiver_id(*)
        `)
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group by listing_id and other user
      const uniqueConvs: any[] = [];
      const seen = new Set();

      data?.forEach(msg => {
        const otherUser = msg.sender_id === user.id ? msg.receiver : msg.sender;
        const key = `${msg.listing_id}-${otherUser.id}`;
        if (!seen.has(key)) {
          seen.add(key);
          uniqueConvs.push({
            listing_id: msg.listing_id,
            listing: msg.listing,
            other_user: otherUser,
            last_message: msg.message,
            last_date: msg.created_at
          });
        }
      });

      setConversations(uniqueConvs);
      setError(null);
      
      // Handle auto-selection from search params
      if (listingIdParam && userIdParam) {
        const targetConv = uniqueConvs.find(c => 
          c.listing_id === listingIdParam && c.other_user.id === userIdParam
        );
        if (targetConv) {
          setSelectedConv(targetConv);
        } else if (uniqueConvs.length > 0 && !selectedConv) {
          setSelectedConv(uniqueConvs[0]);
        }
      } else if (uniqueConvs.length > 0 && !selectedConv) {
        setSelectedConv(uniqueConvs[0]);
      }
    } catch (err: any) {
      console.error('Error fetching conversations:', err);
      setError(err.message || 'Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (listingId: string, otherUserId: string) => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('listing_id', listingId)
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (err) {
      console.error('Error fetching messages:', err);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedConv || !newMessage.trim()) return;

    try {
      const response = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId: selectedConv.listing_id,
          senderId: user.id,
          receiverId: selectedConv.other_user.id,
          message: newMessage.trim()
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to send message');
      }

      const sentMsg = await response.json();
      setMessages(prev => {
        if (prev.some(m => m.id === sentMsg.id)) return prev;
        return [...prev, sentMsg];
      });
      setNewMessage('');
    } catch (err: any) {
      alert('Error sending message: ' + err.message);
    }
  };

  if (!user) return <div className="text-center py-20">Please log in to view messages.</div>;

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-12rem)] min-h-[500px] md:min-h-[600px]">
      <div className="bg-white md:rounded-3xl border-stone-200 md:border md:shadow-xl overflow-hidden flex h-full relative">
        {/* Sidebar */}
        <div className={`${selectedConv ? 'hidden md:flex' : 'flex'} w-full md:w-96 border-r border-stone-200 flex-col bg-white`}>
          <div className="p-6 md:p-8 border-b border-stone-200">
            <h2 className="text-xl md:text-2xl font-display font-bold text-stone-900 flex items-center gap-3 tracking-tight">
              <div className="bg-crimson-50 p-2 rounded-xl">
                <MessageSquare className="w-5 h-5 text-crimson-600" />
              </div>
              Messages
            </h2>
          </div>
          <div className="flex-grow overflow-y-auto">
            {error ? (
              <div className="p-8 text-center text-crimson-600 bg-crimson-50 m-6 rounded-3xl border border-crimson-100">
                <p className="font-bold">Error</p>
                <p className="text-xs mt-1">{error}</p>
                <button 
                  onClick={() => fetchConversations()}
                  className="mt-4 px-5 py-2.5 bg-crimson-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-crimson-100"
                >
                  Retry
                </button>
              </div>
            ) : loading ? (
              <div className="p-6 space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-20 bg-stone-50 rounded-2xl animate-pulse"></div>
                ))}
              </div>
            ) : conversations.length > 0 ? (
              conversations.map((conv) => (
                <button
                  key={`${conv.listing_id}-${conv.other_user.id}`}
                  onClick={() => setSelectedConv(conv)}
                  className={`w-full p-6 flex items-center gap-4 hover:bg-stone-50 transition-all border-b border-stone-50 text-left relative group ${
                    selectedConv?.listing_id === conv.listing_id && selectedConv?.other_user.id === conv.other_user.id
                      ? 'bg-crimson-50/50'
                      : ''
                  }`}
                >
                  {selectedConv?.listing_id === conv.listing_id && selectedConv?.other_user.id === conv.other_user.id && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-crimson-600" />
                  )}
                  <div className="w-14 h-14 rounded-2xl overflow-hidden bg-stone-100 shrink-0 border border-stone-200 shadow-sm group-hover:scale-105 transition-transform">
                    {conv.listing?.image_url ? (
                      <img src={conv.listing.image_url} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-stone-300">
                        <ShoppingBag className="w-6 h-6" />
                      </div>
                    )}
                  </div>
                  <div className="flex-grow min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <p className="font-bold text-stone-900 truncate group-hover:text-crimson-700 transition-colors">{conv.listing?.title}</p>
                    </div>
                    <p className="text-xs text-stone-500 truncate mb-1.5">with {conv.other_user.full_name || conv.other_user.username || conv.other_user.email.split('@')[0]}</p>
                    <p className="text-xs text-stone-400 truncate font-medium">{conv.last_message}</p>
                  </div>
                </button>
              ))
            ) : (
              <div className="p-12 text-center text-stone-400">
                <div className="bg-stone-50 w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="w-8 h-8 text-stone-200" />
                </div>
                <p className="font-medium">No conversations yet.</p>
              </div>
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className={`${selectedConv ? 'flex' : 'hidden md:flex'} flex-grow flex-col bg-stone-50/30`}>
          {selectedConv ? (
            <>
              {/* Chat Header */}
              <div className="p-4 md:p-6 bg-white border-b border-stone-200 flex items-center justify-between shadow-sm z-10">
                <div className="flex items-center gap-3 md:gap-4">
                  <button 
                    onClick={() => setSelectedConv(null)}
                    className="md:hidden p-2 -ml-2 hover:bg-stone-100 rounded-full transition-colors"
                  >
                    <ChevronLeft className="w-6 h-6 text-stone-600" />
                  </button>
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl overflow-hidden bg-stone-100 border border-stone-200 shadow-sm">
                    {selectedConv.other_user.avatar_url ? (
                      <img src={selectedConv.other_user.avatar_url} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-stone-400">
                        <UserIcon className="w-6 h-6" />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-display font-bold text-stone-900 text-base md:text-lg tracking-tight">
                      {selectedConv.other_user.full_name || selectedConv.other_user.username || selectedConv.other_user.email.split('@')[0]}
                    </p>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] md:text-xs text-stone-500 font-medium">Discussing</span>
                      <Link 
                        to={`/listing/${selectedConv.listing_id}`}
                        className="text-[10px] md:text-xs font-bold text-crimson-600 hover:text-crimson-700 flex items-center gap-0.5 transition-colors"
                      >
                        {selectedConv.listing?.title}
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                </div>

                {selectedConv.listing?.image_url && (
                  <Link to={`/listing/${selectedConv.listing_id}`} className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl overflow-hidden border border-stone-200 hover:shadow-md transition-all group">
                    <img src={selectedConv.listing.image_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="" referrerPolicy="no-referrer" />
                  </Link>
                )}
              </div>

              {/* Messages List */}
              <div className="flex-grow overflow-y-auto p-4 md:p-8 space-y-4 md:space-y-6 custom-scrollbar">
                <AnimatePresence initial={false}>
                  {messages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      className={`flex ${msg.sender_id === user.id ? 'justify-end' : 'justify-start'}`}
                    >
                      <div 
                        className={`max-w-[85%] md:max-w-[75%] p-4 md:p-5 rounded-2xl md:rounded-3xl shadow-sm ${
                          msg.sender_id === user.id 
                            ? 'bg-crimson-600 text-white rounded-tr-none shadow-crimson-100' 
                            : 'bg-white text-stone-900 rounded-tl-none border border-stone-200'
                        }`}
                      >
                        <p className="text-sm leading-relaxed font-medium">{msg.message}</p>
                        <p className={`text-[9px] md:text-[10px] mt-2 md:mt-3 font-bold uppercase tracking-widest opacity-70 ${msg.sender_id === user.id ? 'text-white' : 'text-stone-400'}`}>
                          {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-4 md:p-6 bg-white border-t border-stone-200 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
                <form onSubmit={handleSendMessage} className="flex gap-2 md:gap-3">
                  <input 
                    type="text"
                    placeholder="Type your message..."
                    className="flex-grow px-4 md:px-6 py-3 md:py-4 bg-stone-50 border border-stone-200 rounded-xl md:rounded-2xl focus:ring-2 focus:ring-crimson-400 outline-none transition-all hover:border-stone-300 font-medium text-sm md:text-base"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                  />
                  <button 
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="px-4 md:px-6 bg-crimson-600 text-white rounded-xl md:rounded-2xl hover:bg-crimson-700 transition-all disabled:opacity-50 shadow-xl shadow-crimson-100 flex items-center justify-center"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-grow flex items-center justify-center text-stone-400 flex-col gap-6">
              <div className="bg-white p-10 rounded-[40px] shadow-xl border border-stone-100">
                <MessageSquare className="w-16 h-16 text-stone-100" />
              </div>
              <div className="text-center">
                <p className="font-display font-bold text-stone-900 text-xl tracking-tight">Your Inbox</p>
                <p className="text-stone-500 text-sm mt-1">Select a conversation to start chatting</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
