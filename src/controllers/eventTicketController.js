const EventTicket = require('../models/EventTicket');
const Event = require('../models/Event');
const Promotion = require('../models/Promotion');

const f_purchaseTicket = async (p_req, p_res) => {
  try {
    const { event_id, user_id, pricing_tier, promotion_id } = p_req.body;
    
    const v_event = await Event.findById(event_id);
    if (!v_event) {
      return p_res.status(404).json({ message: 'Event not found' });
    }
    
    if (v_event.available_seats <= 0) {
      return p_res.status(400).json({ message: 'Event is sold out' });
    }
    
    const v_pricingTier = v_event.pricing_tiers.find(tier => tier.tier_name === pricing_tier);
    if (!v_pricingTier) {
      return p_res.status(400).json({ message: 'Invalid pricing tier' });
    }
    
    if (v_pricingTier.seats_available <= 0) {
      return p_res.status(400).json({ message: 'No seats available for this pricing tier' });
    }
    
    let v_finalPrice = v_pricingTier.price;
    let v_appliedPromotion = null;
    
    if (promotion_id) {
      const v_promotion = await Promotion.findById(promotion_id);
      if (v_promotion && v_promotion.status === 'active') {
        const v_currentDate = new Date();
        if (v_currentDate >= v_promotion.start_date && v_currentDate <= v_promotion.end_date) {
          switch (v_promotion.discount_type) {
            case 'percentage':
              v_finalPrice = v_pricingTier.price * (1 - v_promotion.discount_value / 100);
              break;
            case 'fixed_amount':
              v_finalPrice = Math.max(0, v_pricingTier.price - v_promotion.discount_value);
              break;
            case 'buy_one_get_one':
              v_finalPrice = v_pricingTier.price * 0.5;
              break;
          }
          v_appliedPromotion = promotion_id;
          
          await Promotion.findByIdAndUpdate(promotion_id, {
            $inc: { usage_count: 1 }
          });
        }
      }
    }
    
    const v_ticketNumber = `TKT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    
    const v_ticket = new EventTicket({
      event_id,
      user_id,
      ticket_number: v_ticketNumber,
      pricing_tier,
      price_paid: v_finalPrice,
      promotion_applied: v_appliedPromotion
    });
    
    const v_savedTicket = await v_ticket.save();
    
    await Event.findByIdAndUpdate(event_id, {
      $inc: { available_seats: -1 }
    });
    
    const v_tierIndex = v_event.pricing_tiers.findIndex(tier => tier.tier_name === pricing_tier);
    v_event.pricing_tiers[v_tierIndex].seats_available -= 1;
    await v_event.save();
    
    const v_populatedTicket = await EventTicket.findById(v_savedTicket._id)
      .populate('event_id', 'title start_date event_type')
      .populate('user_id', 'name email')
      .populate('promotion_applied', 'campaign_name discount_type discount_value');
    
    p_res.status(201).json(v_populatedTicket);
  } catch (p_error) {
    p_res.status(400).json({ message: p_error.message });
  }
};

const f_getUserTickets = async (p_req, p_res) => {
  try {
    const v_tickets = await EventTicket.find({ user_id: p_req.params.userId })
      .populate('event_id', 'title start_date event_type movie_id theater_id')
      .populate('promotion_applied', 'campaign_name discount_type discount_value')
      .sort({ purchase_date: -1 });
    
    p_res.json(v_tickets);
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_getEventTickets = async (p_req, p_res) => {
  try {
    const v_tickets = await EventTicket.find({ event_id: p_req.params.eventId })
      .populate('user_id', 'name email')
      .populate('promotion_applied', 'campaign_name discount_type discount_value')
      .sort({ purchase_date: -1 });
    
    p_res.json(v_tickets);
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_cancelTicket = async (p_req, p_res) => {
  try {
    const v_ticket = await EventTicket.findById(p_req.params.id);
    if (!v_ticket) {
      return p_res.status(404).json({ message: 'Ticket not found' });
    }
    
    if (v_ticket.status === 'cancelled') {
      return p_res.status(400).json({ message: 'Ticket is already cancelled' });
    }
    
    if (v_ticket.status === 'used') {
      return p_res.status(400).json({ message: 'Cannot cancel used ticket' });
    }
    
    v_ticket.status = 'cancelled';
    await v_ticket.save();
    
    await Event.findByIdAndUpdate(v_ticket.event_id, {
      $inc: { available_seats: 1 }
    });
    
    const v_event = await Event.findById(v_ticket.event_id);
    const v_tierIndex = v_event.pricing_tiers.findIndex(tier => tier.tier_name === v_ticket.pricing_tier);
    if (v_tierIndex !== -1) {
      v_event.pricing_tiers[v_tierIndex].seats_available += 1;
      await v_event.save();
    }
    
    const v_populatedTicket = await EventTicket.findById(v_ticket._id)
      .populate('event_id', 'title start_date event_type')
      .populate('user_id', 'name email')
      .populate('promotion_applied', 'campaign_name discount_type discount_value');
    
    p_res.json({
      message: 'Ticket cancelled successfully',
      ticket: v_populatedTicket,
      refund_amount: v_ticket.price_paid
    });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_validateTicket = async (p_req, p_res) => {
  try {
    const { ticket_number } = p_req.params;
    
    const v_ticket = await EventTicket.findOne({ ticket_number })
      .populate('event_id', 'title start_date end_date event_type status')
      .populate('user_id', 'name email');
    
    if (!v_ticket) {
      return p_res.status(404).json({ message: 'Ticket not found' });
    }
    
    if (v_ticket.status === 'cancelled') {
      return p_res.status(400).json({ message: 'Ticket has been cancelled' });
    }
    
    if (v_ticket.status === 'used') {
      return p_res.status(400).json({ message: 'Ticket has already been used' });
    }
    
    const v_currentDate = new Date();
    const v_eventStartDate = new Date(v_ticket.event_id.start_date);
    const v_eventEndDate = new Date(v_ticket.event_id.end_date);
    
    if (v_currentDate < v_eventStartDate) {
      return p_res.status(400).json({ message: 'Event has not started yet' });
    }
    
    if (v_currentDate > v_eventEndDate) {
      return p_res.status(400).json({ message: 'Event has already ended' });
    }
    
    v_ticket.status = 'used';
    await v_ticket.save();
    
    p_res.json({
      message: 'Ticket validated successfully',
      ticket: v_ticket,
      entry_granted: true
    });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_getAllTickets = async (p_req, p_res) => {
  try {
    const v_page = parseInt(p_req.query.page) || 1;
    const v_limit = parseInt(p_req.query.limit) || 10;
    const v_skip = (v_page - 1) * v_limit;

    const v_tickets = await EventTicket.find()
      .populate('event_id', 'title start_date event_type')
      .populate('user_id', 'name email')
      .populate('promotion_applied', 'campaign_name discount_type discount_value')
      .skip(v_skip)
      .limit(v_limit)
      .sort({ purchase_date: -1 });

    const v_total = await EventTicket.countDocuments();

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

module.exports = {
  f_purchaseTicket,
  f_getUserTickets,
  f_getEventTickets,
  f_cancelTicket,
  f_validateTicket,
  f_getAllTickets
};
