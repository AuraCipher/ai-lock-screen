import { useState, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { motion } from 'framer-motion';
import { UserPlus, UserMinus, Search, Loader2, Users } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';

interface Friend {
  id: string;
  user_id: string;
  friend_id: string;
  status: string;
  created_at: string;
  profile: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
}

interface FriendsSettingsProps {
  session: Session;
}

export default function FriendsSettings({ session }: FriendsSettingsProps) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'friends' | 'pending'>('friends');

  useEffect(() => {
    fetchFriends();
    fetchPendingRequests();
  }, [session]);

  const fetchFriends = async () => {
    try {
      // Get friends where current user sent request
      const { data: sentFriends, error: sentError } = await supabase
        .from('friends')
        .select(`
          id, user_id, friend_id, status, created_at,
          profile:profiles_public!friends_friend_id_fkey(id, username, avatar_url)
        `)
        .eq('user_id', session.user.id)
        .eq('status', 'accepted');

      // Get friends where current user received request
      const { data: receivedFriends, error: receivedError } = await supabase
        .from('friends')
        .select(`
          id, user_id, friend_id, status, created_at,
          profile:profiles_public!friends_user_id_fkey(id, username, avatar_url)
        `)
        .eq('friend_id', session.user.id)
        .eq('status', 'accepted');

      if (sentError || receivedError) throw sentError || receivedError;

      const allFriends: Friend[] = [
        ...(sentFriends || []).map((f: any) => ({ ...f, profile: Array.isArray(f.profile) ? f.profile[0] : f.profile })),
        ...(receivedFriends || []).map((f: any) => ({ ...f, profile: Array.isArray(f.profile) ? f.profile[0] : f.profile })),
      ].filter(f => f.profile);

      setFriends(allFriends);
    } catch (error) {
      console.error('Error fetching friends:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('friends')
        .select(`
          id, user_id, friend_id, status, created_at,
          profile:profiles_public!friends_user_id_fkey(id, username, avatar_url)
        `)
        .eq('friend_id', session.user.id)
        .eq('status', 'pending');

      if (error) throw error;
      setPendingRequests(data || []);
    } catch (error) {
      console.error('Error fetching pending requests:', error);
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('friends')
        .update({ status: 'accepted' })
        .eq('id', requestId);

      if (error) throw error;
      toast.success('Friend request accepted!');
      fetchFriends();
      fetchPendingRequests();
    } catch (error) {
      toast.error('Error accepting request');
    }
  };

  const handleDeclineRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('friends')
        .delete()
        .eq('id', requestId);

      if (error) throw error;
      toast.success('Request declined');
      fetchPendingRequests();
    } catch (error) {
      toast.error('Error declining request');
    }
  };

  const handleRemoveFriend = async (friendshipId: string) => {
    try {
      const { error } = await supabase
        .from('friends')
        .delete()
        .eq('id', friendshipId);

      if (error) throw error;
      toast.success('Friend removed');
      fetchFriends();
    } catch (error) {
      toast.error('Error removing friend');
    }
  };

  const filteredFriends = friends.filter(friend =>
    friend.profile?.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-muted/50 rounded-xl">
        <button
          onClick={() => setActiveTab('friends')}
          className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'friends'
              ? 'bg-card text-foreground shadow'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Friends ({friends.length})
        </button>
        <button
          onClick={() => setActiveTab('pending')}
          className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all relative ${
            activeTab === 'pending'
              ? 'bg-card text-foreground shadow'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Pending ({pendingRequests.length})
          {pendingRequests.length > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive rounded-full text-[10px] text-destructive-foreground flex items-center justify-center">
              {pendingRequests.length}
            </span>
          )}
        </button>
      </div>

      {/* Search */}
      {activeTab === 'friends' && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search friends..."
            className="w-full pl-10 pr-4 py-3 border border-input rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      )}

      {/* Content */}
      {activeTab === 'friends' ? (
        filteredFriends.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="py-12 text-center"
          >
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <p className="text-muted-foreground">No friends yet</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Search for people to add as friends
            </p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {filteredFriends.map((friend, index) => (
              <motion.div
                key={friend.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl border border-border"
              >
                <img
                  src={friend.profile?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${friend.profile?.username}`}
                  alt=""
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">
                    {friend.profile?.username || 'Unknown'}
                  </p>
                  <p className="text-sm text-muted-foreground">Friend</p>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleRemoveFriend(friend.id)}
                  className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                >
                  <UserMinus className="h-5 w-5" />
                </motion.button>
              </motion.div>
            ))}
          </div>
        )
      ) : (
        pendingRequests.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="py-12 text-center"
          >
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <UserPlus className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <p className="text-muted-foreground">No pending requests</p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {pendingRequests.map((request, index) => (
              <motion.div
                key={request.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl border border-border"
              >
                <img
                  src={request.profile?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${request.profile?.username}`}
                  alt=""
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">
                    {request.profile?.username || 'Unknown'}
                  </p>
                  <p className="text-sm text-muted-foreground">Wants to be friends</p>
                </div>
                <div className="flex gap-2">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleAcceptRequest(request.id)}
                    className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                  >
                    Accept
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleDeclineRequest(request.id)}
                    className="px-3 py-1.5 bg-muted text-muted-foreground rounded-lg text-sm font-medium hover:bg-muted/80 transition-colors"
                  >
                    Decline
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
