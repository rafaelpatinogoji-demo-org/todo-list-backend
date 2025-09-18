const UserEvent = require('../models/UserEvent');
const SystemMetrics = require('../models/SystemMetrics');

const f_trackUserEvents = async (p_req, p_res, p_next) => {
  try {
    const v_userId = p_req.headers['x-user-id'] || p_req.body.user_id;
    
    if (v_userId) {
      const v_eventData = {
        user_id: v_userId,
        event_type: 'page_view',
        event_data: {
          page_url: p_req.originalUrl
        },
        ip_address: p_req.ip,
        user_agent: p_req.get('User-Agent')
      };

      if (p_req.path.includes('/movies/')) {
        v_eventData.event_type = 'movie_view';
        const v_movieId = p_req.params.id;
        if (v_movieId) {
          v_eventData.event_data.movie_id = v_movieId;
        }
      } else if (p_req.path.includes('/search')) {
        v_eventData.event_type = 'search';
        v_eventData.event_data.search_query = p_req.query.title || p_req.query.genre;
      }

      setImmediate(async () => {
        try {
          const v_userEvent = new UserEvent(v_eventData);
          await v_userEvent.save();
        } catch (p_error) {
          console.error('Error guardando evento de usuario:', p_error);
        }
      });
    }
  } catch (p_error) {
    console.error('Error en middleware de tracking:', p_error);
  }
  
  p_next();
};

const f_trackPerformance = (p_req, p_res, p_next) => {
  const v_startTime = Date.now();
  
  p_res.on('finish', async () => {
    try {
      const v_responseTime = Date.now() - v_startTime;
      const v_memoryUsage = process.memoryUsage();
      
      const v_systemMetric = {
        endpoint: p_req.path,
        method: p_req.method,
        response_time: v_responseTime,
        status_code: p_res.statusCode,
        memory_usage: v_memoryUsage,
        cpu_usage: process.cpuUsage().user / 1000000 // Convertir a segundos
      };

      setImmediate(async () => {
        try {
          const v_metric = new SystemMetrics(v_systemMetric);
          await v_metric.save();
        } catch (p_error) {
          console.error('Error guardando métricas del sistema:', p_error);
        }
      });
    } catch (p_error) {
      console.error('Error en middleware de performance:', p_error);
    }
  });
  
  p_next();
};

module.exports = {
  f_trackUserEvents,
  f_trackPerformance
};
