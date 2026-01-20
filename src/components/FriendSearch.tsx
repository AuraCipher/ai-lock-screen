import { useState, useEffect } from 'react';
import { UserPlus, X, Check, MessageCircle } from 'lucide-react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';

interface SearchResult {
  id: string;
  username: string;
  avatar_url: string | null;
  custom_chat_name: string | null;
}

interface FriendshipStatus {
  status: string;
  sentByMe: boolean;
}

interface FriendSearchProps {
  session: Session;
  onClose: () => void;
}

export default function FriendSearch({ session, onClose }: FriendSearchProps) {
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [pendingRequests, setPendingRequests] = useState<Record<string, FriendshipStatus>>({});

  useEffect(() => {
    if (searchQuery.trim().length >= 2) {
      searchUsers();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  useEffect(() => {
    loadFriendshipStatuses();
  }, [searchResults]);

  const searchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles_public')
        .select('id, username, avatar_url, custom_chat_name')
        .or(`username.ilike.%${searchQuery}%, custom_chat_name.ilike.%${searchQuery}%`)
        .neq('id', session.user.id)
        .limit(10);

      if (error) throw error;
      setSearchResults((data as SearchResult[]) || []);
    } catch (error) {
      console.error('Error searching users:', error);
    }
  };

  const loadFriendshipStatuses = async () => {
    try {
      const userIds = searchResults.map(user => user.id);
      if (userIds.length === 0) return;

      const { data: friendships, error } = await supabase
        .from('friends')
        .select('*')
        .or(`and(user_id.eq.${session.user.id},friend_id.in.(${userIds.join(',')})),and(friend_id.eq.${session.user.id},user_id.in.(${userIds.join(',')}))`);

      if (error) throw error;

      const statusMap: Record<string, FriendshipStatus> = {};
      friendships?.forEach((friendship: { user_id: string; friend_id: string; status: string }) => {
        const otherUserId = friendship.user_id === session.user.id ? friendship.friend_id : friendship.user_id;
        statusMap[otherUserId] = {
          status: friendship.status,
          sentByMe: friendship.user_id === session.user.id
        };
      });

      setPendingRequests(statusMap);
    } catch (error) {
      console.error('Error loading friendship statuses:', error);
    }
  };

  const sendFriendRequest = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('friends')
        .insert([
          {
            user_id: session.user.id,
            friend_id: userId,
            status: 'pending'
          }
        ]);

      if (error) throw error;
      
      toast.success('Friend request sent!');
      loadFriendshipStatuses();
    } catch (error) {
      toast.error('Error sending friend request');
    }
  };

  const getFriendshipStatus = (userId: string): string | null => {
    const friendship = pendingRequests[userId];
    if (!friendship) return null;

    if (friendship.status === 'accepted') {
      return 'Friends';
    } else if (friendship.status === 'pending') {
      return friendship.sentByMe ? 'Request sent' : 'Accept request';
    }
    return null;
  };

  const handleFriendshipAction = async (userId: string) => {
    const status = getFriendshipStatus(userId);
    if (status === 'Accept request') {
      try {
        const { error } = await supabase
          .from('friends')
          .update({ status: 'accepted' })
          .or(`and(user_id.eq.${userId},friend_id.eq.${session.user.id}),and(friend_id.eq.${userId},user_id.eq.${session.user.id})`);

        if (error) throw error;
        toast.success('Friend request accepted!');
        loadFriendshipStatuses();
      } catch (error) {
        toast.error('Error accepting friend request');
      }
    } else if (!status) {
      sendFriendRequest(userId);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-20">
      <div className="bg-card rounded-lg shadow-xl w-full max-w-md mx-4 border border-border">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Find Friends</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-full transition-colors"
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>
        
        <div className="p-4">
          <input
            type="text"
            placeholder="Search by name or username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-input rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="max-h-96 overflow-y-auto">
          {searchResults.map((user) => (
            <div
              key={user.id}
              className="p-4 border-b border-border flex items-center justify-between"
            >
              <div className="flex items-center space-x-3">
                <img
                  src={user.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${user.username}`}
                  alt={user.username}
                  className="w-12 h-12 rounded-full"
                />
                <div>
                  <p className="font-medium text-foreground">{user.custom_chat_name || user.username}</p>
                  <p className="text-sm text-muted-foreground">@{user.username}</p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {getFriendshipStatus(user.id) === 'Friends' ? (
                  <button
                    className="p-2 text-primary hover:bg-primary/10 rounded-full transition-colors"
                    onClick={() => {/* Handle chat */}}
                  >
                    <MessageCircle className="h-5 w-5" />
                  </button>
                ) : (
                  <button
                    onClick={() => handleFriendshipAction(user.id)}
                    disabled={getFriendshipStatus(user.id) === 'Request sent'}
                    className={`flex items-center space-x-1 px-3 py-1 rounded-full transition-colors ${
                      getFriendshipStatus(user.id) === 'Request sent'
                        ? 'bg-muted text-muted-foreground'
                        : getFriendshipStatus(user.id) === 'Accept request'
                        ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                        : 'bg-primary/10 text-primary hover:bg-primary/20'
                    }`}
                  >
                    {getFriendshipStatus(user.id) === 'Accept request' ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <UserPlus className="h-4 w-4" />
                    )}
                    <span>{getFriendshipStatus(user.id) || 'Add Friend'}</span>
                  </button>
                )}
              </div>
            </div>
          ))}

          {searchQuery.length >= 2 && searchResults.length === 0 && (
            <div className="p-4 text-center text-muted-foreground">
              No users found
            </div>
          )}

          {searchQuery.length < 2 && (
            <div className="p-4 text-center text-muted-foreground">
              Enter at least 2 characters to search
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
