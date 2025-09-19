const express = require('express');
const {
  f_getAllPromotions,
  f_getPromotionById,
  f_createPromotion,
  f_updatePromotion,
  f_deletePromotion,
  f_validatePromotionCode,
  f_getActivePromotions
} = require('../controllers/promotionController');

const v_router = express.Router();

v_router.get('/', f_getAllPromotions);
v_router.get('/active', f_getActivePromotions);
v_router.get('/:id', f_getPromotionById);
v_router.post('/', f_createPromotion);
v_router.post('/validate', f_validatePromotionCode);
v_router.put('/:id', f_updatePromotion);
v_router.delete('/:id', f_deletePromotion);

module.exports = v_router;
