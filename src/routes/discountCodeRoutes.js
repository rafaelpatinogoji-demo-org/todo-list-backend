const express = require('express');
const {
  f_getAllDiscountCodes,
  f_getDiscountCodeById,
  f_createDiscountCode,
  f_updateDiscountCode,
  f_deleteDiscountCode
} = require('../controllers/discountCodeController');

const v_router = express.Router();

v_router.get('/', f_getAllDiscountCodes);
v_router.get('/:id', f_getDiscountCodeById);
v_router.post('/', f_createDiscountCode);
v_router.put('/:id', f_updateDiscountCode);
v_router.delete('/:id', f_deleteDiscountCode);

module.exports = v_router;
