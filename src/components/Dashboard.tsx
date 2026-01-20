import { useState, useEffect } from 'react';
import { Home, MessageCircle, Compass, User, Settings, Bell, Globe } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Session } from '@supabase/supabase-js';
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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top header */}
      <header className="bg-card border-b border-border fixed top-0 left-0 right-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Globe className="h-8 w-8 text-primary" />
              <h1 className="text-xl font-bold text-primary ml-2">Flydex</h1>
            </div>
            
            {/* Search and notifications */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowSearch(true)}
                className="p-2 hover:bg-muted rounded-full transition-colors"
              >
                <MessageCircle className="h-5 w-5 text-muted-foreground" />
              </button>
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-2 hover:bg-muted rounded-full transition-colors"
                >
                  <Bell className="h-5 w-5 text-muted-foreground" />
                  {notifications.length > 0 && (
                    <span className="absolute top-0 right-0 h-4 w-4 bg-destructive rounded-full flex items-center justify-center text-xs text-destructive-foreground">
                      {notifications.length}
                    </span>
                  )}
                </button>

                {/* Notifications dropdown */}
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-card rounded-lg shadow-lg py-1 z-50 border border-border">
                    <div className="px-4 py-2 border-b border-border">
                      <h3 className="font-semibold text-foreground">Notifications</h3>
                    </div>
                    {notifications.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-muted-foreground">
                        No new notifications
                      </div>
                    ) : (
                      <div className="max-h-96 overflow-y-auto">
                        {notifications.map((notification) => (
                          <div
                            key={notification.id}
                            className="px-4 py-3 hover:bg-muted border-b border-border last:border-0 transition-colors"
                          >
                            <div className="flex items-start space-x-3">
                              <img
                                src={notification.sender.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${notification.sender.username}`}
                                alt=""
                                className="w-10 h-10 rounded-full"
                              />
                              <div className="flex-1">
                                <p className="text-sm text-foreground">
                                  <span className="font-semibold">
                                    {notification.sender.username}
                                  </span>{' '}
                                  {notification.type === 'friend_request'
                                    ? 'sent you a friend request'
                                    : 'sent you a message'}
                                </p>
                                {notification.type === 'message' && notification.content && (
                                  <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                                    {notification.content}
                                  </p>
                                )}
                                <p className="text-xs text-muted-foreground mt-1">
                                  {new Date(notification.created_at).toLocaleTimeString()}
                                </p>
                                {notification.type === 'friend_request' && (
                                  <div className="mt-2 flex space-x-2">
                                    <button
                                      onClick={() => handleAcceptFriendRequest(notification.id)}
                                      className="px-3 py-1 bg-primary text-primary-foreground text-sm rounded-full hover:bg-primary/90 transition-colors"
                                    >
                                      Accept
                                    </button>
                                    <button
                                      className="px-3 py-1 bg-muted text-muted-foreground text-sm rounded-full hover:bg-muted/80 transition-colors"
                                    >
                                      Decline
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 pt-16 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {renderContent()}
        </div>
      </main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border">
        <div className="flex justify-around items-center h-20 px-4 max-w-7xl mx-auto">
          {[
            { icon: Home, tab: 'feed', label: 'Feed' },
            { icon: Compass, tab: 'explore', label: 'Explore' },
            { icon: MessageCircle, tab: 'chat', label: 'Chat' },
            { icon: User, tab: 'profile', label: 'Profile' },
            { icon: Settings, tab: 'settings', label: 'Settings' }
          ].map(({ icon: Icon, tab, label }) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex flex-col items-center space-y-1 p-2 rounded-lg transition-colors ${
                activeTab === tab
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-primary'
              }`}
            >
              <Icon className="h-6 w-6" />
              <span className="text-xs font-medium">{label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Search Modal */}
      {showSearch && (
        <FriendSearch
          session={session}
          onClose={() => setShowSearch(false)}
        />
      )}
    </div>
  );
}
