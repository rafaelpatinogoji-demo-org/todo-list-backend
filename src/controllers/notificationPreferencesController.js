const NotificationPreferences = require('../models/NotificationPreferences');

const f_getUserPreferences = async (p_req, p_res) => {
  try {
    const v_userId = p_req.params.userId;
    
    let v_preferences = await NotificationPreferences.findOne({ user_id: v_userId })
      .populate('user_id', 'name email');
    
    if (!v_preferences) {
      v_preferences = new NotificationPreferences({ user_id: v_userId });
      await v_preferences.save();
      v_preferences = await NotificationPreferences.findById(v_preferences._id)
        .populate('user_id', 'name email');
    }
    
    p_res.json(v_preferences);
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_updateUserPreferences = async (p_req, p_res) => {
  try {
    const v_userId = p_req.params.userId;
    
    const v_preferences = await NotificationPreferences.findOneAndUpdate(
      { user_id: v_userId },
      p_req.body,
      { 
        new: true, 
        runValidators: true,
        upsert: true
      }
    ).populate('user_id', 'name email');
    
    p_res.json(v_preferences);
  } catch (p_error) {
    p_res.status(400).json({ message: p_error.message });
  }
};

module.exports = {
  f_getUserPreferences,
  f_updateUserPreferences
};
