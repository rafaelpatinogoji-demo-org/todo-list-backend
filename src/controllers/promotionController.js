const Promotion = require('../models/Promotion');

const f_getAllPromotions = async (p_req, p_res) => {
  try {
    const v_page = parseInt(p_req.query.page) || 1;
    const v_limit = parseInt(p_req.query.limit) || 10;
    const v_skip = (v_page - 1) * v_limit;

    const v_promotions = await Promotion.find()
      .populate('applicable_events', 'title start_date event_type')
      .populate('applicable_movies', 'title year genres')
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
      .populate('applicable_movies', 'title year genres');
    
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
    const v_populatedPromotion = await Promotion.findById(v_savedPromotion._id)
      .populate('applicable_events', 'title start_date event_type')
      .populate('applicable_movies', 'title year genres');
    
    p_res.status(201).json(v_populatedPromotion);
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
    )
      .populate('applicable_events', 'title start_date event_type')
      .populate('applicable_movies', 'title year genres');
    
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

const f_validatePromoCode = async (p_req, p_res) => {
  try {
    const { promo_code } = p_req.params;
    const v_currentDate = new Date();
    
    const v_promotion = await Promotion.findOne({
      promo_code: promo_code,
      status: 'active',
      start_date: { $lte: v_currentDate },
      end_date: { $gte: v_currentDate },
      $or: [
        { usage_limit: null },
        { $expr: { $lt: ['$usage_count', '$usage_limit'] } }
      ]
    })
      .populate('applicable_events', 'title start_date event_type')
      .populate('applicable_movies', 'title year genres');
    
    if (!v_promotion) {
      return p_res.status(404).json({ message: 'Invalid or expired promo code' });
    }
    
    p_res.json({
      valid: true,
      promotion: v_promotion
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
      start_date: { $lte: v_currentDate },
      end_date: { $gte: v_currentDate }
    })
      .populate('applicable_events', 'title start_date event_type')
      .populate('applicable_movies', 'title year genres')
      .sort({ created_date: -1 });
    
    p_res.json(v_promotions);
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_applyPromotion = async (p_req, p_res) => {
  try {
    const { promotion_id, original_price } = p_req.body;
    
    const v_promotion = await Promotion.findById(promotion_id);
    if (!v_promotion) {
      return p_res.status(404).json({ message: 'Promotion not found' });
    }
    
    let v_discountedPrice = original_price;
    
    switch (v_promotion.discount_type) {
      case 'percentage':
        v_discountedPrice = original_price * (1 - v_promotion.discount_value / 100);
        break;
      case 'fixed_amount':
        v_discountedPrice = Math.max(0, original_price - v_promotion.discount_value);
        break;
      case 'buy_one_get_one':
        v_discountedPrice = original_price * 0.5;
        break;
    }
    
    await Promotion.findByIdAndUpdate(promotion_id, {
      $inc: { usage_count: 1 }
    });
    
    p_res.json({
      original_price: original_price,
      discounted_price: v_discountedPrice,
      discount_amount: original_price - v_discountedPrice,
      promotion: v_promotion
    });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_getPromotionUsage = async (p_req, p_res) => {
  try {
    const v_promotion = await Promotion.findById(p_req.params.id);
    if (!v_promotion) {
      return p_res.status(404).json({ message: 'Promotion not found' });
    }
    
    const v_usagePercentage = v_promotion.usage_limit 
      ? (v_promotion.usage_count / v_promotion.usage_limit) * 100 
      : null;
    
    p_res.json({
      promotion_id: v_promotion._id,
      campaign_name: v_promotion.campaign_name,
      usage_count: v_promotion.usage_count,
      usage_limit: v_promotion.usage_limit,
      usage_percentage: v_usagePercentage,
      remaining_uses: v_promotion.usage_limit ? v_promotion.usage_limit - v_promotion.usage_count : null
    });
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
  f_validatePromoCode,
  f_getActivePromotions,
  f_applyPromotion,
  f_getPromotionUsage
};
