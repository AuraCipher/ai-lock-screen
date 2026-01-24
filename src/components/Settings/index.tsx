import { useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';
import SettingsMenu from './SettingsMenu';
import AccountDetails from './AccountDetails';
import SecuritySettings from './SecuritySettings';
import PasswordReset from './PasswordReset';
import ThemeSettings from './ThemeSettings';
import FriendsSettings from './FriendsSettings';

export interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  first_name: string | null;
  last_name: string | null;
  created_at?: string;
  email?: string;
}

interface SettingsProps {
  session: Session;
  profile: Profile | null;
  onBack: () => void;
  onSignOut: () => void;
}

export type SettingsSection = 
  | 'menu' 
  | 'account' 
  | 'security' 
  | 'password' 
  | 'friends' 
  | 'theme';

export default function Settings({ session, profile, onBack, onSignOut }: SettingsProps) {
  const [activeSection, setActiveSection] = useState<SettingsSection>('menu');

  const getSectionTitle = () => {
    switch (activeSection) {
      case 'account': return 'Account Details';
      case 'security': return 'Password & Security';
      case 'password': return 'Reset Password';
      case 'friends': return 'Friends & Contacts';
      case 'theme': return 'Appearance';
      default: return 'Settings';
    }
  };

  const handleBack = () => {
    if (activeSection === 'menu') {
      onBack();
    } else {
      setActiveSection('menu');
    }
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'account':
        return <AccountDetails session={session} profile={profile} />;
      case 'security':
        return <SecuritySettings onPasswordReset={() => setActiveSection('password')} />;
      case 'password':
        return <PasswordReset onBack={() => setActiveSection('security')} />;
      case 'friends':
        return <FriendsSettings session={session} />;
      case 'theme':
        return <ThemeSettings />;
      default:
        return (
          <SettingsMenu 
            onNavigate={setActiveSection}
            onSignOut={onSignOut}
          />
        );
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-2xl shadow-xl border border-border overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center gap-3 p-4 sm:p-6 border-b border-border bg-gradient-to-r from-primary/5 to-purple-500/5">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleBack}
            className="p-2 hover:bg-muted rounded-xl transition-colors"
          >
            <ChevronLeft className="h-5 w-5 text-foreground" />
          </motion.button>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">{getSectionTitle()}</h1>
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, x: activeSection === 'menu' ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: activeSection === 'menu' ? 20 : -20 }}
            transition={{ duration: 0.2 }}
            className="p-4 sm:p-6"
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
