const express = require('express');
const v_router = express.Router();

// Importar rutas de comments
const commentGetRoutes = require('./comments/commentGetRoutes');
const commentPostRoutes = require('./comments/commentPostRoutes');
const commentPutRoutes = require('./comments/commentPutRoutes');
const commentDeleteRoutes = require('./comments/commentDeleteRoutes');

// Importar rutas de movies
const movieGetRoutes = require('./movies/movieGetRoutes');
const moviePostRoutes = require('./movies/moviePostRoutes');
const moviePutRoutes = require('./movies/moviePutRoutes');
const movieDeleteRoutes = require('./movies/movieDeleteRoutes');

// Configurar rutas de comments
v_router.use('/comments', commentGetRoutes);
v_router.use('/comments', commentPostRoutes);
v_router.use('/comments', commentPutRoutes);
v_router.use('/comments', commentDeleteRoutes);

// Configurar rutas de movies
v_router.use('/movies', movieGetRoutes);
v_router.use('/movies', moviePostRoutes);
v_router.use('/movies', moviePutRoutes);
v_router.use('/movies', movieDeleteRoutes);

module.exports = v_router;
