const DiscountCode = require('../models/DiscountCode');

const f_getAllDiscountCodes = async (p_req, p_res) => {
  try {
    const v_page = parseInt(p_req.query.page) || 1;
    const v_limit = parseInt(p_req.query.limit) || 10;
    const v_skip = (v_page - 1) * v_limit;

    const v_filter = {};
    if (p_req.query.isActive !== undefined) {
      v_filter.isActive = p_req.query.isActive === 'true';
    }

    const v_discountCodes = await DiscountCode.find(v_filter)
      .skip(v_skip)
      .limit(v_limit)
      .sort({ createdAt: -1 });

    const v_total = await DiscountCode.countDocuments(v_filter);

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

const f_validateDiscountCode = async (p_req, p_res) => {
  try {
    const { code } = p_req.params;
    const v_discountCode = await DiscountCode.findOne({ 
      code: code.toUpperCase(),
      isActive: true,
      expirationDate: { $gt: new Date() }
    });

    if (!v_discountCode) {
      return p_res.status(404).json({ 
        message: 'Invalid or expired discount code',
        isValid: false 
      });
    }

    if (v_discountCode.usageLimit && v_discountCode.usedCount >= v_discountCode.usageLimit) {
      return p_res.status(400).json({ 
        message: 'Discount code usage limit exceeded',
        isValid: false 
      });
    }

    p_res.json({
      isValid: true,
      discountCode: v_discountCode,
      remainingUses: v_discountCode.usageLimit ? 
        v_discountCode.usageLimit - v_discountCode.usedCount : null
    });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_createDiscountCode = async (p_req, p_res) => {
  try {
    const v_discountCode = new DiscountCode({
      ...p_req.body,
      code: p_req.body.code.toUpperCase()
    });
    const v_savedDiscountCode = await v_discountCode.save();
    p_res.status(201).json(v_savedDiscountCode);
  } catch (p_error) {
    if (p_error.code === 11000) {
      p_res.status(400).json({ message: 'Discount code already exists' });
    } else {
      p_res.status(400).json({ message: p_error.message });
    }
  }
};

const f_updateDiscountCode = async (p_req, p_res) => {
  try {
    if (p_req.body.code) {
      p_req.body.code = p_req.body.code.toUpperCase();
    }
    
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

const f_deactivateDiscountCode = async (p_req, p_res) => {
  try {
    const v_discountCode = await DiscountCode.findByIdAndUpdate(
      p_req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!v_discountCode) {
      return p_res.status(404).json({ message: 'Discount code not found' });
    }
    p_res.json({ message: 'Discount code deactivated successfully', discountCode: v_discountCode });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

module.exports = {
  f_getAllDiscountCodes,
  f_getDiscountCodeById,
  f_validateDiscountCode,
  f_createDiscountCode,
  f_updateDiscountCode,
  f_deleteDiscountCode,
  f_deactivateDiscountCode
};
