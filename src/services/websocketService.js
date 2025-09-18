const socketIo = require('socket.io');
const Notification = require('../models/Notification');

let v_io = null;
const v_userSockets = new Map(); // Mapear user_id a socket_id

const f_initializeWebSocket = (p_server) => {
  v_io = socketIo(p_server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  v_io.on('connection', (p_socket) => {
    console.log('Usuario conectado:', p_socket.id);

    p_socket.on('authenticate', (p_data) => {
      const { user_id } = p_data;
      if (user_id) {
        v_userSockets.set(user_id, p_socket.id);
        p_socket.userId = user_id;
        p_socket.join(`user_${user_id}`);
        console.log(`Usuario ${user_id} autenticado con socket ${p_socket.id}`);
      }
    });

    p_socket.on('disconnect', () => {
      if (p_socket.userId) {
        v_userSockets.delete(p_socket.userId);
        console.log(`Usuario ${p_socket.userId} desconectado`);
      }
    });

    p_socket.on('mark_notification_read', async (p_data) => {
      try {
        const { notification_id } = p_data;
        await Notification.findByIdAndUpdate(
          notification_id,
          { 
            status: 'read',
            read_at: new Date()
          }
        );
        
        p_socket.emit('notification_marked_read', { notification_id });
      } catch (p_error) {
        p_socket.emit('error', { message: 'Error marking notification as read' });
      }
    });
  });

  return v_io;
};

const f_sendRealTimeNotification = (p_userId, p_notification) => {
  if (v_io) {
    v_io.to(`user_${p_userId}`).emit('new_notification', {
      id: p_notification._id,
      title: p_notification.title,
      message: p_notification.message,
      type: p_notification.type,
      priority: p_notification.priority,
      createdAt: p_notification.createdAt,
      metadata: p_notification.metadata
    });
  }
};

const f_sendBulkRealTimeNotification = (p_userIds, p_notification) => {
  if (v_io) {
    p_userIds.forEach(userId => {
      f_sendRealTimeNotification(userId, p_notification);
    });
  }
};

const f_getConnectedUsers = () => {
  return Array.from(v_userSockets.keys());
};

const f_isUserConnected = (p_userId) => {
  return v_userSockets.has(p_userId);
};

module.exports = {
  f_initializeWebSocket,
  f_sendRealTimeNotification,
  f_sendBulkRealTimeNotification,
  f_getConnectedUsers,
  f_isUserConnected
};
