const AuditLog = require('../models/AuditLog');

const f_logAdminAction = (p_action, p_targetType) => {
  return async (p_req, p_res, p_next) => {
    const v_originalSend = p_res.send;
    
    p_res.send = function(p_data) {
      if (p_res.statusCode >= 200 && p_res.statusCode < 300) {
        const v_auditLog = new AuditLog({
          adminId: p_req.user._id,
          action: p_action,
          targetType: p_targetType,
          targetId: p_req.params.id || 'bulk',
          details: {
            method: p_req.method,
            url: p_req.originalUrl,
            body: p_req.body
          },
          ipAddress: p_req.ip || p_req.connection.remoteAddress
        });
        
        v_auditLog.save().catch(console.error);
      }
      
      v_originalSend.call(this, p_data);
    };
    
    p_next();
  };
};

module.exports = { f_logAdminAction };
