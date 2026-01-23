import { useState, useEffect } from 'react';
import { Home, MessageCircle, Compass, User, Settings, Bell, Globe, X, Check, Search } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Session } from '@supabase/supabase-js';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import Feed from './Feed';
import Profile from './Profile';
import Chat from './Chat';
import Explore from './Explore';
import UserSettings from './UserSettings';
import FriendSearch from './FriendSearch';

interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  first_name: string | null;
  last_name: string | null;
}

interface Notification {
  id: string;
  type: 'friend_request' | 'message';
  sender: {
    username: string;
    avatar_url: string | null;
  };
  content?: string;
  created_at: string;
}

interface DashboardProps {
  session: Session;
}

export default function Dashboard({ session }: DashboardProps) {
  const [activeTab, setActiveTab] = useState('feed');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSearch, setShowSearch] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    if (session?.user) {
      getProfile();
      subscribeToNotifications();
      fetchNotifications();
    }
  }, [session]);

  const getProfile = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          const username = `user_${session.user.id.slice(0, 8)}`;
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert([
              {
                id: session.user.id,
                username,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            ])
            .select()
            .single();

          if (createError) {
            console.error('Error creating profile:', createError);
            throw createError;
          }
          setProfile(newProfile);
        } else {
          throw error;
        }
      } else {
        setProfile(data);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Error loading profile');
    } finally {
      setLoading(false);
    }
  };

  const subscribeToNotifications = () => {
    const friendRequestsChannel = supabase
      .channel('friend-requests')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'friends',
          filter: `friend_id=eq.${session.user.id}`,
        },
        (payload) => {
          if (payload.new && typeof payload.new === 'object' && 'status' in payload.new && payload.new.status === 'pending') {
            fetchNotifications();
          }
        }
      )
      .subscribe();

    const messagesChannel = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `recipient_id=eq.${session.user.id}`,
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      friendRequestsChannel.unsubscribe();
      messagesChannel.unsubscribe();
    };
  };

  const fetchNotifications = async () => {
    try {
      const { data: friendRequests, error: friendError } = await supabase
        .from('friends')
        .select('*, profiles:profiles_public!friends_user_id_fkey(*)')
        .eq('friend_id', session.user.id)
        .eq('status', 'pending');

      const { data: unreadMessages, error: messageError } = await supabase
        .from('messages')
        .select('*, profiles:profiles_public!messages_user_id_fkey(*)')
        .eq('recipient_id', session.user.id)
        .eq('is_read', false);

      if (friendError || messageError) throw friendError || messageError;

      const notificationsList: Notification[] = [
        ...(friendRequests || []).map((request: { id: string; profiles: { username: string; avatar_url: string | null }; created_at: string }) => ({
          id: request.id,
          type: 'friend_request' as const,
          sender: request.profiles,
          created_at: request.created_at,
        })),
        ...(unreadMessages || []).map((message: { id: string; profiles: { username: string; avatar_url: string | null }; content: string; created_at: string }) => ({
          id: message.id,
          type: 'message' as const,
          sender: message.profiles,
          content: message.content,
          created_at: message.created_at,
        })),
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setNotifications(notificationsList);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const handleAcceptFriendRequest = async (friendId: string) => {
    try {
      const { error } = await supabase
        .from('friends')
        .update({ status: 'accepted' })
        .eq('id', friendId);

      if (error) throw error;
      fetchNotifications();
      toast.success('Friend request accepted!');
    } catch (error) {
      toast.error('Error accepting friend request');
    }
  };

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      toast.error('Error signing out');
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm">Loading...</p>
        </motion.div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'feed':
        return <Feed session={session} />;
      case 'explore':
        return <Explore />;
      case 'chat':
        return <Chat session={session} />;
      case 'profile':
        return <Profile session={session} profile={profile} />;
      case 'settings':
        return <UserSettings session={session} profile={profile} onSignOut={handleSignOut} />;
      default:
        return <Feed session={session} />;
    }
  };

  const navItems = [
    { icon: Home, tab: 'feed', label: 'Feed' },
    { icon: Compass, tab: 'explore', label: 'Explore' },
    { icon: MessageCircle, tab: 'chat', label: 'Chat' },
    { icon: User, tab: 'profile', label: 'Profile' },
    { icon: Settings, tab: 'settings', label: 'Settings' }
  ];

  return (
    <div className="fixed inset-0 flex flex-col bg-background overflow-hidden">
      {/* Top header */}
      <header className="flex-shrink-0 bg-card/80 backdrop-blur-xl border-b border-border z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            {/* Logo */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center"
            >
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-primary to-purple-600 rounded-xl flex items-center justify-center">
                <Globe className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
              <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent ml-2">
                AureX
              </h1>
            </motion.div>
            
            {/* Search and notifications */}
            <div className="flex items-center gap-1 sm:gap-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowSearch(true)}
                className="p-2 sm:p-2.5 hover:bg-muted rounded-xl transition-colors"
              >
                <Search className="h-5 w-5 text-muted-foreground" />
              </motion.button>
              
              <div className="relative">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-2 sm:p-2.5 hover:bg-muted rounded-xl transition-colors relative"
                >
                  <Bell className="h-5 w-5 text-muted-foreground" />
                  {notifications.length > 0 && (
                    <span className="absolute top-1 right-1 h-4 w-4 bg-destructive rounded-full flex items-center justify-center text-[10px] font-bold text-destructive-foreground">
                      {notifications.length > 9 ? '9+' : notifications.length}
                    </span>
                  )}
                </motion.button>

                {/* Notifications dropdown */}
                <AnimatePresence>
                  {showNotifications && (
                    <>
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-40"
                        onClick={() => setShowNotifications(false)}
                      />
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 mt-2 w-80 sm:w-96 bg-card rounded-2xl shadow-2xl border border-border z-50 overflow-hidden"
                      >
                        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                          <h3 className="font-semibold text-foreground">Notifications</h3>
                          <button
                            onClick={() => setShowNotifications(false)}
                            className="p-1 hover:bg-muted rounded-lg transition-colors"
                          >
                            <X className="h-4 w-4 text-muted-foreground" />
                          </button>
                        </div>
                        {notifications.length === 0 ? (
                          <div className="px-4 py-8 text-center">
                            <Bell className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                            <p className="text-muted-foreground text-sm">No new notifications</p>
                          </div>
                        ) : (
                          <div className="max-h-80 overflow-y-auto">
                            {notifications.map((notification) => (
                              <motion.div
                                key={notification.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="px-4 py-3 hover:bg-muted/50 border-b border-border last:border-0 transition-colors"
                              >
                                <div className="flex items-start gap-3">
                                  <img
                                    src={notification.sender.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${notification.sender.username}`}
                                    alt=""
                                    className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm text-foreground">
                                      <span className="font-semibold">{notification.sender.username}</span>{' '}
                                      {notification.type === 'friend_request'
                                        ? 'sent you a friend request'
                                        : 'sent you a message'}
                                    </p>
                                    {notification.type === 'message' && notification.content && (
                                      <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">
                                        {notification.content}
                                      </p>
                                    )}
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {new Date(notification.created_at).toLocaleTimeString()}
                                    </p>
                                    {notification.type === 'friend_request' && (
                                      <div className="mt-2 flex gap-2">
                                        <button
                                          onClick={() => handleAcceptFriendRequest(notification.id)}
                                          className="flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-medium rounded-lg hover:bg-primary/90 transition-colors"
                                        >
                                          <Check className="h-3 w-3" />
                                          Accept
                                        </button>
                                        <button className="px-3 py-1.5 bg-muted text-muted-foreground text-xs font-medium rounded-lg hover:bg-muted/80 transition-colors">
                                          Decline
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 pb-24">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Bottom navigation */}
      <nav className="flex-shrink-0 bg-card/80 backdrop-blur-xl border-t border-border z-50">
        <div className="flex justify-around items-center h-16 sm:h-20 px-2 sm:px-4 max-w-lg mx-auto">
          {navItems.map(({ icon: Icon, tab, label }) => (
            <motion.button
              key={tab}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveTab(tab)}
              className={`flex flex-col items-center justify-center gap-0.5 sm:gap-1 p-2 sm:p-3 rounded-xl transition-all min-w-[48px] ${
                activeTab === tab
                  ? 'text-primary bg-primary/10'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <Icon className={`h-5 w-5 sm:h-6 sm:w-6 ${activeTab === tab ? 'stroke-[2.5]' : ''}`} />
              <span className="text-[10px] sm:text-xs font-medium">{label}</span>
            </motion.button>
          ))}
        </div>
      </nav>

      {/* Search Modal */}
      <AnimatePresence>
        {showSearch && (
          <FriendSearch
            session={session}
            onClose={() => setShowSearch(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
