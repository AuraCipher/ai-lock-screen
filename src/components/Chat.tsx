import React, { useState, useEffect, useRef } from 'react';
import { Send, Search, Phone, Video, Info, ArrowLeft, Lock, Unlock, Settings } from 'lucide-react';
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

export default function Chat({ session }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [users, setUsers] = useState<Profile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showLockedChats, setShowLockedChats] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<any>(null);

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

      const friendIds = friendships?.map(friendship => 
        friendship.user_id === session.user.id ? friendship.friend_id : friendship.user_id
      ) || [];

      if (friendIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('*')
          .in('id', friendIds);

        if (profilesError) throw profilesError;
        setUsers(profiles || []);
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
          profiles:user_id (avatar_url, custom_chat_name)
        `)
        .or(`and(user_id.eq.${session.user.id},recipient_id.eq.${selectedUser}),and(user_id.eq.${selectedUser},recipient_id.eq.${session.user.id})`)
        .eq('is_private', true)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);

      // Mark messages as read
      const unreadMessages = data?.filter(msg => 
        msg.recipient_id === session.user.id && !msg.is_read
      ) || [];

      if (unreadMessages.length > 0) {
        const { error: updateError } = await supabase
          .from('messages')
          .update({ is_read: true })
          .in('id', unreadMessages.map(msg => msg.id));

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
          if (payload.new.is_private && 
              ((payload.new.user_id === session.user.id && payload.new.recipient_id === selectedUser) || 
               (payload.new.user_id === selectedUser && payload.new.recipient_id === session.user.id))) {
            setMessages(current => [...current, payload.new as Message]);
            scrollToBottom();
          }
        }
      )
      .subscribe();

    return channel;
  };

  const handleSendMessage = async (e: React.FormEvent) => {
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

      // Optimistically update UI
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
    <div className="h-[calc(100vh-12rem)] bg-white rounded-lg shadow-lg overflow-hidden">
      {!selectedUser ? (
        // Chat list view
        <div className="flex flex-col h-full">
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Messages</h2>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowLockedChats(!showLockedChats)}
                  className={`p-2 rounded-full ${
                    showLockedChats ? 'bg-indigo-100 text-indigo-600' : 'hover:bg-gray-100'
                  }`}
                >
                  {showLockedChats ? (
                    <Lock className="h-5 w-5" />
                  ) : (
                    <Unlock className="h-5 w-5" />
                  )}
                </button>
                <button
                  onClick={() => setShowSettings(true)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <Settings className="h-5 w-5 text-gray-600" />
                </button>
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search messages"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="overflow-y-auto flex-1">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors border-b border-gray-100 cursor-pointer"
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
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 text-left">
                      {user.custom_chat_name || user.username}
                    </h3>
                    <p className="text-sm text-gray-500 truncate text-left">
                      Tap to start chatting
                    </p>
                  </div>
                </button>
                <button
                  onClick={() => toggleChatLock(user.id)}
                  className={`p-2 rounded-full ml-2 ${
                    user.chat_locked
                      ? 'bg-indigo-100 text-indigo-600'
                      : 'hover:bg-gray-100'
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
        // Chat conversation view
        <div className="flex flex-col h-full bg-gray-50">
          <div className="flex items-center p-4 border-b border-gray-200 bg-white">
            <button
              onClick={() => setSelectedUser(null)}
              className="p-1 hover:bg-gray-100 rounded-full mr-2"
            >
              <ArrowLeft className="h-6 w-6 text-gray-600" />
            </button>
            <img
              src={selectedUserData?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${selectedUserData?.id}`}
              alt=""
              className="w-10 h-10 rounded-full object-cover"
            />
            <div className="ml-3 flex-1">
              <h3 className="font-medium text-gray-900">
                {selectedUserData?.custom_chat_name || selectedUserData?.username}
              </h3>
              <p className="text-sm text-gray-500">Active now</p>
            </div>
            <div className="flex items-center space-x-2">
              <button className="p-2 hover:bg-gray-100 rounded-full">
                <Phone className="h-5 w-5 text-gray-600" />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded-full">
                <Video className="h-5 w-5 text-gray-600" />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded-full">
                <Info className="h-5 w-5 text-gray-600" />
              </button>
              <button
                onClick={() => toggleChatLock(selectedUserData?.id || '')}
                className={`p-2 rounded-full ${
                  selectedUserData?.chat_locked
                    ? 'bg-indigo-100 text-indigo-600'
                    : 'hover:bg-gray-100'
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
                      ? 'bg-indigo-500 text-white'
                      : 'bg-white text-gray-900'
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
            className="p-4 bg-white border-t border-gray-200"
          >
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Message..."
                className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <button
                type="submit"
                disabled={!newMessage.trim()}
                className="p-2 text-indigo-600 hover:text-indigo-700 rounded-full hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
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