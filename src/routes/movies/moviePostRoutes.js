const express = require('express');
const {
  f_createMovie
} = require('../../controllers/movieController');

const v_router = express.Router();

// Crear nueva película
v_router.post('/', f_createMovie);

module.exports = v_router;
