const express = require('express');
const {
  f_getAllTemplates,
  f_getTemplateById,
  f_createTemplate,
  f_updateTemplate,
  f_deleteTemplate
} = require('../controllers/notificationTemplateController');

const v_router = express.Router();

v_router.get('/', f_getAllTemplates);
v_router.get('/:id', f_getTemplateById);
v_router.post('/', f_createTemplate);
v_router.put('/:id', f_updateTemplate);
v_router.delete('/:id', f_deleteTemplate);

module.exports = v_router;
