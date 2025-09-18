const Notification = require('../models/Notification');

const f_trackNotificationAnalytics = async (p_req, p_res, p_next) => {
  try {
    const v_originalSend = p_res.send;
    
    p_res.send = function(data) {
      if (p_req.route && p_req.route.path) {
        f_logNotificationEvent(p_req, p_res, data);
      }
      
      v_originalSend.call(this, data);
    };
    
    p_next();
  } catch (p_error) {
    console.error('Error in notification analytics middleware:', p_error);
    p_next();
  }
};

const f_logNotificationEvent = async (p_req, p_res, p_data) => {
  try {
    const v_event = {
      timestamp: new Date(),
      method: p_req.method,
      path: p_req.route.path,
      statusCode: p_res.statusCode,
      userAgent: p_req.get('User-Agent'),
      ip: p_req.ip,
      userId: p_req.query.user_id || p_req.body.user_id,
      notificationId: p_req.params.id
    };

    console.log('Notification Analytics Event:', v_event);
    
  } catch (p_error) {
    console.error('Error logging notification event:', p_error);
  }
};

module.exports = {
  f_trackNotificationAnalytics
};
