const Promotion = require('../models/Promotion');

const f_getAllPromotions = async (p_req, p_res) => {
  try {
    const v_page = parseInt(p_req.query.page) || 1;
    const v_limit = parseInt(p_req.query.limit) || 10;
    const v_skip = (v_page - 1) * v_limit;

    const v_promotions = await Promotion.find()
      .populate('applicable_events', 'title start_date')
      .populate('created_by', 'name email')
      .skip(v_skip)
      .limit(v_limit)
      .sort({ created_date: -1 });

    const v_total = await Promotion.countDocuments();

    p_res.json({
      promotions: v_promotions,
      currentPage: v_page,
      totalPages: Math.ceil(v_total / v_limit),
      totalPromotions: v_total
    });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_getPromotionById = async (p_req, p_res) => {
  try {
    const v_promotion = await Promotion.findById(p_req.params.id)
      .populate('applicable_events', 'title start_date event_type')
      .populate('created_by', 'name email');
    
    if (!v_promotion) {
      return p_res.status(404).json({ message: 'Promotion not found' });
    }
    p_res.json(v_promotion);
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_createPromotion = async (p_req, p_res) => {
  try {
    const v_promotion = new Promotion(p_req.body);
    const v_savedPromotion = await v_promotion.save();
    p_res.status(201).json(v_savedPromotion);
  } catch (p_error) {
    p_res.status(400).json({ message: p_error.message });
  }
};

const f_updatePromotion = async (p_req, p_res) => {
  try {
    const v_promotion = await Promotion.findByIdAndUpdate(
      p_req.params.id,
      p_req.body,
      { new: true, runValidators: true }
    );
    if (!v_promotion) {
      return p_res.status(404).json({ message: 'Promotion not found' });
    }
    p_res.json(v_promotion);
  } catch (p_error) {
    p_res.status(400).json({ message: p_error.message });
  }
};

const f_deletePromotion = async (p_req, p_res) => {
  try {
    const v_promotion = await Promotion.findByIdAndDelete(p_req.params.id);
    if (!v_promotion) {
      return p_res.status(404).json({ message: 'Promotion not found' });
    }
    p_res.json({ message: 'Promotion deleted successfully' });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_validatePromotionCode = async (p_req, p_res) => {
  try {
    const { code, event_id } = p_req.body;
    
    if (!code || !event_id) {
      return p_res.status(400).json({ message: 'Code and event_id are required' });
    }
    
    const v_currentDate = new Date();
    const v_promotion = await Promotion.findOne({
      code: code.toUpperCase(),
      status: 'active',
      valid_from: { $lte: v_currentDate },
      valid_until: { $gte: v_currentDate }
    });
    
    if (!v_promotion) {
      return p_res.status(404).json({ 
        valid: false, 
        message: 'Invalid or expired promotion code' 
      });
    }
    
    if (v_promotion.usage_limit && v_promotion.used_count >= v_promotion.usage_limit) {
      return p_res.status(400).json({ 
        valid: false, 
        message: 'Promotion code usage limit exceeded' 
      });
    }
    
    if (v_promotion.applicable_events.length > 0 && 
        !v_promotion.applicable_events.includes(event_id)) {
      return p_res.status(400).json({ 
        valid: false, 
        message: 'Promotion code not applicable to this event' 
      });
    }
    
    p_res.json({
      valid: true,
      promotion: v_promotion,
      message: 'Promotion code is valid'
    });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_getActivePromotions = async (p_req, p_res) => {
  try {
    const v_currentDate = new Date();
    const v_promotions = await Promotion.find({
      status: 'active',
      valid_from: { $lte: v_currentDate },
      valid_until: { $gte: v_currentDate }
    })
      .populate('applicable_events', 'title start_date')
      .sort({ created_date: -1 });
    
    p_res.json(v_promotions);
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

module.exports = {
  f_getAllPromotions,
  f_getPromotionById,
  f_createPromotion,
  f_updatePromotion,
  f_deletePromotion,
  f_validatePromotionCode,
  f_getActivePromotions
};
