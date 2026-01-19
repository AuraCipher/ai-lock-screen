import React, { useState, useEffect } from 'react';
import { Home, MessageCircle, Search, Compass, User, LogOut, Settings, Bell, Globe } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import Feed from './Feed';
import Profile from './Profile';
import Chat from './Chat';
import Explore from './Explore';
import UserSettings from './UserSettings';
import FriendSearch from './FriendSearch';

export default function Dashboard({ session }) {
  const [activeTab, setActiveTab] = useState('feed');
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSearch, setShowSearch] = useState(false);
  const [notifications, setNotifications] = useState([]);
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
          if (payload.new.status === 'pending') {
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
        .select('*, profiles:user_id(*)')
        .eq('friend_id', session.user.id)
        .eq('status', 'pending');

      const { data: unreadMessages, error: messageError } = await supabase
        .from('messages')
        .select('*, profiles:user_id(*)')
        .eq('recipient_id', session.user.id)
        .eq('is_read', false);

      if (friendError || messageError) throw friendError || messageError;

      const notifications = [
        ...(friendRequests || []).map(request => ({
          id: request.id,
          type: 'friend_request',
          sender: request.profiles,
          created_at: request.created_at,
        })),
        ...(unreadMessages || []).map(message => ({
          id: message.id,
          type: 'message',
          sender: message.profiles,
          content: message.content,
          created_at: message.created_at,
        })),
      ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      setNotifications(notifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const handleAcceptFriendRequest = async (friendId) => {
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'feed':
        return <Feed session={session} />;
      case 'explore':
        return <Explore session={session} />;
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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top header */}
      <header className="bg-white border-b border-gray-200 fixed top-0 left-0 right-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Globe className="h-8 w-8 text-indigo-600" />
              <h1 className="text-xl font-bold text-indigo-600 ml-2">Flydex</h1>
            </div>
            
            {/* Search and notifications */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowSearch(true)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <Search className="h-5 w-5 text-gray-600" />
              </button>
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <Bell className="h-5 w-5 text-gray-600" />
                  {notifications.length > 0 && (
                    <span className="absolute top-0 right-0 h-4 w-4 bg-red-500 rounded-full flex items-center justify-center text-xs text-white">
                      {notifications.length}
                    </span>
                  )}
                </button>

                {/* Notifications dropdown */}
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg py-1 z-50">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <h3 className="font-semibold">Notifications</h3>
                    </div>
                    {notifications.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-gray-500">
                        No new notifications
                      </div>
                    ) : (
                      <div className="max-h-96 overflow-y-auto">
                        {notifications.map((notification) => (
                          <div
                            key={notification.id}
                            className="px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-0"
                          >
                            <div className="flex items-start space-x-3">
                              <img
                                src={notification.sender.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${notification.sender.username}`}
                                alt=""
                                className="w-10 h-10 rounded-full"
                              />
                              <div className="flex-1">
                                <p className="text-sm">
                                  <span className="font-semibold">
                                    {notification.sender.username}
                                  </span>{' '}
                                  {notification.type === 'friend_request'
                                    ? 'sent you a friend request'
                                    : 'sent you a message'}
                                </p>
                                {notification.type === 'message' && (
                                  <p className="text-sm text-gray-500 mt-1 line-clamp-1">
                                    {notification.content}
                                  </p>
                                )}
                                <p className="text-xs text-gray-400 mt-1">
                                  {new Date(notification.created_at).toLocaleTimeString()}
                                </p>
                                {notification.type === 'friend_request' && (
                                  <div className="mt-2 flex space-x-2">
                                    <button
                                      onClick={() => handleAcceptFriendRequest(notification.id)}
                                      className="px-3 py-1 bg-indigo-600 text-white text-sm rounded-full hover:bg-indigo-700"
                                    >
                                      Accept
                                    </button>
                                    <button
                                      className="px-3 py-1 bg-gray-100 text-gray-600 text-sm rounded-full hover:bg-gray-200"
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
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
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
                  ? 'text-indigo-600'
                  : 'text-gray-600 hover:text-indigo-600'
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