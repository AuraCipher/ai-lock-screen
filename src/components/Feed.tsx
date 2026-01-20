import { useState, useEffect } from 'react';
import { Heart, MessageSquare, Share2, Bookmark } from 'lucide-react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';

interface Friend {
  id: string;
  username: string;
  avatar_url: string | null;
  has_story: boolean;
}

interface Post {
  id: string;
  content: string | null;
  image_url: string | null;
  created_at: string;
  profiles: { username: string; avatar_url: string | null } | null;
  likes: { user_id: string }[];
  comments: { id: string }[];
}

interface FeedProps {
  session: Session;
}

export default function Feed({ session }: FeedProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
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

      const friendIds = (friendships || []).map((friendship: { user_id: string; friend_id: string }) =>
        friendship.user_id === session.user.id ? friendship.friend_id : friendship.user_id
      );

      if (friendIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles_public')
          .select('*')
          .in('id', friendIds);

        if (profilesError) throw profilesError;
        const friendsWithStories = ((profiles as Friend[]) || []).filter(friend => friend.has_story);
        setFriends(friendsWithStories);
      }
    } catch (error) {
      toast.error('Error fetching friends');
    }
  };

  const fetchPosts = async () => {
    try {
      const { data: friendships, error: friendshipsError } = await supabase
        .from('friends')
        .select('user_id, friend_id')
        .or(`user_id.eq.${session.user.id},friend_id.eq.${session.user.id}`)
        .eq('status', 'accepted');

      if (friendshipsError) throw friendshipsError;

      const friendIds = (friendships || []).map((friendship: { user_id: string; friend_id: string }) =>
        friendship.user_id === session.user.id ? friendship.friend_id : friendship.user_id
      );

      const userIds = [session.user.id, ...friendIds];

      const { data, error } = await supabase
        .from('posts')
        .select(`*, profiles:profiles_public!posts_user_id_fkey (username, avatar_url), likes:likes (user_id), comments:comments (*)`)
        .in('user_id', userIds)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPosts((data as Post[]) || []);
    } catch (error) {
      toast.error('Error fetching posts');
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (postId: string) => {
    try {
      const { error } = await supabase.from('likes').upsert([{ post_id: postId, user_id: session.user.id }]);
      if (error) throw error;
      fetchPosts();
    } catch (error) {
      toast.error('Error liking post');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto">
      {friends.length > 0 && (
        <div className="bg-card rounded-lg shadow mb-6 p-4 border border-border">
          <div className="flex space-x-4 overflow-x-auto pb-2 scrollbar-hide">
            <div className="flex flex-col items-center space-y-1 flex-shrink-0">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-2 border-border p-0.5">
                  <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${session.user.id}`} alt="Your story" className="w-full h-full rounded-full object-cover" />
                </div>
                <span className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold border-2 border-card">+</span>
              </div>
              <span className="text-xs text-foreground">Your story</span>
            </div>
            {friends.map((friend) => (
              <div key={friend.id} className="flex flex-col items-center space-y-1 flex-shrink-0">
                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-yellow-400 to-pink-500 p-0.5">
                  <img src={friend.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${friend.username}`} alt={friend.username} className="w-full h-full rounded-full border-2 border-card object-cover" />
                </div>
                <span className="text-xs truncate w-16 text-center text-foreground">{friend.username}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-6">
        {posts.map((post) => (
          <div key={post.id} className="bg-card rounded-lg shadow border border-border">
            <div className="flex items-center p-4">
              <img src={post.profiles?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${post.profiles?.username}`} alt={post.profiles?.username} className="h-8 w-8 rounded-full object-cover" />
              <div className="ml-3"><p className="font-medium text-foreground">{post.profiles?.username}</p></div>
            </div>
            {post.image_url && <img src={post.image_url} alt="" className="w-full aspect-square object-cover" />}
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <button onClick={() => handleLike(post.id)} className="hover:text-destructive transition-colors">
                    <Heart className={`h-6 w-6 ${post.likes?.some((like: { user_id: string }) => like.user_id === session.user.id) ? 'fill-current text-destructive' : 'text-foreground'}`} />
                  </button>
                  <button className="text-foreground hover:text-muted-foreground"><MessageSquare className="h-6 w-6" /></button>
                  <button className="text-foreground hover:text-muted-foreground"><Share2 className="h-6 w-6" /></button>
                </div>
                <button className="text-foreground hover:text-muted-foreground"><Bookmark className="h-6 w-6" /></button>
              </div>
              <div className="mb-2"><span className="font-medium text-foreground">{post.likes?.length || 0} likes</span></div>
              <div className="mb-2"><span className="font-medium mr-2 text-foreground">{post.profiles?.username}</span><span className="text-foreground">{post.content}</span></div>
              {post.comments?.length > 0 && <button className="text-muted-foreground text-sm">View all {post.comments.length} comments</button>}
              <p className="text-muted-foreground text-xs mt-2">{new Date(post.created_at).toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
