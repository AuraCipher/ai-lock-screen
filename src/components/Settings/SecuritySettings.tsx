import { motion } from 'framer-motion';
import { Key, Shield, Smartphone, History, ChevronRight } from 'lucide-react';

interface SecuritySettingsProps {
  onPasswordReset: () => void;
}

export default function SecuritySettings({ onPasswordReset }: SecuritySettingsProps) {
  const securityOptions = [
    {
      icon: Key,
      title: 'Change Password',
      description: 'Update your account password',
      action: onPasswordReset,
      color: 'from-blue-500 to-cyan-500',
    },
    {
      icon: Smartphone,
      title: 'Two-Factor Authentication',
      description: 'Add an extra layer of security',
      action: () => {},
      color: 'from-purple-500 to-pink-500',
      disabled: true,
      comingSoon: true,
    },
    {
      icon: History,
      title: 'Login History',
      description: 'View your recent login activity',
      action: () => {},
      color: 'from-emerald-500 to-green-500',
      disabled: true,
      comingSoon: true,
    },
    {
      icon: Shield,
      title: 'Security Checkup',
      description: 'Review your security settings',
      action: () => {},
      color: 'from-orange-500 to-red-500',
      disabled: true,
      comingSoon: true,
    },
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground mb-6">
        Manage your account security settings and protect your account.
      </p>

      {securityOptions.map((option, index) => (
        <motion.button
          key={option.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          whileHover={{ scale: option.disabled ? 1 : 1.01, x: option.disabled ? 0 : 4 }}
          whileTap={{ scale: option.disabled ? 1 : 0.99 }}
          onClick={option.action}
          disabled={option.disabled}
          className={`w-full text-left p-4 rounded-xl border border-border transition-all flex items-center gap-4 group ${
            option.disabled 
              ? 'opacity-50 cursor-not-allowed bg-muted/30' 
              : 'bg-card hover:bg-muted/50 hover:border-primary/30 hover:shadow-lg'
          }`}
        >
          {/* Icon */}
          <div className={`p-2.5 rounded-xl bg-gradient-to-br ${option.color} shadow-lg`}>
            <option.icon className="h-5 w-5 text-white" />
          </div>
          
          {/* Text */}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground flex items-center gap-2">
              {option.title}
              {option.comingSoon && (
                <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded-full text-muted-foreground">
                  Soon
                </span>
              )}
            </p>
            <p className="text-sm text-muted-foreground truncate">{option.description}</p>
          </div>
          
          {/* Arrow */}
          {!option.disabled && (
            <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
          )}
        </motion.button>
      ))}

      {/* Security tip */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="p-4 bg-primary/5 rounded-xl border border-primary/20 mt-6"
      >
        <div className="flex items-start gap-3">
          <Shield className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-foreground">Security Tip</p>
            <p className="text-sm text-muted-foreground">
              Use a strong, unique password and enable two-factor authentication when available to keep your account secure.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
