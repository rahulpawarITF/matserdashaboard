import { Server as SocketServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import { logger } from '../config/logger';
import { heartbeatService } from '../services/heartbeat.service';

let io: SocketServer;

export const initSocket = (server: HttpServer) => {
  io = new SocketServer(server, {
    cors: {
      origin: '*', // Should be restricted by CLIENT_URL in production via env
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    logger.debug(`Socket connected: ${socket.id}`);
    
    // Auto-join dashboard room as per requirements
    socket.join('dashboard');
    try {
      heartbeatService.onViewerConnected();
    } catch (e) {}

    // Allow dashboard client to switch heartbeat modes explicitly
    socket.on('heartbeat:set-mode', (data: { mode: 'safe' | 'live' }) => {
      try {
        if (data?.mode === 'safe' || data?.mode === 'live') {
          heartbeatService.setMode(data.mode);
        }
      } catch (e) {}
    });

    socket.on('disconnect', () => {
      logger.debug(`Socket disconnected: ${socket.id}`);
      try {
        heartbeatService.onViewerDisconnected();
      } catch (e) {}
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
};
