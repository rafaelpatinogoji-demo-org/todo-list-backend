const Event = require('../models/Event');
const EventTicket = require('../models/EventTicket');
const Promotion = require('../models/Promotion');

const f_getEventAttendance = async (p_req, p_res) => {
  try {
    const v_eventId = p_req.params.eventId;
    
    const v_event = await Event.findById(v_eventId);
    if (!v_event) {
      return p_res.status(404).json({ message: 'Event not found' });
    }
    
    const v_totalTickets = await EventTicket.countDocuments({ event_id: v_eventId });
    const v_confirmedTickets = await EventTicket.countDocuments({ 
      event_id: v_eventId, 
      status: 'confirmed' 
    });
    const v_usedTickets = await EventTicket.countDocuments({ 
      event_id: v_eventId, 
      status: 'used' 
    });
    const v_cancelledTickets = await EventTicket.countDocuments({ 
      event_id: v_eventId, 
      status: 'cancelled' 
    });
    
    const v_attendanceRate = v_totalTickets > 0 ? (v_usedTickets / v_totalTickets) * 100 : 0;
    const v_capacityUtilization = (v_totalTickets / v_event.capacity) * 100;
    
    p_res.json({
      event_id: v_eventId,
      event_title: v_event.title,
      capacity: v_event.capacity,
      available_seats: v_event.available_seats,
      total_tickets_sold: v_totalTickets,
      confirmed_tickets: v_confirmedTickets,
      used_tickets: v_usedTickets,
      cancelled_tickets: v_cancelledTickets,
      attendance_rate: v_attendanceRate,
      capacity_utilization: v_capacityUtilization
    });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_getPromotionPerformance = async (p_req, p_res) => {
  try {
    const v_promotionId = p_req.params.promotionId;
    
    const v_promotion = await Promotion.findById(v_promotionId);
    if (!v_promotion) {
      return p_res.status(404).json({ message: 'Promotion not found' });
    }
    
    const v_ticketsWithPromotion = await EventTicket.find({ 
      promotion_applied: v_promotionId 
    }).populate('event_id', 'title');
    
    const v_totalRevenue = v_ticketsWithPromotion.reduce((sum, ticket) => sum + ticket.price_paid, 0);
    const v_totalTickets = v_ticketsWithPromotion.length;
    
    const v_conversionRate = v_promotion.usage_limit 
      ? (v_promotion.usage_count / v_promotion.usage_limit) * 100 
      : null;
    
    p_res.json({
      promotion_id: v_promotionId,
      campaign_name: v_promotion.campaign_name,
      usage_count: v_promotion.usage_count,
      usage_limit: v_promotion.usage_limit,
      conversion_rate: v_conversionRate,
      total_tickets_sold: v_totalTickets,
      total_revenue_generated: v_totalRevenue,
      average_ticket_price: v_totalTickets > 0 ? v_totalRevenue / v_totalTickets : 0,
      tickets_by_event: v_ticketsWithPromotion.reduce((acc, ticket) => {
        const eventTitle = ticket.event_id.title;
        acc[eventTitle] = (acc[eventTitle] || 0) + 1;
        return acc;
      }, {})
    });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_getRevenueAnalytics = async (p_req, p_res) => {
  try {
    const { start_date, end_date } = p_req.query;
    const v_filter = {};
    
    if (start_date || end_date) {
      v_filter.purchase_date = {};
      if (start_date) {
        v_filter.purchase_date.$gte = new Date(start_date);
      }
      if (end_date) {
        v_filter.purchase_date.$lte = new Date(end_date);
      }
    }
    
    const v_tickets = await EventTicket.find(v_filter)
      .populate('event_id', 'title event_type')
      .populate('promotion_applied', 'campaign_name discount_type');
    
    const v_totalRevenue = v_tickets.reduce((sum, ticket) => sum + ticket.price_paid, 0);
    const v_totalTickets = v_tickets.length;
    
    const v_revenueByEventType = v_tickets.reduce((acc, ticket) => {
      const eventType = ticket.event_id.event_type;
      acc[eventType] = (acc[eventType] || 0) + ticket.price_paid;
      return acc;
    }, {});
    
    const v_ticketsWithPromotions = v_tickets.filter(ticket => ticket.promotion_applied);
    const v_promotionRevenue = v_ticketsWithPromotions.reduce((sum, ticket) => sum + ticket.price_paid, 0);
    
    p_res.json({
      period: {
        start_date: start_date || 'All time',
        end_date: end_date || 'All time'
      },
      total_revenue: v_totalRevenue,
      total_tickets_sold: v_totalTickets,
      average_ticket_price: v_totalTickets > 0 ? v_totalRevenue / v_totalTickets : 0,
      revenue_by_event_type: v_revenueByEventType,
      promotion_statistics: {
        tickets_with_promotions: v_ticketsWithPromotions.length,
        promotion_revenue: v_promotionRevenue,
        promotion_percentage: v_totalTickets > 0 ? (v_ticketsWithPromotions.length / v_totalTickets) * 100 : 0
      }
    });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_getPopularEvents = async (p_req, p_res) => {
  try {
    const v_limit = parseInt(p_req.query.limit) || 10;
    
    const v_eventPopularity = await EventTicket.aggregate([
      {
        $group: {
          _id: '$event_id',
          ticket_count: { $sum: 1 },
          total_revenue: { $sum: '$price_paid' },
          average_price: { $avg: '$price_paid' }
        }
      },
      {
        $sort: { ticket_count: -1 }
      },
      {
        $limit: v_limit
      }
    ]);
    
    const v_populatedEvents = await Event.populate(v_eventPopularity, {
      path: '_id',
      select: 'title event_type start_date capacity movie_id theater_id',
      populate: [
        { path: 'movie_id', select: 'title year genres' },
        { path: 'theater_id', select: 'theaterId location' }
      ]
    });
    
    const v_results = v_populatedEvents.map(event => ({
      event: event._id,
      tickets_sold: event.ticket_count,
      total_revenue: event.total_revenue,
      average_ticket_price: event.average_price,
      capacity_utilization: (event.ticket_count / event._id.capacity) * 100
    }));
    
    p_res.json(v_results);
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_getDashboardAnalytics = async (p_req, p_res) => {
  try {
    const v_currentDate = new Date();
    const v_thirtyDaysAgo = new Date(v_currentDate.getTime() - (30 * 24 * 60 * 60 * 1000));
    
    const v_totalEvents = await Event.countDocuments();
    const v_activeEvents = await Event.countDocuments({ 
      status: { $in: ['scheduled', 'active'] },
      start_date: { $gte: v_currentDate }
    });
    
    const v_totalTickets = await EventTicket.countDocuments();
    const v_recentTickets = await EventTicket.countDocuments({
      purchase_date: { $gte: v_thirtyDaysAgo }
    });
    
    const v_totalPromotions = await Promotion.countDocuments();
    const v_activePromotions = await Promotion.countDocuments({
      status: 'active',
      start_date: { $lte: v_currentDate },
      end_date: { $gte: v_currentDate }
    });
    
    const v_revenueData = await EventTicket.aggregate([
      {
        $match: {
          purchase_date: { $gte: v_thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: null,
          total_revenue: { $sum: '$price_paid' },
          ticket_count: { $sum: 1 }
        }
      }
    ]);
    
    const v_revenue = v_revenueData.length > 0 ? v_revenueData[0] : { total_revenue: 0, ticket_count: 0 };
    
    p_res.json({
      events: {
        total: v_totalEvents,
        active: v_activeEvents
      },
      tickets: {
        total: v_totalTickets,
        last_30_days: v_recentTickets
      },
      promotions: {
        total: v_totalPromotions,
        active: v_activePromotions
      },
      revenue: {
        last_30_days: v_revenue.total_revenue,
        tickets_sold_last_30_days: v_revenue.ticket_count
      }
    });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

module.exports = {
  f_getEventAttendance,
  f_getPromotionPerformance,
  f_getRevenueAnalytics,
  f_getPopularEvents,
  f_getDashboardAnalytics
};
