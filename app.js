const express = require('express');
const cors = require('cors');
const http = require('http');
const connectDB = require('./src/config/database');
const movieRoutes = require('./src/routes/movieRoutes');
const commentRoutes = require('./src/routes/commentRoutes');
const userRoutes = require('./src/routes/userRoutes');
const theaterRoutes = require('./src/routes/theaterRoutes');
const sessionRoutes = require('./src/routes/sessionRoutes');
const embeddedMovieRoutes = require('./src/routes/embeddedMovieRoutes');
const notificationRoutes = require('./src/routes/notificationRoutes');
const notificationPreferenceRoutes = require('./src/routes/notificationPreferenceRoutes');
const notificationTemplateRoutes = require('./src/routes/notificationTemplateRoutes');
const deviceTokenRoutes = require('./src/routes/deviceTokenRoutes');

const socketService = require('./src/services/socketService');

const v_app = express();
const c_PORT = process.env.PORT || 3000;

connectDB();

v_app.use(cors());
v_app.use(express.json());
v_app.use(express.urlencoded({ extended: true }));

v_app.use('/api/movies', movieRoutes);
v_app.use('/api/comments', commentRoutes);
v_app.use('/api/users', userRoutes);
v_app.use('/api/theaters', theaterRoutes);
v_app.use('/api/sessions', sessionRoutes);
v_app.use('/api/embedded-movies', embeddedMovieRoutes);
v_app.use('/api/notifications', notificationRoutes);
v_app.use('/api/notification-preferences', notificationPreferenceRoutes);
v_app.use('/api/notification-templates', notificationTemplateRoutes);
v_app.use('/api/device-tokens', deviceTokenRoutes);

v_app.get('/', (p_req, p_res) => {
  p_res.json({
    message: 'MFlix API Server',
    version: '1.0.0',
    endpoints: {
      movies: '/api/movies',
      comments: '/api/comments',
      users: '/api/users',
      theaters: '/api/theaters',
      sessions: '/api/sessions',
      embeddedMovies: '/api/embedded-movies',
      notifications: '/api/notifications',
      notificationPreferences: '/api/notification-preferences',
      notificationTemplates: '/api/notification-templates',
      deviceTokens: '/api/device-tokens'
    }
  });
});

v_app.use('*', (p_req, p_res) => {
  p_res.status(404).json({ message: 'Route not found' });
});

v_app.use((p_err, p_req, p_res, p_next) => {
  console.error(p_err.stack);
  p_res.status(500).json({ message: 'Internal server error' });
});

const server = http.createServer(v_app);
socketService.initialize(server);

server.listen(c_PORT, () => {
  console.log(`MFlix API Server running on port ${c_PORT}`);
  console.log('WebSocket server initialized for real-time notifications');
});

module.exports = v_app;
