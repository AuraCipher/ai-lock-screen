import { Camera, Edit2, Check, X, Settings, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ProfileHeaderProps {
  username: string;
  firstName: string;
  lastName: string;
  bio: string;
  avatar: string;
  editing: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onSettingsClick: () => void;
  onUsernameChange: (value: string) => void;
  onBioChange: (value: string) => void;
  onFirstNameChange: (value: string) => void;
  onLastNameChange: (value: string) => void;
  onAvatarChange: (value: string) => void;
}

export default function ProfileHeader({
  username,
  firstName,
  lastName,
  bio,
  avatar,
  editing,
  onEdit,
  onSave,
  onCancel,
  onSettingsClick,
  onUsernameChange,
  onBioChange,
  onFirstNameChange,
  onLastNameChange,
}: ProfileHeaderProps) {
  const displayName = firstName && lastName 
    ? `${firstName} ${lastName}` 
    : firstName || lastName || username;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-3xl shadow-2xl border border-border overflow-hidden"
    >
      {/* Cover with animated gradient */}
      <div className="h-32 sm:h-44 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-purple-500 to-pink-500" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/20 via-transparent to-transparent" />
        
        {/* Animated floating orbs */}
        <motion.div
          animate={{ 
            x: [0, 30, 0],
            y: [0, -20, 0],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-4 right-10 w-24 h-24 bg-white/10 rounded-full blur-2xl"
        />
        <motion.div
          animate={{ 
            x: [0, -20, 0],
            y: [0, 30, 0],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-4 left-20 w-32 h-32 bg-purple-300/20 rounded-full blur-3xl"
        />
        
        {/* Settings button - top right */}
        <motion.button
          whileHover={{ scale: 1.1, rotate: 90 }}
          whileTap={{ scale: 0.9 }}
          onClick={onSettingsClick}
          className="absolute top-4 right-4 p-2.5 bg-white/20 backdrop-blur-md text-white rounded-xl hover:bg-white/30 transition-colors shadow-lg"
        >
          <Settings className="h-5 w-5" />
        </motion.button>

        {/* Sparkle decoration */}
        <Sparkles className="absolute top-4 left-4 h-6 w-6 text-white/40" />
      </div>
      
      <div className="px-4 sm:px-8 pb-6 sm:pb-8 -mt-16 sm:-mt-20 relative">
        {/* Avatar with ring */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="relative inline-block">
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="relative"
            >
              {/* Animated ring */}
              <div className="absolute -inset-1 bg-gradient-to-r from-primary via-purple-500 to-pink-500 rounded-full opacity-75 blur group-hover:opacity-100 transition" />
              <img
                src={avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${username}`}
                alt={username}
                className="relative h-28 w-28 sm:h-36 sm:w-36 rounded-full object-cover ring-4 ring-card shadow-2xl"
              />
              {editing && (
                <motion.button
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute bottom-2 right-2 p-2.5 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition-colors"
                >
                  <Camera className="h-4 w-4" />
                </motion.button>
              )}
            </motion.div>
          </div>
          
          {/* Action buttons */}
          <div className="flex gap-2 sm:mb-2">
            {!editing ? (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onEdit}
                className="px-5 py-2.5 bg-gradient-to-r from-primary to-purple-600 text-primary-foreground rounded-xl font-medium hover:opacity-90 transition-all flex items-center gap-2 text-sm shadow-lg shadow-primary/25"
              >
                <Edit2 className="h-4 w-4" />
                Edit Profile
              </motion.button>
            ) : (
              <>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onSave}
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl font-medium hover:opacity-90 transition-all flex items-center gap-2 text-sm shadow-lg"
                >
                  <Check className="h-4 w-4" />
                  Save
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onCancel}
                  className="px-5 py-2.5 bg-muted text-foreground rounded-xl font-medium hover:bg-muted/80 transition-all flex items-center gap-2 text-sm"
                >
                  <X className="h-4 w-4" />
                  Cancel
                </motion.button>
              </>
            )}
          </div>
        </div>
        
        {/* Profile info */}
        <div className="mt-4 sm:mt-6">
          <AnimatePresence mode="wait">
            {editing ? (
              <motion.div
                key="editing"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">First Name</label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => onFirstNameChange(e.target.value)}
                      className="w-full p-3 border border-input rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                      placeholder="First name"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Last Name</label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => onLastNameChange(e.target.value)}
                      className="w-full p-3 border border-input rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                      placeholder="Last name"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Username</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => onUsernameChange(e.target.value)}
                      className="w-full p-3 pl-8 border border-input rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                      placeholder="username"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Bio</label>
                  <textarea
                    value={bio}
                    onChange={(e) => onBioChange(e.target.value)}
                    className="w-full p-3 border border-input rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none text-sm"
                    placeholder="Tell us about yourself..."
                    rows={3}
                  />
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="viewing"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{displayName}</h1>
                <p className="text-muted-foreground text-sm sm:text-base mt-0.5">@{username}</p>
                {bio && (
                  <p className="mt-3 text-foreground/80 text-sm sm:text-base leading-relaxed max-w-xl">
                    {bio}
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
