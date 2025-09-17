const express = require('express');
const {
  f_getAllSessions,
  f_getSessionById,
  f_createSession,
  f_updateSession,
  f_deleteSession
} = require('../controllers/sessionController');

const v_router = express.Router();

v_router.get('/', f_getAllSessions);
v_router.get('/:id', f_getSessionById);
v_router.post('/', f_createSession);
v_router.put('/:id', f_updateSession);
v_router.delete('/:id', f_deleteSession);

module.exports = v_router;
