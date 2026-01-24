import { motion } from 'framer-motion';
import { FileText, Users, UserPlus } from 'lucide-react';

interface ProfileStatsProps {
  postsCount: number;
  followersCount: number;
  followingCount: number;
}

export default function ProfileStats({ postsCount, followersCount, followingCount }: ProfileStatsProps) {
  const stats = [
    { label: 'Posts', value: postsCount, icon: FileText, color: 'from-blue-500 to-cyan-500' },
    { label: 'Followers', value: followersCount, icon: Users, color: 'from-purple-500 to-pink-500' },
    { label: 'Following', value: followingCount, icon: UserPlus, color: 'from-orange-500 to-red-500' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="grid grid-cols-3 gap-3 sm:gap-4"
    >
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 + index * 0.05 }}
          whileHover={{ scale: 1.02, y: -2 }}
          className="bg-card rounded-2xl p-4 sm:p-5 shadow-lg border border-border text-center relative overflow-hidden group cursor-pointer"
        >
          {/* Gradient background on hover */}
          <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-5 transition-opacity`} />
          
          {/* Icon */}
          <div className={`inline-flex p-2 sm:p-2.5 rounded-xl bg-gradient-to-br ${stat.color} mb-2 sm:mb-3`}>
            <stat.icon className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
          </div>
          
          {/* Value */}
          <motion.p 
            className="text-xl sm:text-2xl font-bold text-foreground"
            initial={{ scale: 1 }}
            whileHover={{ scale: 1.1 }}
          >
            {stat.value}
          </motion.p>
          
          {/* Label */}
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">{stat.label}</p>
        </motion.div>
      ))}
    </motion.div>
  );
}
