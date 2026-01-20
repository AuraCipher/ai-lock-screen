import { useState, useEffect, useRef, FormEvent } from 'react';
import { Send, Search, Phone, Video, Info, ArrowLeft, Lock, Unlock, Settings } from 'lucide-react';
import { Session } from '@supabase/supabase-js';
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
    <div className="h-[calc(100vh-12rem)] bg-card rounded-lg shadow-lg overflow-hidden border border-border">
      {!selectedUser ? (
        <div className="flex flex-col h-full">
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-foreground">Messages</h2>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowLockedChats(!showLockedChats)}
                  className={`p-2 rounded-full transition-colors ${
                    showLockedChats ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
                  }`}
                >
                  {showLockedChats ? (
                    <Lock className="h-5 w-5" />
                  ) : (
                    <Unlock className="h-5 w-5" />
                  )}
                </button>
                <button
                  className="p-2 hover:bg-muted rounded-full transition-colors"
                >
                  <Settings className="h-5 w-5 text-muted-foreground" />
                </button>
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
              <input
                type="text"
                placeholder="Search messages"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-muted border border-border rounded-full focus:outline-none focus:ring-2 focus:ring-ring text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </div>

          <div className="overflow-y-auto flex-1">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className="p-4 flex items-center justify-between hover:bg-muted transition-colors border-b border-border cursor-pointer"
              >
                <button
                  onClick={() => setSelectedUser(user.id)}
                  className="flex items-center space-x-3 flex-1"
                >
                  <div className="relative">
                    <img
                      src={user.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${user.id}`}
                      alt=""
                      className="w-14 h-14 rounded-full object-cover"
                    />
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-card"></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-foreground text-left">
                      {user.custom_chat_name || user.username}
                    </h3>
                    <p className="text-sm text-muted-foreground truncate text-left">
                      Tap to start chatting
                    </p>
                  </div>
                </button>
                <button
                  onClick={() => toggleChatLock(user.id)}
                  className={`p-2 rounded-full ml-2 transition-colors ${
                    user.chat_locked
                      ? 'bg-primary/10 text-primary'
                      : 'hover:bg-muted'
                  }`}
                >
                  {user.chat_locked ? (
                    <Lock className="h-5 w-5" />
                  ) : (
                    <Unlock className="h-5 w-5" />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col h-full bg-muted/50">
          <div className="flex items-center p-4 border-b border-border bg-card">
            <button
              onClick={() => setSelectedUser(null)}
              className="p-1 hover:bg-muted rounded-full mr-2 transition-colors"
            >
              <ArrowLeft className="h-6 w-6 text-muted-foreground" />
            </button>
            <img
              src={selectedUserData?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${selectedUserData?.id}`}
              alt=""
              className="w-10 h-10 rounded-full object-cover"
            />
            <div className="ml-3 flex-1">
              <h3 className="font-medium text-foreground">
                {selectedUserData?.custom_chat_name || selectedUserData?.username}
              </h3>
              <p className="text-sm text-muted-foreground">Active now</p>
            </div>
            <div className="flex items-center space-x-2">
              <button className="p-2 hover:bg-muted rounded-full transition-colors">
                <Phone className="h-5 w-5 text-muted-foreground" />
              </button>
              <button className="p-2 hover:bg-muted rounded-full transition-colors">
                <Video className="h-5 w-5 text-muted-foreground" />
              </button>
              <button className="p-2 hover:bg-muted rounded-full transition-colors">
                <Info className="h-5 w-5 text-muted-foreground" />
              </button>
              <button
                onClick={() => toggleChatLock(selectedUserData?.id || '')}
                className={`p-2 rounded-full transition-colors ${
                  selectedUserData?.chat_locked
                    ? 'bg-primary/10 text-primary'
                    : 'hover:bg-muted'
                }`}
              >
                {selectedUserData?.chat_locked ? (
                  <Lock className="h-5 w-5" />
                ) : (
                  <Unlock className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.user_id === session.user.id ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                    message.user_id === session.user.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card text-foreground'
                  }`}
                >
                  <p className="text-sm">{message.content}</p>
                  <p className="text-xs mt-1 opacity-75">
                    {new Date(message.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <form
            onSubmit={handleSendMessage}
            className="p-4 bg-card border-t border-border"
          >
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Message..."
                className="flex-1 px-4 py-2 bg-muted border border-border rounded-full focus:outline-none focus:ring-2 focus:ring-ring text-foreground placeholder:text-muted-foreground"
              />
              <button
                type="submit"
                disabled={!newMessage.trim()}
                className="p-2 text-primary hover:text-primary/80 rounded-full hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
