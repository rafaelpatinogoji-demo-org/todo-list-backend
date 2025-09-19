const express = require('express');
const f_jwtAuth = require('../middleware/jwtAuth');
const {
  f_getAllTheaters,
  f_getTheaterById,
  f_createTheater,
  f_updateTheater,
  f_deleteTheater
} = require('../controllers/theaterController');

const v_router = express.Router();

v_router.get('/', f_jwtAuth, f_getAllTheaters);
v_router.get('/:id', f_jwtAuth, f_getTheaterById);
v_router.post('/', f_createTheater);
v_router.put('/:id', f_updateTheater);
v_router.delete('/:id', f_deleteTheater);

module.exports = v_router;
