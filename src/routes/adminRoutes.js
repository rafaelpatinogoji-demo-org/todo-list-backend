const express = require('express');
const { f_verifyToken, f_verifyAdmin, f_verifySuperAdmin } = require('../middleware/authMiddleware');
const { f_logAdminAction } = require('../middleware/auditMiddleware');

const { f_adminLogin, f_verifyAdminToken } = require('../controllers/adminAuthController');
const { f_getDashboardMetrics, f_getSystemReports } = require('../controllers/adminDashboardController');
const { 
  f_getAllUsersAdmin, 
  f_createUserAdmin,
  f_updateUserAdmin,
  f_toggleUserStatus,
  f_deleteUserAdmin,
  f_bulkUserOperations,
  f_exportUsers 
} = require('../controllers/adminUserController');
const {
  f_getAllMoviesAdmin,
  f_getMovieWithStats,
  f_bulkMovieOperations,
  f_exportMovies
} = require('../controllers/adminMovieController');
const {
  f_getAllCommentsAdmin,
  f_bulkCommentOperations,
  f_getCommentStats,
  f_exportComments
} = require('../controllers/adminCommentController');
const {
  f_getAllTheatersAdmin,
  f_bulkTheaterOperations,
  f_getTheaterStats,
  f_exportTheaters
} = require('../controllers/adminTheaterController');
const {
  f_getAllSessionsAdmin,
  f_bulkSessionOperations,
  f_getSessionStats,
  f_exportSessions
} = require('../controllers/adminSessionController');

const v_router = express.Router();

v_router.post('/auth/login', f_adminLogin);

v_router.use(f_verifyToken);
v_router.use(f_verifyAdmin);

v_router.get('/auth/verify', f_verifyAdminToken);

v_router.get('/dashboard/metrics', f_getDashboardMetrics);
v_router.get('/reports', f_getSystemReports);

v_router.get('/users', f_getAllUsersAdmin);
v_router.post('/users', f_logAdminAction('CREATE_USER', 'User'), f_createUserAdmin);
v_router.put('/users/:id', f_logAdminAction('UPDATE_USER', 'User'), f_updateUserAdmin);
v_router.patch('/users/:id/toggle-status', f_logAdminAction('TOGGLE_USER_STATUS', 'User'), f_toggleUserStatus);
v_router.delete('/users/:id', f_logAdminAction('DELETE_USER', 'User'), f_deleteUserAdmin);
v_router.post('/users/bulk', f_logAdminAction('BULK_USER_OPERATION', 'User'), f_bulkUserOperations);
v_router.get('/users/export', f_logAdminAction('EXPORT_USERS', 'User'), f_exportUsers);

v_router.get('/movies', f_getAllMoviesAdmin);
v_router.get('/movies/:id/stats', f_getMovieWithStats);
v_router.post('/movies/bulk', f_logAdminAction('BULK_MOVIE_OPERATION', 'Movie'), f_bulkMovieOperations);
v_router.get('/movies/export', f_logAdminAction('EXPORT_MOVIES', 'Movie'), f_exportMovies);

v_router.get('/comments', f_getAllCommentsAdmin);
v_router.get('/comments/stats', f_getCommentStats);
v_router.post('/comments/bulk', f_logAdminAction('BULK_COMMENT_OPERATION', 'Comment'), f_bulkCommentOperations);
v_router.get('/comments/export', f_logAdminAction('EXPORT_COMMENTS', 'Comment'), f_exportComments);

v_router.get('/theaters', f_getAllTheatersAdmin);
v_router.get('/theaters/stats', f_getTheaterStats);
v_router.post('/theaters/bulk', f_logAdminAction('BULK_THEATER_OPERATION', 'Theater'), f_bulkTheaterOperations);
v_router.get('/theaters/export', f_logAdminAction('EXPORT_THEATERS', 'Theater'), f_exportTheaters);

v_router.get('/sessions', f_getAllSessionsAdmin);
v_router.get('/sessions/stats', f_getSessionStats);
v_router.post('/sessions/bulk', f_logAdminAction('BULK_SESSION_OPERATION', 'Session'), f_bulkSessionOperations);
v_router.get('/sessions/export', f_logAdminAction('EXPORT_SESSIONS', 'Session'), f_exportSessions);

module.exports = v_router;
