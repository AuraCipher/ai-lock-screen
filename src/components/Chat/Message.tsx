import React, { useState, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { marked } from 'marked';
import { Check, CheckCheck, MoreVertical, Trash2, Reply, Copy, Forward } from 'lucide-react';
import DOMPurify from 'dompurify';

interface MessageProps {
  content: string;
  timestamp: string;
  isOwn: boolean;
  status: 'sent' | 'delivered' | 'read';
  attachments?: { type: string; url: string }[];
  onDelete?: () => void;
}

export default function Message({ content, timestamp, isOwn, status, attachments, onDelete }: MessageProps) {
  const [showActions, setShowActions] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const messageRef = useRef<HTMLDivElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (actionsRef.current && !actionsRef.current.contains(event.target as Node)) {
        setShowActions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getStatusIcon = () => {
    switch (status) {
      case 'sent':
        return <Check className="h-4 w-4" />;
      case 'delivered':
        return <CheckCheck className="h-4 w-4" />;
      case 'read':
        return <CheckCheck className="h-4 w-4 text-blue-500" />;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const today = new Date();
    
    if (date.toDateString() === today.toDateString()) {
      return format(date, 'HH:mm');
    }
    return format(date, 'dd/MM');
  };

  const handleLongPressStart = () => {
    const timer = setTimeout(() => {
      setShowActions(true);
    }, 500);
    setLongPressTimer(timer);
  };

  const handleLongPressEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(content);
    setShowActions(false);
    toast.success('Message copied to clipboard');
  };

  const renderContent = () => {
    // Convert markdown to HTML
    const html = marked(content, { breaks: true });
    
    // Process hashtags and links
    const processedHtml = DOMPurify.sanitize(html)
      .replace(
        /#(\w+)/g,
        '<a href="/hashtag/$1" class="text-blue-500 hover:underline">#$1</a>'
      )
      .replace(
        /(https?:\/\/[^\s<]+)/g,
        '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:underline">$1</a>'
      );

    return (
      <div
        className="prose prose-sm max-w-none"
        dangerouslySetInnerHTML={{ __html: processedHtml }}
      />
    );
  };

  return (
    <div
      ref={messageRef}
      className={`group relative flex ${isOwn ? 'justify-end' : 'justify-start'} mb-4`}
      onMouseDown={handleLongPressStart}
      onMouseUp={handleLongPressEnd}
      onMouseLeave={handleLongPressEnd}
      onTouchStart={handleLongPressStart}
      onTouchEnd={handleLongPressEnd}
    >
      <div
        className={`relative max-w-[70%] rounded-lg px-4 py-2 ${
          isOwn ? 'bg-indigo-600 text-white' : 'bg-white text-gray-900'
        }`}
      >
        <button
          onClick={() => setShowActions(!showActions)}
          className={`absolute -right-8 top-2 p-1 rounded-full ${
            showActions ? 'bg-gray-200' : 'opacity-0 group-hover:opacity-100'
          }`}
        >
          <MoreVertical className="h-4 w-4 text-gray-500" />
        </button>

        {/* Attachments */}
        {attachments && attachments.length > 0 && (
          <div className="mb-2 space-y-2">
            {attachments.map((attachment, index) => (
              attachment.type.startsWith('image') ? (
                <img
                  key={index}
                  src={attachment.url}
                  alt="attachment"
                  className="rounded-lg max-h-60 w-auto"
                />
              ) : (
                <video
                  key={index}
                  src={attachment.url}
                  controls
                  className="rounded-lg max-h-60 w-auto"
                />
              )
            ))}
          </div>
        )}

        {/* Message content */}
        {renderContent()}

        {/* Timestamp and status */}
        <div className="flex items-center justify-end space-x-1 mt-1 text-xs opacity-75">
          <span>{formatTimestamp(timestamp)}</span>
          {isOwn && getStatusIcon()}
        </div>
      </div>

      {/* Message actions dropdown */}
      {showActions && (
        <div
          ref={actionsRef}
          className={`absolute ${
            isOwn ? 'right-full mr-2' : 'left-full ml-2'
          } top-0 bg-white rounded-lg shadow-lg py-1 min-w-[140px] z-10`}
        >
          <button
            onClick={() => {
              handleCopyText();
              setShowActions(false);
            }}
            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            <Copy className="h-4 w-4 mr-2" />
            Copy
          </button>
          <button
            onClick={() => {
              // Handle reply
              setShowActions(false);
            }}
            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            <Reply className="h-4 w-4 mr-2" />
            Reply
          </button>
          <button
            onClick={() => {
              // Handle forward
              setShowActions(false);
            }}
            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            <Forward className="h-4 w-4 mr-2" />
            Forward
          </button>
          {isOwn && (
            <button
              onClick={() => {
                onDelete?.();
                setShowActions(false);
              }}
              className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}