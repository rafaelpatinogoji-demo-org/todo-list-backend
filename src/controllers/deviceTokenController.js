const DeviceToken = require('../models/DeviceToken');

const f_getAllDeviceTokens = async (p_req, p_res) => {
  try {
    const v_userId = p_req.query.user_id;
    if (!v_userId) {
      return p_res.status(400).json({ message: 'user_id query parameter is required' });
    }

    const v_tokens = await DeviceToken.find({ 
      user_id: v_userId,
      active: true 
    });

    p_res.json({ deviceTokens: v_tokens });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_createDeviceToken = async (p_req, p_res) => {
  try {
    const v_existingToken = await DeviceToken.findOne({
      user_id: p_req.body.user_id,
      token: p_req.body.token
    });

    if (v_existingToken) {
      v_existingToken.active = true;
      v_existingToken.last_used = new Date();
      const v_updatedToken = await v_existingToken.save();
      return p_res.json(v_updatedToken);
    }

    const v_deviceToken = new DeviceToken(p_req.body);
    const v_savedToken = await v_deviceToken.save();
    p_res.status(201).json(v_savedToken);
  } catch (p_error) {
    p_res.status(400).json({ message: p_error.message });
  }
};

const f_updateDeviceToken = async (p_req, p_res) => {
  try {
    const v_deviceToken = await DeviceToken.findByIdAndUpdate(
      p_req.params.id,
      { ...p_req.body, last_used: new Date() },
      { new: true, runValidators: true }
    );
    if (!v_deviceToken) {
      return p_res.status(404).json({ message: 'Device token not found' });
    }
    p_res.json(v_deviceToken);
  } catch (p_error) {
    p_res.status(400).json({ message: p_error.message });
  }
};

const f_deleteDeviceToken = async (p_req, p_res) => {
  try {
    const v_deviceToken = await DeviceToken.findByIdAndUpdate(
      p_req.params.id,
      { active: false },
      { new: true }
    );
    if (!v_deviceToken) {
      return p_res.status(404).json({ message: 'Device token not found' });
    }
    p_res.json({ message: 'Device token deactivated successfully' });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

module.exports = {
  f_getAllDeviceTokens,
  f_createDeviceToken,
  f_updateDeviceToken,
  f_deleteDeviceToken
};
