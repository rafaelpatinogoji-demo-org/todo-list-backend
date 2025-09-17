const express = require('express');
const {
  f_updateMovie
} = require('../../controllers/movieController');

const v_router = express.Router();

// Actualizar película por ID
v_router.put('/:id', f_updateMovie);

module.exports = v_router;
