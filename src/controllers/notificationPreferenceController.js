const NotificationPreference = require('../models/NotificationPreference');

const f_getPreferences = async (p_req, p_res) => {
  try {
    const v_userId = p_req.query.user_id;
    if (!v_userId) {
      return p_res.status(400).json({ message: 'user_id query parameter is required' });
    }

    let v_preferences = await NotificationPreference.findOne({ user_id: v_userId });
    
    if (!v_preferences) {
      v_preferences = await f_createDefaultPreferences(v_userId);
    }

    p_res.json(v_preferences);
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_updatePreferences = async (p_req, p_res) => {
  try {
    const v_userId = p_req.body.user_id;
    if (!v_userId) {
      return p_res.status(400).json({ message: 'user_id is required in request body' });
    }

    const v_preferences = await NotificationPreference.findOneAndUpdate(
      { user_id: v_userId },
      p_req.body,
      { new: true, runValidators: true, upsert: true }
    );

    p_res.json(v_preferences);
  } catch (p_error) {
    p_res.status(400).json({ message: p_error.message });
  }
};

const f_createDefaultPreferences = async (p_userId) => {
  try {
    const v_defaultPreferences = new NotificationPreference({
      user_id: p_userId,
      email_enabled: true,
      push_enabled: true,
      realtime_enabled: true,
      notification_types: {
        comment: true,
        movie_recommendation: true,
        system: true,
        promotional: false
      },
      quiet_hours: {
        enabled: false,
        start_time: '22:00',
        end_time: '08:00'
      },
      frequency: 'immediate'
    });

    return await v_defaultPreferences.save();
  } catch (p_error) {
    throw new Error(`Failed to create default preferences: ${p_error.message}`);
  }
};

module.exports = {
  f_getPreferences,
  f_updatePreferences,
  f_createDefaultPreferences
};
