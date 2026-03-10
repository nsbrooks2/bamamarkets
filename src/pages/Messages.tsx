import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../components/AuthProvider';
import { Message, User } from '../types';
import { MessageSquare, Send, User as UserIcon, ShoppingBag } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatDistanceToNow } from 'date-fns';

export const Messages: React.FC = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConv, setSelectedConv] = useState<any | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);

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
            setMessages(prev => [...prev, msg]);
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
          sender:users!messages_sender_id_fkey(*),
          receiver:users!messages_receiver_id_fkey(*)
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
      if (uniqueConvs.length > 0 && !selectedConv) {
        setSelectedConv(uniqueConvs[0]);
      }
    } catch (err) {
      console.error('Error fetching conversations:', err);
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

      setNewMessage('');
    } catch (err: any) {
      alert('Error sending message: ' + err.message);
    }
  };

  if (!user) return <div className="text-center py-20">Please log in to view messages.</div>;

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-12rem)] min-h-[600px]">
      <div className="bg-white rounded-3xl border border-stone-200 shadow-xl overflow-hidden flex h-full">
        {/* Sidebar */}
        <div className="w-full md:w-80 border-r border-stone-200 flex flex-col">
          <div className="p-6 border-b border-stone-200">
            <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-crimson-600" />
              Messages
            </h2>
          </div>
          <div className="flex-grow overflow-y-auto">
            {loading ? (
              <div className="p-4 space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 bg-stone-50 rounded-xl animate-pulse"></div>
                ))}
              </div>
            ) : conversations.length > 0 ? (
              conversations.map((conv) => (
                <button
                  key={`${conv.listing_id}-${conv.other_user.id}`}
                  onClick={() => setSelectedConv(conv)}
                  className={`w-full p-4 flex items-center gap-4 hover:bg-stone-50 transition-colors border-b border-stone-50 text-left ${
                    selectedConv?.listing_id === conv.listing_id && selectedConv?.other_user.id === conv.other_user.id
                      ? 'bg-crimson-50 border-crimson-100'
                      : ''
                  }`}
                >
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-stone-100 shrink-0">
                    {conv.listing?.image_url ? (
                      <img src={conv.listing.image_url} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-stone-300">
                        <ShoppingBag className="w-6 h-6" />
                      </div>
                    )}
                  </div>
                  <div className="flex-grow min-w-0">
                    <p className="font-bold text-stone-900 truncate">{conv.listing?.title}</p>
                    <p className="text-xs text-stone-500 truncate">with {conv.other_user.email.split('@')[0]}</p>
                    <p className="text-xs text-stone-400 mt-1 truncate">{conv.last_message}</p>
                  </div>
                </button>
              ))
            ) : (
              <div className="p-8 text-center text-stone-400">
                <p>No conversations yet.</p>
              </div>
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="hidden md:flex flex-grow flex-col bg-stone-50/50">
          {selectedConv ? (
            <>
              {/* Chat Header */}
              <div className="p-4 bg-white border-b border-stone-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-stone-100 p-2 rounded-xl">
                    <UserIcon className="w-5 h-5 text-stone-400" />
                  </div>
                  <div>
                    <p className="font-bold text-stone-900">{selectedConv.other_user.email.split('@')[0]}</p>
                    <p className="text-xs text-stone-500">Discussing {selectedConv.listing?.title}</p>
                  </div>
                </div>
              </div>

              {/* Messages List */}
              <div className="flex-grow overflow-y-auto p-6 space-y-4">
                <AnimatePresence initial={false}>
                  {messages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${msg.sender_id === user.id ? 'justify-end' : 'justify-start'}`}
                    >
                      <div 
                        className={`max-w-[70%] p-4 rounded-2xl shadow-sm ${
                          msg.sender_id === user.id 
                            ? 'bg-crimson-600 text-white rounded-tr-none' 
                            : 'bg-white text-stone-900 rounded-tl-none border border-stone-200'
                        }`}
                      >
                        <p className="text-sm leading-relaxed">{msg.message}</p>
                        <p className={`text-[10px] mt-2 font-medium ${msg.sender_id === user.id ? 'text-crimson-100' : 'text-stone-400'}`}>
                          {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {/* Input Area */}
              <div className="p-4 bg-white border-t border-stone-200">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <input 
                    type="text"
                    placeholder="Type your message..."
                    className="flex-grow px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-crimson-400 outline-none"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                  />
                  <button 
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="p-3 bg-crimson-600 text-white rounded-xl hover:bg-crimson-700 transition-all disabled:opacity-50 shadow-lg shadow-crimson-100"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-grow flex items-center justify-center text-stone-400 flex-col gap-4">
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-200">
                <MessageSquare className="w-12 h-12 text-stone-200" />
              </div>
              <p className="font-medium">Select a conversation to start chatting</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
