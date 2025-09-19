const express = require('express');
const cors = require('cors');
const connectDB = require('./src/config/database');
const movieRoutes = require('./src/routes/movieRoutes');
const commentRoutes = require('./src/routes/commentRoutes');
const userRoutes = require('./src/routes/userRoutes');
const theaterRoutes = require('./src/routes/theaterRoutes');
const sessionRoutes = require('./src/routes/sessionRoutes');
const embeddedMovieRoutes = require('./src/routes/embeddedMovieRoutes');
const recommendationRoutes = require('./src/routes/recommendationRoutes');

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
v_app.use('/api/recommendations', recommendationRoutes);

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
      recommendations: '/api/recommendations'
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

v_app.listen(c_PORT, () => {
  console.log(`Server running on port ${c_PORT}`);
});

module.exports = v_app;
