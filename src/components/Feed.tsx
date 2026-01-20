import React, { useState, useEffect } from 'react';
import { Heart, MessageSquare, Share2, Bookmark } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';

export default function Feed({ session }) {
  const [posts, setPosts] = useState([]);
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFriends();
    fetchPosts();
  }, []);

  const fetchFriends = async () => {
    try {
      const { data: friendships, error: friendshipsError } = await supabase
        .from('friends')
        .select('user_id, friend_id')
        .or(`user_id.eq.${session.user.id},friend_id.eq.${session.user.id}`)
        .eq('status', 'accepted');

      if (friendshipsError) throw friendshipsError;

      const friendIds = friendships.map(friendship => 
        friendship.user_id === session.user.id ? friendship.friend_id : friendship.user_id
      );

      if (friendIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles_public')
          .select('*')
          .in('id', friendIds);

        if (profilesError) throw profilesError;
        // Only show friends who have active stories
        const friendsWithStories = profiles.filter(friend => friend.has_story);
        setFriends(friendsWithStories);
      }
    } catch (error) {
      toast.error('Error fetching friends');
    }
  };

  const fetchPosts = async () => {
    try {
      // First get friend IDs
      const { data: friendships, error: friendshipsError } = await supabase
        .from('friends')
        .select('user_id, friend_id')
        .or(`user_id.eq.${session.user.id},friend_id.eq.${session.user.id}`)
        .eq('status', 'accepted');

      if (friendshipsError) throw friendshipsError;

      const friendIds = friendships.map(friendship => 
        friendship.user_id === session.user.id ? friendship.friend_id : friendship.user_id
      );

      // Include user's own ID to see their posts too
      const userIds = [session.user.id, ...friendIds];

      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles:profiles_public!posts_user_id_fkey (username, avatar_url),
          likes:likes (user_id),
          comments:comments (*)
        `)
        .in('user_id', userIds)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPosts(data);
    } catch (error) {
      toast.error('Error fetching posts');
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (postId) => {
    try {
      const { error } = await supabase.from('likes').upsert([
        {
          post_id: postId,
          user_id: session.user.id,
        },
      ]);

      if (error) throw error;
      fetchPosts();
    } catch (error) {
      toast.error('Error liking post');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto">
      {/* Stories */}
      {friends.length > 0 && (
        <div className="bg-white rounded-lg shadow mb-6 p-4">
          <div className="flex space-x-4 overflow-x-auto pb-2 scrollbar-hide">
            {/* Your story */}
            <div className="flex flex-col items-center space-y-1 flex-shrink-0">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-2 border-gray-200 p-0.5">
                  <img
                    src={`https://api.dicebear.com/7.x/initials/svg?seed=${session.user.id}`}
                    alt="Your story"
                    className="w-full h-full rounded-full object-cover"
                  />
                </div>
                <span className="absolute bottom-0 right-0 bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold border-2 border-white">+</span>
              </div>
              <span className="text-xs">Your story</span>
            </div>

            {/* Friends stories */}
            {friends.map((friend) => (
              <div key={friend.id} className="flex flex-col items-center space-y-1 flex-shrink-0">
                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-yellow-400 to-pink-500 p-0.5">
                  <img
                    src={friend.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${friend.username}`}
                    alt={friend.username}
                    className="w-full h-full rounded-full border-2 border-white object-cover"
                  />
                </div>
                <span className="text-xs truncate w-16 text-center">{friend.username}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Posts */}
      <div className="space-y-6">
        {posts.map((post) => (
          <div key={post.id} className="bg-white rounded-lg shadow">
            {/* Post header */}
            <div className="flex items-center p-4">
              <img
                src={post.profiles?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${post.profiles?.username}`}
                alt={post.profiles?.username}
                className="h-8 w-8 rounded-full object-cover"
              />
              <div className="ml-3">
                <p className="font-medium">{post.profiles?.username}</p>
              </div>
            </div>

            {/* Post image */}
            {post.image_url && (
              <img
                src={post.image_url}
                alt=""
                className="w-full aspect-square object-cover"
              />
            )}

            {/* Post actions */}
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => handleLike(post.id)}
                    className="hover:text-red-500 transition-colors"
                  >
                    <Heart
                      className={`h-6 w-6 ${
                        post.likes?.some((like) => like.user_id === session.user.id)
                          ? 'fill-current text-red-500'
                          : ''
                      }`}
                    />
                  </button>
                  <button className="hover:text-gray-600">
                    <MessageSquare className="h-6 w-6" />
                  </button>
                  <button className="hover:text-gray-600">
                    <Share2 className="h-6 w-6" />
                  </button>
                </div>
                <button className="hover:text-gray-600">
                  <Bookmark className="h-6 w-6" />
                </button>
              </div>

              {/* Likes count */}
              <div className="mb-2">
                <span className="font-medium">{post.likes?.length || 0} likes</span>
              </div>

              {/* Caption */}
              <div className="mb-2">
                <span className="font-medium mr-2">{post.profiles?.username}</span>
                <span>{post.content}</span>
              </div>

              {/* Comments */}
              {post.comments?.length > 0 && (
                <button className="text-gray-500 text-sm">
                  View all {post.comments.length} comments
                </button>
              )}

              {/* Timestamp */}
              <p className="text-gray-500 text-xs mt-2">
                {new Date(post.created_at).toLocaleDateString(undefined, {
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}