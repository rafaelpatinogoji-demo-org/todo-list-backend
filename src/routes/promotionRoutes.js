const express = require('express');
const {
  f_getAllPromotions,
  f_getPromotionById,
  f_createPromotion,
  f_updatePromotion,
  f_deletePromotion,
  f_validatePromoCode,
  f_getActivePromotions,
  f_applyPromotion,
  f_getPromotionUsage
} = require('../controllers/promotionController');

const v_router = express.Router();

v_router.get('/', f_getAllPromotions);
v_router.get('/active', f_getActivePromotions);
v_router.get('/validate/:promo_code', f_validatePromoCode);
v_router.get('/:id/usage', f_getPromotionUsage);
v_router.get('/:id', f_getPromotionById);
v_router.post('/', f_createPromotion);
v_router.post('/apply', f_applyPromotion);
v_router.put('/:id', f_updatePromotion);
v_router.delete('/:id', f_deletePromotion);

module.exports = v_router;
