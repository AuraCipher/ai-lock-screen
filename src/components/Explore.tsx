import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';

interface Post {
  id: string;
  content: string | null;
  image_url: string | null;
  created_at: string;
  profiles: { username: string; avatar_url: string | null } | null;
  likes: { user_id: string }[];
  comments: { id: string }[];
}

export default function Explore() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('latest');

  useEffect(() => {
    fetchPosts();
  }, [filter]);

  const fetchPosts = async () => {
    try {
      let query = supabase
        .from('posts')
        .select(`
          *,
          profiles:profiles_public!posts_user_id_fkey (username, avatar_url),
          likes:likes (user_id),
          comments:comments (*)
        `);

      if (searchTerm) {
        query = query.ilike('content', `%${searchTerm}%`);
      }

      if (filter === 'popular') {
        query = query.order('likes', { ascending: false });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      const { data, error } = await query;

      if (error) throw error;
      setPosts((data as Post[]) || []);
    } catch (error) {
      toast.error('Error fetching posts');
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPosts();
  };

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-lg shadow p-4 border border-border">
        <form onSubmit={handleSearch} className="flex space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search posts..."
              className="w-full pl-10 pr-4 py-2 border border-input rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-4 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="latest">Latest</option>
            <option value="popular">Popular</option>
          </select>
          <button
            type="submit"
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
          >
            Search
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {posts.map((post) => (
          <div key={post.id} className="bg-card rounded-lg shadow overflow-hidden border border-border">
            {post.image_url && (
              <img src={post.image_url} alt="" className="w-full h-48 object-cover" />
            )}
            <div className="p-4">
              <div className="flex items-center space-x-3 mb-4">
                <img
                  src={post.profiles?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${post.profiles?.username}`}
                  alt={post.profiles?.username}
                  className="h-8 w-8 rounded-full"
                />
                <div>
                  <p className="font-medium text-foreground">{post.profiles?.username}</p>
                  <p className="text-sm text-muted-foreground">{new Date(post.created_at).toLocaleDateString()}</p>
                </div>
              </div>
              <p className="text-foreground mb-4">{post.content}</p>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{post.likes?.length || 0} likes</span>
                <span>{post.comments?.length || 0} comments</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
