import { useState, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import ProfileHeader from './ProfileHeader';
import ProfileStats from './ProfileStats';
import ProfileTabs from './ProfileTabs';
import ProfilePostsGrid from './ProfilePostsGrid';
import Settings from '../Settings';

export interface ProfileData {
  id: string;
  username: string;
  bio: string | null;
  avatar_url: string | null;
  first_name: string | null;
  last_name: string | null;
  created_at?: string;
  email?: string;
}

export interface Post {
  id: string;
  content: string | null;
  image_url: string | null;
  created_at: string;
}

interface ProfileProps {
  session: Session;
  profile: ProfileData | null;
  onSignOut: () => void;
}

export default function Profile({ session, profile, onSignOut }: ProfileProps) {
  const [editing, setEditing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [username, setUsername] = useState(profile?.username || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [firstName, setFirstName] = useState(profile?.first_name || '');
  const [lastName, setLastName] = useState(profile?.last_name || '');
  const [avatar, setAvatar] = useState(profile?.avatar_url || '');
  const [posts, setPosts] = useState<Post[]>([]);
  const [likedPosts, setLikedPosts] = useState<Post[]>([]);
  const [activeTab, setActiveTab] = useState<'posts' | 'saved' | 'liked'>('posts');
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  useEffect(() => {
    if (profile) {
      setUsername(profile.username);
      setBio(profile.bio || '');
      setFirstName(profile.first_name || '');
      setLastName(profile.last_name || '');
      setAvatar(profile.avatar_url || '');
    }
    fetchUserPosts();
    fetchLikedPosts();
    fetchFriendsCount();
  }, [profile]);

  const fetchUserPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('id, content, image_url, created_at')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      toast.error('Error fetching posts');
    }
  };

  const fetchLikedPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('likes')
        .select('post_id, posts(id, content, image_url, created_at)')
        .eq('user_id', session.user.id);

      if (error) throw error;
      const likedPostsData = data?.map((like: any) => like.posts).filter(Boolean) || [];
      setLikedPosts(likedPostsData);
    } catch (error) {
      console.error('Error fetching liked posts:', error);
    }
  };

  const fetchFriendsCount = async () => {
    try {
      // Get followers (people who sent friend requests to this user and were accepted)
      const { count: followers } = await supabase
        .from('friends')
        .select('*', { count: 'exact', head: true })
        .eq('friend_id', session.user.id)
        .eq('status', 'accepted');

      // Get following (people this user sent friend requests to and were accepted)
      const { count: following } = await supabase
        .from('friends')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session.user.id)
        .eq('status', 'accepted');

      setFollowersCount(followers || 0);
      setFollowingCount(following || 0);
    } catch (error) {
      console.error('Error fetching friends count:', error);
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
          first_name: firstName,
          last_name: lastName,
          avatar_url: avatar,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
      toast.success('Profile updated successfully');
      setEditing(false);
    } catch (error) {
      toast.error('Error updating profile');
    }
  };

  const getDisplayPosts = () => {
    switch (activeTab) {
      case 'posts':
        return posts;
      case 'liked':
        return likedPosts;
      case 'saved':
        return []; // Saved functionality to be implemented
      default:
        return posts;
    }
  };

  if (showSettings) {
    return (
      <Settings 
        session={session} 
        profile={profile}
        onBack={() => setShowSettings(false)}
        onSignOut={onSignOut}
      />
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
      {/* Profile Header with Cover */}
      <ProfileHeader
        username={username}
        firstName={firstName}
        lastName={lastName}
        bio={bio}
        avatar={avatar}
        editing={editing}
        onEdit={() => setEditing(true)}
        onSave={handleUpdateProfile}
        onCancel={() => setEditing(false)}
        onSettingsClick={() => setShowSettings(true)}
        onUsernameChange={setUsername}
        onBioChange={setBio}
        onFirstNameChange={setFirstName}
        onLastNameChange={setLastName}
        onAvatarChange={setAvatar}
      />

      {/* Stats Section */}
      <ProfileStats
        postsCount={posts.length}
        followersCount={followersCount}
        followingCount={followingCount}
      />

      {/* Tabs */}
      <ProfileTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Posts Grid */}
      <AnimatePresence mode="wait">
        <ProfilePostsGrid 
          key={activeTab}
          posts={getDisplayPosts()} 
          emptyMessage={
            activeTab === 'posts' 
              ? "No posts yet" 
              : activeTab === 'liked' 
                ? "No liked posts" 
                : "No saved posts"
          }
        />
      </AnimatePresence>
    </div>
  );
}
