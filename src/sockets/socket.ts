import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';
import cookieParser from 'cookie-parser';
import { sessionMiddleware } from '../middlewares/session.middleware';
import { registerStoryHandlers } from './story.socket';

export const initSocketServer = (httpServer: HttpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Step 2 Bridge: Reuse existing Express middlewares (cookieParser + sessionMiddleware)
  io.use((socket, next) => {
    const req = socket.request as any;
    // We provide a minimal mock of 'res' to prevent "res.cookie is not a function" errors
    const res = {
      cookie: () => {}, // No-op, headers are handled by the Socket.io handshake
      getHeader: () => {},
      setHeader: () => {},
    } as any;

    cookieParser()(req, res, () => {
      sessionMiddleware(req, res, next as any);
    });
  });

  io.on('connection', (socket) => {
    const sessionId = (socket.request as any).sessionId;

    if (sessionId) {
      console.log(`[socket]: User connected with session: ${sessionId}`);
      socket.join(sessionId);
    } else {
      console.log(`[socket]: User connected without session (Handshake failed): ${socket.id}`);
    }

    // Register handlers for story generation
    registerStoryHandlers(io, socket);

    socket.on('disconnect', () => {
      console.log(`[socket]: User disconnected: ${socket.id}`);
    });
  });

  return io;
};
