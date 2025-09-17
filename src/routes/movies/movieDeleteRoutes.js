const express = require('express');
const {
  f_deleteMovie
} = require('../../controllers/movieController');

const var_router = express.Router();

// Eliminar película por ID
var_router.delete('/:id', f_deleteMovie);

module.exports = var_router;