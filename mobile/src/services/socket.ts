import { io, Socket } from 'socket.io-client';
import { StorageService } from './storage';

let socket: Socket | null = null;

export const SocketService = {
  async connect(): Promise<Socket> {
    if (socket && socket.connected) return socket;

    const token = await StorageService.getAccessToken();
    socket = io('https://api.giro.ao', {
      transports: ['websocket', 'polling'], // Fallback automático para polling
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
      auth: { token }
    });

    socket.on('connect', () => {
      console.log('⚡ Conectado ao servidor de telemetria GIRO Angola.');
    });

    socket.on('disconnect', (reason) => {
      console.warn('🔌 Desconectado do WebSocket:', reason);
    });

    return socket;
  },

  getSocket(): Socket | null {
    return socket;
  },

  disconnect() {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
  }
};
