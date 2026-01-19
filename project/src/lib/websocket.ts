import { io } from 'socket.io-client';
import { supabase } from './supabase';

const WEBSOCKET_URL = import.meta.env.VITE_WEBSOCKET_URL || 'wss://api.flydex.app';

class WebSocketManager {
  private socket: any;
  private messageQueue: any[] = [];
  private isConnected = false;

  constructor() {
    this.socket = io(WEBSOCKET_URL, {
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.setupEventListeners();
  }

  private setupEventListeners() {
    this.socket.on('connect', () => {
      this.isConnected = true;
      this.processMessageQueue();
    });

    this.socket.on('disconnect', () => {
      this.isConnected = false;
    });

    this.socket.on('error', (error: any) => {
      console.error('WebSocket error:', error);
    });
  }

  public async connect(userId: string) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    this.socket.auth = { token: session.access_token };
    this.socket.connect();
  }

  public disconnect() {
    this.socket.disconnect();
  }

  public async sendMessage(message: any) {
    if (!this.isConnected) {
      this.messageQueue.push(message);
      return;
    }

    try {
      this.socket.emit('message', message);
    } catch (error) {
      this.messageQueue.push(message);
      console.error('Failed to send message:', error);
    }
  }

  private async processMessageQueue() {
    while (this.messageQueue.length > 0 && this.isConnected) {
      const message = this.messageQueue.shift();
      await this.sendMessage(message);
    }
  }

  public onMessage(callback: (message: any) => void) {
    this.socket.on('message', callback);
  }

  public onTyping(callback: (data: { userId: string; isTyping: boolean }) => void) {
    this.socket.on('typing', callback);
  }

  public emitTyping(recipientId: string, isTyping: boolean) {
    this.socket.emit('typing', { recipientId, isTyping });
  }
}

export const websocket = new WebSocketManager();