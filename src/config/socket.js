const { Server } = require('socket.io');

let io;

const f_initializeSocket = (p_server) => {
  io = new Server(p_server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  io.on('connection', (p_socket) => {
    console.log('Usuario conectado:', p_socket.id);

    p_socket.on('join_user_room', (p_userId) => {
      p_socket.join(`user_${p_userId}`);
      console.log(`Usuario ${p_userId} se unió a su sala`);
    });

    p_socket.on('disconnect', () => {
      console.log('Usuario desconectado:', p_socket.id);
    });
  });

  return io;
};

const f_getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};

module.exports = { f_initializeSocket, f_getIO };
