import React, { useState, useRef, useEffect } from 'react';
import { Smile, Paperclip, Mic, Send, X } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';

interface MessageInputProps {
  selectedUser: string;
  onSend: (content: string, attachments?: File[]) => Promise<void>;
}

export default function MessageInput({ selectedUser, onSend }: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (textAreaRef.current) {
      textAreaRef.current.style.height = 'auto';
      textAreaRef.current.style.height = `${textAreaRef.current.scrollHeight}px`;
    }
  }, [message]);

  const handleEmojiClick = (emojiData: any) => {
    const cursor = textAreaRef.current?.selectionStart || message.length;
    const newMessage = 
      message.slice(0, cursor) + 
      emojiData.emoji + 
      message.slice(cursor);
    setMessage(newMessage);
  };

  const handleAttachmentClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => {
      const isImage = file.type.startsWith('image/') && file.size <= 10 * 1024 * 1024;
      const isVideo = file.type.startsWith('video/') && file.size <= 100 * 1024 * 1024;
      return isImage || isVideo;
    });

    if (validFiles.length !== files.length) {
      toast.error('Some files exceeded size limits or had invalid formats');
    }

    setAttachments(prev => [...prev, ...validFiles]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() && attachments.length === 0) return;

    try {
      await onSend(message, attachments);
      setMessage('');
      setAttachments([]);
      if (textAreaRef.current) {
        textAreaRef.current.style.height = 'auto';
      }
    } catch (error) {
      toast.error('Failed to send message');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="border-t border-gray-200 bg-white p-4">
      {/* Attachments preview */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {attachments.map((file, index) => (
            <div key={index} className="relative">
              {file.type.startsWith('image/') ? (
                <img
                  src={URL.createObjectURL(file)}
                  alt="attachment"
                  className="h-20 w-20 object-cover rounded"
                />
              ) : (
                <video
                  src={URL.createObjectURL(file)}
                  className="h-20 w-20 object-cover rounded"
                />
              )}
              <button
                onClick={() => removeAttachment(index)}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        <div className="relative flex-1">
          <textarea
            ref={textAreaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="w-full p-3 pr-12 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none max-h-32"
            rows={1}
          />
          <div className="absolute right-3 bottom-3">
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="text-gray-400 hover:text-gray-600"
            >
              <Smile className="h-5 w-5" />
            </button>
          </div>
          {showEmojiPicker && (
            <div ref={emojiPickerRef} className="absolute bottom-full right-0 mb-2">
              <EmojiPicker
                onEmojiClick={handleEmojiClick}
                width={320}
                height={400}
              />
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*"
          onChange={handleFileChange}
          className="hidden"
        />

        <button
          type="button"
          onClick={handleAttachmentClick}
          className="p-3 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
        >
          <Paperclip className="h-5 w-5" />
        </button>

        <button
          type="button"
          onClick={() => setIsRecording(!isRecording)}
          className={`p-3 rounded-full ${
            isRecording
              ? 'text-red-500 bg-red-50'
              : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Mic className="h-5 w-5" />
        </button>

        <button
          type="submit"
          disabled={!message.trim() && attachments.length === 0}
          className="p-3 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="h-5 w-5" />
        </button>
      </form>
    </div>
  );
}