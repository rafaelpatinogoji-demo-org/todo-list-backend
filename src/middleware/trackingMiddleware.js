const UserBehavior = require('../models/UserBehavior');

const f_trackUserBehavior = (p_actionType) => {
  return async (p_req, p_res, p_next) => {
    try {
      const v_consentGiven = p_req.headers['x-tracking-consent'] === 'true';
      
      if (v_consentGiven) {
        const v_userId = p_req.headers['x-user-id'] || p_req.body.user_id;
        const v_sessionId = p_req.headers['x-session-id'] || p_req.sessionID || 'anonymous';
        
        const v_metadata = {
          user_agent: p_req.headers['user-agent'],
          ip_address: p_req.ip || p_req.connection.remoteAddress
        };
        
        if (p_actionType === 'search' && p_req.query.title) {
          v_metadata.search_query = p_req.query.title;
        }
        
        if (p_actionType === 'view_movie' && p_req.params.id) {
          v_metadata.movie_id = p_req.params.id;
        }
        
        if (p_actionType === 'browse_genre' && p_req.query.genre) {
          v_metadata.genre = p_req.query.genre;
        }
        
        const v_behaviorData = {
          user_id: v_userId,
          session_id: v_sessionId,
          action_type: p_actionType,
          movie_id: p_req.params.id || p_req.body.movie_id,
          metadata: v_metadata,
          consent_given: true
        };
        
        UserBehavior.create(v_behaviorData).catch(p_error => {
          console.error('Error guardando comportamiento del usuario:', p_error);
        });
      }
      
      p_next();
    } catch (p_error) {
      console.error('Error en middleware de tracking:', p_error);
      p_next();
    }
  };
};

const f_trackApiMetrics = (p_req, p_res, p_next) => {
  const v_startTime = Date.now();
  
  const v_originalSend = p_res.send;
  p_res.send = function(p_data) {
    const v_responseTime = Date.now() - v_startTime;
    
    const v_metricsData = {
      endpoint: p_req.path,
      method: p_req.method,
      status_code: p_res.statusCode,
      response_time: v_responseTime,
      timestamp: new Date(),
      user_agent: p_req.headers['user-agent']
    };
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`API Metrics: ${p_req.method} ${p_req.path} - ${p_res.statusCode} - ${v_responseTime}ms`);
    }
    
    v_originalSend.call(this, p_data);
  };
  
  p_next();
};

module.exports = {
  f_trackUserBehavior,
  f_trackApiMetrics
};
