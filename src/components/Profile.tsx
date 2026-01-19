import React, { useState, useEffect } from 'react';
import { Camera, Edit2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';

export default function Profile({ session, profile }) {
  const [editing, setEditing] = useState(false);
  const [username, setUsername] = useState(profile?.username || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [avatar, setAvatar] = useState(profile?.avatar_url || '');
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    if (profile) {
      setUsername(profile.username);
      setBio(profile.bio);
      setAvatar(profile.avatar_url);
    }
    fetchUserPosts();
  }, [profile]);

  const fetchUserPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPosts(data);
    } catch (error) {
      toast.error('Error fetching posts');
    }
  };

  const handleUpdateProfile = async () => {
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: session.user.id,
          username,
          bio,
          avatar_url: avatar,
          updated_at: new Date(),
        });

      if (error) throw error;
      toast.success('Profile updated successfully');
      setEditing(false);
    } catch (error) {
      toast.error('Error updating profile');
    }
  };

  return (
    <div className="space-y-6">
      {/* Profile header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-6">
            <div className="relative">
              <img
                src={avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${username}`}
                alt={username}
                className="h-24 w-24 rounded-full object-cover"
              />
              {editing && (
                <button className="absolute bottom-0 right-0 p-1 bg-indigo-600 text-white rounded-full">
                  <Camera className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="flex-1">
              {editing ? (
                <div className="space-y-4">
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Username"
                  />
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Bio"
                    rows={3}
                  />
                  <div className="flex space-x-2">
                    <button
                      onClick={handleUpdateProfile}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditing(false)}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold">{username}</h2>
                    <button
                      onClick={() => setEditing(true)}
                      className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-gray-100 rounded-full"
                    >
                      <Edit2 className="h-5 w-5" />
                    </button>
                  </div>
                  <p className="mt-2 text-gray-600">{bio || 'No bio yet'}</p>
                  <div className="mt-4 flex space-x-4">
                    <div>
                      <span className="font-bold">{posts.length}</span>
                      <span className="text-gray-500 ml-1">posts</span>
                    </div>
                    <div>
                      <span className="font-bold">0</span>
                      <span className="text-gray-500 ml-1">followers</span>
                    </div>
                    <div>
                      <span className="font-bold">0</span>
                      <span className="text-gray-500 ml-1">following</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* User posts */}
      <div className="grid grid-cols-3 gap-4">
        {posts.map((post) => (
          <div key={post.id} className="bg-white rounded-lg shadow overflow-hidden">
            {post.image_url && (
              <img
                src={post.image_url}
                alt=""
                className="w-full h-48 object-cover"
              />
            )}
            <div className="p-4">
              <p className="text-gray-800 line-clamp-3">{post.content}</p>
              <p className="mt-2 text-sm text-gray-500">
                {new Date(post.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}