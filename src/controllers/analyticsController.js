const EventAnalytics = require('../models/EventAnalytics');
const Event = require('../models/Event');
const Ticket = require('../models/Ticket');

const f_getEventAnalytics = async (p_req, p_res) => {
  try {
    const v_analytics = await EventAnalytics.findOne({ event_id: p_req.params.eventId })
      .populate('event_id', 'title start_date event_type capacity');
    
    if (!v_analytics) {
      return p_res.status(404).json({ message: 'Analytics not found for this event' });
    }
    
    p_res.json(v_analytics);
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_generateEventReport = async (p_req, p_res) => {
  try {
    const v_event = await Event.findById(p_req.params.eventId);
    const v_analytics = await EventAnalytics.findOne({ event_id: p_req.params.eventId });
    
    if (!v_event || !v_analytics) {
      return p_res.status(404).json({ message: 'Event or analytics not found' });
    }
    
    const v_tickets = await Ticket.find({ event_id: p_req.params.eventId });
    
    const v_report = {
      event: {
        title: v_event.title,
        event_type: v_event.event_type,
        start_date: v_event.start_date,
        capacity: v_event.capacity,
        status: v_event.status
      },
      sales: {
        total_tickets_sold: v_analytics.total_tickets_sold,
        total_revenue: v_analytics.total_revenue,
        average_ticket_price: v_analytics.total_tickets_sold > 0 ? 
          v_analytics.total_revenue / v_analytics.total_tickets_sold : 0,
        occupancy_rate: (v_analytics.total_tickets_sold / v_event.capacity) * 100
      },
      attendance: {
        attendance_count: v_analytics.attendance_count,
        attendance_rate: v_analytics.total_tickets_sold > 0 ? 
          (v_analytics.attendance_count / v_analytics.total_tickets_sold) * 100 : 0
      },
      feedback: {
        average_rating: v_analytics.average_rating,
        feedback_count: v_analytics.feedback_count
      },
      demographics: v_analytics.demographics,
      tickets_breakdown: {
        confirmed: v_tickets.filter(t => t.ticket_status === 'confirmed').length,
        cancelled: v_tickets.filter(t => t.ticket_status === 'cancelled').length,
        used: v_tickets.filter(t => t.ticket_status === 'used').length
      }
    };
    
    p_res.json(v_report);
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_getAttendanceStats = async (p_req, p_res) => {
  try {
    const v_analytics = await EventAnalytics.findOne({ event_id: p_req.params.eventId })
      .populate('event_id', 'title capacity');
    
    if (!v_analytics) {
      return p_res.status(404).json({ message: 'Analytics not found for this event' });
    }
    
    const v_attendanceStats = {
      event_title: v_analytics.event_id.title,
      capacity: v_analytics.event_id.capacity,
      tickets_sold: v_analytics.total_tickets_sold,
      attendance_count: v_analytics.attendance_count,
      occupancy_rate: (v_analytics.total_tickets_sold / v_analytics.event_id.capacity) * 100,
      attendance_rate: v_analytics.total_tickets_sold > 0 ? 
        (v_analytics.attendance_count / v_analytics.total_tickets_sold) * 100 : 0,
      no_shows: v_analytics.total_tickets_sold - v_analytics.attendance_count
    };
    
    p_res.json(v_attendanceStats);
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_getRevenueStats = async (p_req, p_res) => {
  try {
    const v_analytics = await EventAnalytics.findOne({ event_id: p_req.params.eventId })
      .populate('event_id', 'title base_price');
    
    if (!v_analytics) {
      return p_res.status(404).json({ message: 'Analytics not found for this event' });
    }
    
    const v_tickets = await Ticket.find({ event_id: p_req.params.eventId });
    const v_totalDiscounts = v_tickets.reduce((sum, ticket) => sum + ticket.discount_applied, 0);
    
    const v_revenueStats = {
      event_title: v_analytics.event_id.title,
      base_price: v_analytics.event_id.base_price,
      total_revenue: v_analytics.total_revenue,
      tickets_sold: v_analytics.total_tickets_sold,
      average_ticket_price: v_analytics.total_tickets_sold > 0 ? 
        v_analytics.total_revenue / v_analytics.total_tickets_sold : 0,
      total_discounts_applied: v_totalDiscounts,
      revenue_per_attendee: v_analytics.attendance_count > 0 ? 
        v_analytics.total_revenue / v_analytics.attendance_count : 0
    };
    
    p_res.json(v_revenueStats);
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_getUserEngagement = async (p_req, p_res) => {
  try {
    const v_tickets = await Ticket.find()
      .populate('user_id', 'name email')
      .populate('event_id', 'title event_type');
    
    const v_userEngagement = {};
    
    v_tickets.forEach(ticket => {
      const v_userId = ticket.user_id._id.toString();
      if (!v_userEngagement[v_userId]) {
        v_userEngagement[v_userId] = {
          user: ticket.user_id,
          total_tickets: 0,
          total_spent: 0,
          events_attended: 0,
          event_types: {}
        };
      }
      
      v_userEngagement[v_userId].total_tickets += ticket.quantity;
      v_userEngagement[v_userId].total_spent += ticket.total_price;
      
      if (ticket.ticket_status === 'used') {
        v_userEngagement[v_userId].events_attended += 1;
      }
      
      const v_eventType = ticket.event_id.event_type;
      v_userEngagement[v_userId].event_types[v_eventType] = 
        (v_userEngagement[v_userId].event_types[v_eventType] || 0) + 1;
    });
    
    const v_engagementArray = Object.values(v_userEngagement)
      .sort((a, b) => b.total_spent - a.total_spent);
    
    p_res.json(v_engagementArray);
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_getPopularEvents = async (p_req, p_res) => {
  try {
    const v_analytics = await EventAnalytics.find()
      .populate('event_id', 'title event_type start_date capacity')
      .sort({ total_tickets_sold: -1 })
      .limit(10);
    
    const v_popularEvents = v_analytics.map(analytics => ({
      event: analytics.event_id,
      tickets_sold: analytics.total_tickets_sold,
      revenue: analytics.total_revenue,
      occupancy_rate: (analytics.total_tickets_sold / analytics.event_id.capacity) * 100,
      average_rating: analytics.average_rating,
      attendance_rate: analytics.total_tickets_sold > 0 ? 
        (analytics.attendance_count / analytics.total_tickets_sold) * 100 : 0
    }));
    
    p_res.json(v_popularEvents);
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

module.exports = {
  f_getEventAnalytics,
  f_generateEventReport,
  f_getAttendanceStats,
  f_getRevenueStats,
  f_getUserEngagement,
  f_getPopularEvents
};
