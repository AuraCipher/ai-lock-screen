import { motion } from 'framer-motion';
import { Heart, MessageCircle, Image } from 'lucide-react';
import { Post } from './index';

interface ProfilePostsGridProps {
  posts: Post[];
  emptyMessage: string;
}

export default function ProfilePostsGrid({ posts, emptyMessage }: ProfilePostsGridProps) {
  if (posts.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-2xl shadow-lg border border-border p-12 text-center"
      >
        <div className="w-20 h-20 bg-gradient-to-br from-muted to-muted/50 rounded-full flex items-center justify-center mx-auto mb-4">
          <Image className="h-10 w-10 text-muted-foreground/40" />
        </div>
        <p className="text-muted-foreground font-medium">{emptyMessage}</p>
        <p className="text-muted-foreground/60 text-sm mt-1">Share your first moment!</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl shadow-lg border border-border p-3 sm:p-4"
    >
      <div className="grid grid-cols-3 gap-1.5 sm:gap-3">
        {posts.map((post, index) => (
          <motion.div
            key={post.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.03 }}
            whileHover={{ scale: 1.02 }}
            className="aspect-square relative group cursor-pointer overflow-hidden rounded-xl sm:rounded-2xl"
          >
            {post.image_url ? (
              <img
                src={post.image_url}
                alt=""
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center p-3">
                <p className="text-muted-foreground text-xs sm:text-sm line-clamp-4 text-center leading-relaxed">
                  {post.content}
                </p>
              </div>
            )}
            
            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-4 sm:gap-6">
              <motion.div 
                initial={{ scale: 0 }}
                whileHover={{ scale: 1.1 }}
                className="flex items-center gap-1.5 text-white"
              >
                <Heart className="h-5 w-5 sm:h-6 sm:w-6 fill-current" />
                <span className="font-semibold text-sm sm:text-base">0</span>
              </motion.div>
              <motion.div 
                initial={{ scale: 0 }}
                whileHover={{ scale: 1.1 }}
                className="flex items-center gap-1.5 text-white"
              >
                <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6" />
                <span className="font-semibold text-sm sm:text-base">0</span>
              </motion.div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
