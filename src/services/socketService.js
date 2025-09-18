const socketIo = require('socket.io');
const Session = require('../models/Session');

class SocketService {
  constructor() {
    this.io = null;
    this.userSockets = new Map();
  }

  initialize(server) {
    this.io = socketIo(server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });

    this.io.on('connection', (socket) => {
      console.log('New socket connection:', socket.id);

      socket.on('authenticate', async (token) => {
        try {
          const v_session = await Session.findOne({ jwt: token });
          if (v_session) {
            socket.userId = v_session.user_id;
            this.userSockets.set(v_session.user_id, socket.id);
            socket.join(`user_${v_session.user_id}`);
            socket.emit('authenticated', { userId: v_session.user_id });
            console.log(`User ${v_session.user_id} authenticated on socket ${socket.id}`);
          } else {
            socket.emit('auth_error', { message: 'Invalid token' });
          }
        } catch (error) {
          console.error('Socket authentication error:', error);
          socket.emit('auth_error', { message: 'Authentication failed' });
        }
      });

      socket.on('disconnect', () => {
        if (socket.userId) {
          this.userSockets.delete(socket.userId);
          console.log(`User ${socket.userId} disconnected from socket ${socket.id}`);
        }
      });
    });

    console.log('Socket.IO server initialized');
  }

  sendNotificationToUser(userId, notification) {
    if (this.io) {
      this.io.to(`user_${userId}`).emit('new_notification', notification);
      console.log(`Sent notification to user ${userId}:`, notification.title);
    }
  }

  sendNotificationToAll(notification) {
    if (this.io) {
      this.io.emit('broadcast_notification', notification);
      console.log('Broadcast notification sent:', notification.title);
    }
  }

  isUserConnected(userId) {
    return this.userSockets.has(userId);
  }
}

module.exports = new SocketService();
