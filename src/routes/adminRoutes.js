const express = require('express');
const { f_verifyAdminAuth } = require('../middleware/adminAuth');
const {
  f_getDashboardMetrics,
  f_getAuditLogs
} = require('../controllers/adminController');
const {
  f_getAllUsersAdmin,
  f_suspendUser,
  f_activateUser,
  f_deleteUserAdmin,
  f_bulkUserOperation
} = require('../controllers/adminUserController');
const {
  f_createMovieAdmin,
  f_updateMovieAdmin,
  f_deleteMovieAdmin,
  f_createTheaterAdmin,
  f_updateTheaterAdmin,
  f_deleteTheaterAdmin,
  f_exportData
} = require('../controllers/adminContentController');

const v_router = express.Router();

v_router.use(f_verifyAdminAuth);

v_router.get('/dashboard', f_getDashboardMetrics);
v_router.get('/audit-logs', f_getAuditLogs);

v_router.get('/users', f_getAllUsersAdmin);
v_router.put('/users/:id/suspend', f_suspendUser);
v_router.put('/users/:id/activate', f_activateUser);
v_router.delete('/users/:id', f_deleteUserAdmin);
v_router.post('/users/bulk', f_bulkUserOperation);

v_router.post('/movies', f_createMovieAdmin);
v_router.put('/movies/:id', f_updateMovieAdmin);
v_router.delete('/movies/:id', f_deleteMovieAdmin);

v_router.post('/theaters', f_createTheaterAdmin);
v_router.put('/theaters/:id', f_updateTheaterAdmin);
v_router.delete('/theaters/:id', f_deleteTheaterAdmin);

v_router.get('/export', f_exportData);

v_router.get('/reports/user-activity', async (p_req, p_res) => {
  p_res.json({ message: 'Reporte de actividad de usuarios' });
});

module.exports = v_router;
