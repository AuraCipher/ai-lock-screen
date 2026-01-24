import { motion } from 'framer-motion';
import { Grid3X3, Bookmark, Heart } from 'lucide-react';

interface ProfileTabsProps {
  activeTab: 'posts' | 'saved' | 'liked';
  onTabChange: (tab: 'posts' | 'saved' | 'liked') => void;
}

export default function ProfileTabs({ activeTab, onTabChange }: ProfileTabsProps) {
  const tabs = [
    { id: 'posts', icon: Grid3X3, label: 'Posts' },
    { id: 'saved', icon: Bookmark, label: 'Saved' },
    { id: 'liked', icon: Heart, label: 'Liked' },
  ] as const;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="bg-card rounded-2xl shadow-lg border border-border p-1.5"
    >
      <div className="flex">
        {tabs.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 sm:py-3.5 text-sm font-medium rounded-xl transition-all relative ${
              activeTab === id
                ? 'text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            {activeTab === id && (
              <motion.div
                layoutId="activeProfileTab"
                className="absolute inset-0 bg-gradient-to-r from-primary to-purple-600 rounded-xl"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{label}</span>
            </span>
          </button>
        ))}
      </div>
    </motion.div>
  );
}
