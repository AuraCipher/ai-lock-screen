import { useState, useEffect, useRef, FormEvent } from 'react';
import { Send, Search, Phone, Video, Info, ArrowLeft, Lock, Unlock, Settings, MessageCircle, Users } from 'lucide-react';
import { Session } from '@supabase/supabase-js';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';

interface Message {
  id: string;
  content: string;
  user_id: string;
  recipient_id: string;
  created_at: string;
  is_locked: boolean;
  profiles?: {
    avatar_url: string;
    custom_chat_name: string;
  };
}

interface Profile {
  id: string;
  username: string;
  avatar_url: string;
  custom_chat_name: string;
  chat_locked: boolean;
  chat_locker_enabled: boolean;
  chat_locker_password: string;
}

interface ChatProps {
  session: Session;
}

export default function Chat({ session }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [users, setUsers] = useState<Profile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showLockedChats, setShowLockedChats] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchUsers();
    const channel = subscribeToMessages();
    return () => {
      channel?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (selectedUser) {
      fetchPrivateMessages();
    }
  }, [selectedUser]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchUsers = async () => {
    try {
      const { data: friendships, error: friendshipsError } = await supabase
        .from('friends')
        .select('user_id, friend_id')
        .or(`user_id.eq.${session.user.id},friend_id.eq.${session.user.id}`)
        .eq('status', 'accepted');

      if (friendshipsError) throw friendshipsError;

      const friendIds = friendships?.map((friendship: { user_id: string; friend_id: string }) => 
        friendship.user_id === session.user.id ? friendship.friend_id : friendship.user_id
      ) || [];

      if (friendIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles_public')
          .select('*')
          .in('id', friendIds);

        if (profilesError) throw profilesError;
        setUsers((profiles as Profile[]) || []);
      } else {
        setUsers([]);
      }
    } catch (error) {
      console.error('Error fetching friends:', error);
      toast.error('Error fetching friends');
    }
  };

  const fetchPrivateMessages = async () => {
    if (!selectedUser) return;

    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          profiles:profiles_public!messages_user_id_fkey (avatar_url, custom_chat_name)
        `)
        .or(`and(user_id.eq.${session.user.id},recipient_id.eq.${selectedUser}),and(user_id.eq.${selectedUser},recipient_id.eq.${session.user.id})`)
        .eq('is_private', true)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages((data as Message[]) || []);

      const unreadMessages = data?.filter((msg: Message) => 
        msg.recipient_id === session.user.id && !(msg as { is_read?: boolean }).is_read
      ) || [];

      if (unreadMessages.length > 0) {
        const { error: updateError } = await supabase
          .from('messages')
          .update({ is_read: true })
          .in('id', unreadMessages.map((msg: Message) => msg.id));

        if (updateError) throw updateError;
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Error fetching messages');
    }
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel('chat-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `recipient_id=eq.${session.user.id}`,
        },
        (payload) => {
          const newMsg = payload.new as Message & { is_private?: boolean };
          if (newMsg.is_private && 
              ((newMsg.user_id === session.user.id && newMsg.recipient_id === selectedUser) || 
               (newMsg.user_id === selectedUser && newMsg.recipient_id === session.user.id))) {
            setMessages(current => [...current, newMsg]);
            scrollToBottom();
          }
        }
      )
      .subscribe();

    return channel;
  };

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('chat_locked, chat_password')
        .eq('id', session.user.id)
        .single();

      if (profile?.chat_locked) {
        toast.error('Your chat is locked. Please unlock it in settings first.');
        return;
      }

      const newMsg = {
        content: newMessage,
        user_id: session.user.id,
        is_private: true,
        recipient_id: selectedUser,
        is_locked: profile?.chat_locked || false,
        created_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('messages')
        .insert([newMsg]);

      if (error) throw error;

      setMessages(current => [...current, {
        ...newMsg,
        id: crypto.randomUUID(),
        profiles: {
          avatar_url: users.find(u => u.id === session.user.id)?.avatar_url || '',
          custom_chat_name: users.find(u => u.id === session.user.id)?.custom_chat_name || '',
        }
      }]);
      
      setNewMessage('');
      scrollToBottom();
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Error sending message');
    }
  };

  const toggleChatLock = async (userId: string) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('chat_locked, chat_locker_enabled, chat_locker_password')
        .eq('id', userId)
        .single();

      if (profile) {
        if (profile.chat_locker_enabled && !profile.chat_locked) {
          const { error } = await supabase
            .from('profiles')
            .update({ 
              chat_locked: true,
              chat_password: profile.chat_locker_password 
            })
            .eq('id', userId);

          if (error) throw error;
          toast.success('Chat moved to locker');
        } else if (profile.chat_locked) {
          const { error } = await supabase
            .from('profiles')
            .update({ 
              chat_locked: false,
              chat_password: null
            })
            .eq('id', userId);

          if (error) throw error;
          toast.success('Chat moved to normal');
        } else {
          toast.error('Please enable chat locker in settings first');
        }
        fetchUsers();
      }
    } catch (error) {
      console.error('Error toggling chat lock:', error);
      toast.error('Error toggling chat lock');
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.custom_chat_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.username?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLockStatus = showLockedChats ? user.chat_locked : !user.chat_locked;
    return matchesSearch && matchesLockStatus;
  });

  const selectedUserData = users.find(u => u.id === selectedUser);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-[calc(100vh-10rem)] sm:h-[calc(100vh-12rem)] bg-card rounded-2xl shadow-xl overflow-hidden border border-border"
    >
      <AnimatePresence mode="wait">
        {!selectedUser ? (
          <motion.div
            key="user-list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col h-full"
          >
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-border bg-card/50 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                    <MessageCircle className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-foreground">Messages</h2>
                    <p className="text-xs text-muted-foreground">{users.length} conversations</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowLockedChats(!showLockedChats)}
                    className={`p-2 sm:p-2.5 rounded-xl transition-all ${
                      showLockedChats 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                    }`}
                  >
                    {showLockedChats ? <Lock className="h-4 w-4 sm:h-5 sm:w-5" /> : <Unlock className="h-4 w-4 sm:h-5 sm:w-5" />}
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="p-2 sm:p-2.5 hover:bg-muted rounded-xl transition-colors"
                  >
                    <Settings className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                  </motion.button>
                </div>
              </div>
              
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 sm:py-3 bg-muted/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground text-sm"
                />
              </div>
            </div>

            {/* User list */}
            <div className="flex-1 overflow-y-auto">
              {filteredUsers.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                    <Users className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                  <p className="text-muted-foreground text-sm">No conversations yet</p>
                  <p className="text-muted-foreground/70 text-xs mt-1">Add friends to start chatting</p>
                </div>
              ) : (
                filteredUsers.map((user, index) => (
                  <motion.div
                    key={user.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="group"
                  >
                    <div className="flex items-center gap-3 p-3 sm:p-4 hover:bg-muted/50 transition-colors border-b border-border/50">
                      <button
                        onClick={() => setSelectedUser(user.id)}
                        className="flex items-center gap-3 flex-1 min-w-0"
                      >
                        <div className="relative flex-shrink-0">
                          <img
                            src={user.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${user.id}`}
                            alt=""
                            className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover ring-2 ring-border"
                          />
                          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full ring-2 ring-card" />
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <h3 className="font-semibold text-foreground truncate text-sm sm:text-base">
                            {user.custom_chat_name || user.username}
                          </h3>
                          <p className="text-xs sm:text-sm text-muted-foreground truncate">
                            Tap to start chatting
                          </p>
                        </div>
                      </button>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => toggleChatLock(user.id)}
                        className={`p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100 ${
                          user.chat_locked
                            ? 'bg-primary/10 text-primary'
                            : 'hover:bg-muted text-muted-foreground'
                        }`}
                      >
                        {user.chat_locked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                      </motion.button>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="chat-view"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col h-full"
          >
            {/* Chat header */}
            <div className="flex items-center gap-3 p-3 sm:p-4 border-b border-border bg-card/50 backdrop-blur-sm">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedUser(null)}
                className="p-2 hover:bg-muted rounded-xl transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-muted-foreground" />
              </motion.button>
              <img
                src={selectedUserData?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${selectedUserData?.id}`}
                alt=""
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-full object-cover ring-2 ring-border"
              />
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground truncate text-sm sm:text-base">
                  {selectedUserData?.custom_chat_name || selectedUserData?.username}
                </h3>
                <p className="text-xs text-green-500 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                  Active now
                </p>
              </div>
              <div className="flex items-center gap-1">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="p-2 hover:bg-muted rounded-xl transition-colors hidden sm:flex"
                >
                  <Phone className="h-5 w-5 text-muted-foreground" />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="p-2 hover:bg-muted rounded-xl transition-colors hidden sm:flex"
                >
                  <Video className="h-5 w-5 text-muted-foreground" />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="p-2 hover:bg-muted rounded-xl transition-colors"
                >
                  <Info className="h-5 w-5 text-muted-foreground" />
                </motion.button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 bg-muted/20">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                    <MessageCircle className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                  <p className="text-muted-foreground text-sm">No messages yet</p>
                  <p className="text-muted-foreground/70 text-xs mt-1">Say hi to start the conversation!</p>
                </div>
              ) : (
                messages.map((message, index) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className={`flex ${message.user_id === session.user.id ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] sm:max-w-[70%] rounded-2xl px-4 py-2.5 ${
                        message.user_id === session.user.id
                          ? 'bg-primary text-primary-foreground rounded-br-md'
                          : 'bg-card text-foreground border border-border rounded-bl-md'
                      }`}
                    >
                      <p className="text-sm break-words">{message.content}</p>
                      <p className={`text-[10px] mt-1 ${
                        message.user_id === session.user.id ? 'text-primary-foreground/70' : 'text-muted-foreground'
                      }`}>
                        {new Date(message.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </motion.div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message input */}
            <form onSubmit={handleSendMessage} className="p-3 sm:p-4 bg-card border-t border-border">
              <div className="flex items-center gap-2 sm:gap-3">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2.5 sm:py-3 bg-muted/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground text-sm"
                />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="p-2.5 sm:p-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-primary/25"
                >
                  <Send className="w-5 h-5" />
                </motion.button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
