const DiscountCode = require('../models/DiscountCode');

const f_getAllDiscountCodes = async (p_req, p_res) => {
  try {
    const v_page = parseInt(p_req.query.page) || 1;
    const v_limit = parseInt(p_req.query.limit) || 10;
    const v_skip = (v_page - 1) * v_limit;

    const v_discountCodes = await DiscountCode.find()
      .skip(v_skip)
      .limit(v_limit)
      .sort({ created_at: -1 });

    const v_total = await DiscountCode.countDocuments();

    p_res.json({
      discountCodes: v_discountCodes,
      currentPage: v_page,
      totalPages: Math.ceil(v_total / v_limit),
      totalDiscountCodes: v_total
    });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_getDiscountCodeById = async (p_req, p_res) => {
  try {
    const v_discountCode = await DiscountCode.findById(p_req.params.id);
    if (!v_discountCode) {
      return p_res.status(404).json({ message: 'Discount code not found' });
    }
    p_res.json(v_discountCode);
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_createDiscountCode = async (p_req, p_res) => {
  try {
    const v_discountCode = new DiscountCode(p_req.body);
    const v_savedDiscountCode = await v_discountCode.save();
    p_res.status(201).json(v_savedDiscountCode);
  } catch (p_error) {
    p_res.status(400).json({ message: p_error.message });
  }
};

const f_updateDiscountCode = async (p_req, p_res) => {
  try {
    const v_discountCode = await DiscountCode.findByIdAndUpdate(
      p_req.params.id,
      p_req.body,
      { new: true, runValidators: true }
    );
    if (!v_discountCode) {
      return p_res.status(404).json({ message: 'Discount code not found' });
    }
    p_res.json(v_discountCode);
  } catch (p_error) {
    p_res.status(400).json({ message: p_error.message });
  }
};

const f_deleteDiscountCode = async (p_req, p_res) => {
  try {
    const v_discountCode = await DiscountCode.findByIdAndDelete(p_req.params.id);
    if (!v_discountCode) {
      return p_res.status(404).json({ message: 'Discount code not found' });
    }
    p_res.json({ message: 'Discount code deleted successfully' });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

module.exports = {
  f_getAllDiscountCodes,
  f_getDiscountCodeById,
  f_createDiscountCode,
  f_updateDiscountCode,
  f_deleteDiscountCode
};
