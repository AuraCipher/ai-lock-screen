import { motion } from 'framer-motion';
import { 
  User, 
  Shield, 
  UserPlus, 
  Palette, 
  LogOut,
  ChevronRight,
  Smartphone,
  Bell,
  Lock,
  HelpCircle
} from 'lucide-react';
import { SettingsSection } from './index';

interface SettingsMenuProps {
  onNavigate: (section: SettingsSection) => void;
  onSignOut: () => void;
}

export default function SettingsMenu({ onNavigate, onSignOut }: SettingsMenuProps) {
  const sections = [
    {
      title: 'Account',
      items: [
        {
          id: 'account' as SettingsSection,
          title: 'Account Details',
          description: 'Email, creation date, and profile info',
          icon: User,
          color: 'from-blue-500 to-cyan-500',
          disabled: false,
        },
        {
          id: 'security' as SettingsSection,
          title: 'Password & Security',
          description: 'Change password and security settings',
          icon: Shield,
          color: 'from-emerald-500 to-green-500',
          disabled: false,
        },
        {
          id: 'friends' as SettingsSection,
          title: 'Friends & Contacts',
          description: 'Manage your connections',
          icon: UserPlus,
          color: 'from-purple-500 to-pink-500',
          disabled: false,
        },
      ],
    },
    {
      title: 'Preferences',
      items: [
        {
          id: 'theme' as SettingsSection,
          title: 'Appearance',
          description: 'Theme and display settings',
          icon: Palette,
          color: 'from-orange-500 to-red-500',
          disabled: false,
        },
      ],
    },
    {
      title: 'Coming Soon',
      items: [
        {
          id: 'menu' as SettingsSection,
          title: 'Notifications',
          description: 'Push and email notifications',
          icon: Bell,
          color: 'from-yellow-500 to-orange-500',
          disabled: true,
        },
        {
          id: 'menu' as SettingsSection,
          title: 'Privacy',
          description: 'Who can see your content',
          icon: Lock,
          color: 'from-gray-500 to-gray-600',
          disabled: true,
        },
        {
          id: 'menu' as SettingsSection,
          title: 'Devices',
          description: 'Manage logged in devices',
          icon: Smartphone,
          color: 'from-indigo-500 to-blue-500',
          disabled: true,
        },
        {
          id: 'menu' as SettingsSection,
          title: 'Help & Support',
          description: 'FAQs and contact support',
          icon: HelpCircle,
          color: 'from-teal-500 to-emerald-500',
          disabled: true,
        },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      {sections.map((section, sectionIndex) => (
        <motion.div
          key={section.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: sectionIndex * 0.1 }}
        >
          <h3 className="text-sm font-semibold text-muted-foreground mb-3 px-1">
            {section.title}
          </h3>
          <div className="space-y-2">
            {section.items.map((item, index) => (
              <motion.button
                key={`${item.id}-${index}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: sectionIndex * 0.1 + index * 0.05 }}
                whileHover={{ scale: item.disabled ? 1 : 1.01, x: item.disabled ? 0 : 4 }}
                whileTap={{ scale: item.disabled ? 1 : 0.99 }}
                onClick={() => !item.disabled && onNavigate(item.id)}
                disabled={item.disabled}
                className={`w-full text-left p-4 rounded-xl border border-border transition-all flex items-center gap-4 group ${
                  item.disabled 
                    ? 'opacity-50 cursor-not-allowed bg-muted/30' 
                    : 'bg-card hover:bg-muted/50 hover:border-primary/30 hover:shadow-lg'
                }`}
              >
                {/* Icon */}
                <div className={`p-2.5 rounded-xl bg-gradient-to-br ${item.color} shadow-lg`}>
                  <item.icon className="h-5 w-5 text-white" />
                </div>
                
                {/* Text */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground flex items-center gap-2">
                    {item.title}
                    {item.disabled && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded-full text-muted-foreground">
                        Soon
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground truncate">{item.description}</p>
                </div>
                
                {/* Arrow */}
                {!item.disabled && (
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                )}
              </motion.button>
            ))}
          </div>
        </motion.div>
      ))}

      {/* Sign Out Button */}
      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        onClick={onSignOut}
        className="w-full p-4 bg-destructive/10 text-destructive rounded-xl hover:bg-destructive/20 transition-all flex items-center justify-center gap-3 font-medium"
      >
        <LogOut className="h-5 w-5" />
        Sign Out
      </motion.button>
    </div>
  );
}
