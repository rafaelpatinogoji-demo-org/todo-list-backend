const Ticket = require('../models/Ticket');
const Event = require('../models/Event');
const Promotion = require('../models/Promotion');
const EventAnalytics = require('../models/EventAnalytics');

const f_getAllTickets = async (p_req, p_res) => {
  try {
    const v_page = parseInt(p_req.query.page) || 1;
    const v_limit = parseInt(p_req.query.limit) || 10;
    const v_skip = (v_page - 1) * v_limit;

    const v_tickets = await Ticket.find()
      .populate('event_id', 'title start_date event_type')
      .populate('user_id', 'name email')
      .populate('promotion_id', 'name code discount_type discount_value')
      .skip(v_skip)
      .limit(v_limit)
      .sort({ purchase_date: -1 });

    const v_total = await Ticket.countDocuments();

    p_res.json({
      tickets: v_tickets,
      currentPage: v_page,
      totalPages: Math.ceil(v_total / v_limit),
      totalTickets: v_total
    });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_getTicketById = async (p_req, p_res) => {
  try {
    const v_ticket = await Ticket.findById(p_req.params.id)
      .populate('event_id', 'title start_date event_type theater_id')
      .populate('user_id', 'name email')
      .populate('promotion_id', 'name code discount_type discount_value');
    
    if (!v_ticket) {
      return p_res.status(404).json({ message: 'Ticket not found' });
    }
    p_res.json(v_ticket);
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_purchaseTickets = async (p_req, p_res) => {
  try {
    const { event_id, user_id, quantity, promotion_code, seat_numbers } = p_req.body;
    
    if (!event_id || !user_id || !quantity) {
      return p_res.status(400).json({ 
        message: 'Event ID, user ID, and quantity are required' 
      });
    }
    
    const v_event = await Event.findById(event_id);
    if (!v_event) {
      return p_res.status(404).json({ message: 'Event not found' });
    }
    
    if (v_event.available_tickets < quantity) {
      return p_res.status(400).json({ 
        message: 'Not enough tickets available' 
      });
    }
    
    let v_unitPrice = parseFloat(v_event.base_price) || 0;
    let v_discountApplied = 0;
    let v_promotionId = null;
    
    if (promotion_code) {
      const v_promotion = await Promotion.findOne({
        code: promotion_code.toUpperCase(),
        status: 'active',
        valid_from: { $lte: new Date() },
        valid_until: { $gte: new Date() }
      });
      
      if (v_promotion && 
          (v_promotion.applicable_events.length === 0 || 
           v_promotion.applicable_events.includes(event_id))) {
        
        if (v_promotion.discount_type === 'percentage') {
          v_discountApplied = (v_unitPrice * parseFloat(v_promotion.discount_value)) / 100;
        } else {
          v_discountApplied = parseFloat(v_promotion.discount_value) || 0;
        }
        
        v_promotionId = v_promotion._id;
        
        await Promotion.findByIdAndUpdate(v_promotion._id, {
          $inc: { used_count: 1 }
        });
      }
    }
    
    const v_finalUnitPrice = Math.max(0, v_unitPrice - v_discountApplied);
    const v_totalPrice = v_finalUnitPrice * parseInt(quantity);
    
    if (isNaN(v_finalUnitPrice) || isNaN(v_totalPrice) || isNaN(v_discountApplied)) {
      return p_res.status(400).json({ 
        message: 'Invalid price calculation',
        debug: {
          basePrice: v_event.base_price,
          unitPrice: v_unitPrice,
          discountApplied: v_discountApplied,
          finalUnitPrice: v_finalUnitPrice,
          quantity: quantity,
          totalPrice: v_totalPrice
        }
      });
    }
    
    const v_ticket = new Ticket({
      event_id,
      user_id,
      promotion_id: v_promotionId,
      quantity: parseInt(quantity),
      unit_price: v_finalUnitPrice,
      total_price: v_totalPrice,
      discount_applied: v_discountApplied,
      seat_numbers: seat_numbers || []
    });
    
    const v_savedTicket = await v_ticket.save();
    
    await Event.findByIdAndUpdate(event_id, {
      $inc: { available_tickets: -quantity }
    });
    
    await EventAnalytics.findOneAndUpdate(
      { event_id },
      { 
        $inc: { 
          total_tickets_sold: quantity,
          total_revenue: v_totalPrice
        },
        last_updated: new Date()
      }
    );
    
    p_res.status(201).json(v_savedTicket);
  } catch (p_error) {
    p_res.status(400).json({ message: p_error.message });
  }
};

const f_cancelTicket = async (p_req, p_res) => {
  try {
    const v_ticket = await Ticket.findById(p_req.params.id);
    
    if (!v_ticket) {
      return p_res.status(404).json({ message: 'Ticket not found' });
    }
    
    if (v_ticket.ticket_status === 'cancelled') {
      return p_res.status(400).json({ message: 'Ticket already cancelled' });
    }
    
    v_ticket.ticket_status = 'cancelled';
    await v_ticket.save();
    
    await Event.findByIdAndUpdate(v_ticket.event_id, {
      $inc: { available_tickets: v_ticket.quantity }
    });
    
    await EventAnalytics.findOneAndUpdate(
      { event_id: v_ticket.event_id },
      { 
        $inc: { 
          total_tickets_sold: -v_ticket.quantity,
          total_revenue: -v_ticket.total_price
        },
        last_updated: new Date()
      }
    );
    
    p_res.json({ message: 'Ticket cancelled successfully', ticket: v_ticket });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_getTicketsByUser = async (p_req, p_res) => {
  try {
    const v_tickets = await Ticket.find({ user_id: p_req.params.userId })
      .populate('event_id', 'title start_date event_type')
      .populate('promotion_id', 'name code')
      .sort({ purchase_date: -1 });
    
    p_res.json(v_tickets);
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_getTicketsByEvent = async (p_req, p_res) => {
  try {
    const v_tickets = await Ticket.find({ event_id: p_req.params.eventId })
      .populate('user_id', 'name email')
      .populate('promotion_id', 'name code')
      .sort({ purchase_date: -1 });
    
    p_res.json(v_tickets);
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_checkAvailability = async (p_req, p_res) => {
  try {
    const v_event = await Event.findById(p_req.params.eventId);
    
    if (!v_event) {
      return p_res.status(404).json({ message: 'Event not found' });
    }
    
    p_res.json({
      event_id: v_event._id,
      title: v_event.title,
      capacity: v_event.capacity,
      available_tickets: v_event.available_tickets,
      sold_tickets: v_event.capacity - v_event.available_tickets,
      availability_percentage: (v_event.available_tickets / v_event.capacity) * 100
    });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

module.exports = {
  f_getAllTickets,
  f_getTicketById,
  f_purchaseTickets,
  f_cancelTicket,
  f_getTicketsByUser,
  f_getTicketsByEvent,
  f_checkAvailability
};
