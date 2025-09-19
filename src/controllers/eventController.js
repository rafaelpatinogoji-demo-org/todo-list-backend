const Event = require('../models/Event');
const EventAnalytics = require('../models/EventAnalytics');

const f_getAllEvents = async (p_req, p_res) => {
  try {
    const v_page = parseInt(p_req.query.page) || 1;
    const v_limit = parseInt(p_req.query.limit) || 10;
    const v_skip = (v_page - 1) * v_limit;

    const v_events = await Event.find()
      .populate('movie_id', 'title year genres')
      .populate('theater_id', 'theaterId location')
      .populate('created_by', 'name email')
      .skip(v_skip)
      .limit(v_limit)
      .sort({ start_date: 1 });

    const v_total = await Event.countDocuments();

    p_res.json({
      events: v_events,
      currentPage: v_page,
      totalPages: Math.ceil(v_total / v_limit),
      totalEvents: v_total
    });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_getEventById = async (p_req, p_res) => {
  try {
    const v_event = await Event.findById(p_req.params.id)
      .populate('movie_id', 'title year genres plot')
      .populate('theater_id', 'theaterId location')
      .populate('created_by', 'name email');
    
    if (!v_event) {
      return p_res.status(404).json({ message: 'Event not found' });
    }
    p_res.json(v_event);
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_createEvent = async (p_req, p_res) => {
  try {
    const v_eventData = {
      ...p_req.body,
      available_tickets: p_req.body.capacity
    };
    
    const v_event = new Event(v_eventData);
    const v_savedEvent = await v_event.save();
    
    const v_analytics = new EventAnalytics({
      event_id: v_savedEvent._id
    });
    await v_analytics.save();
    
    p_res.status(201).json(v_savedEvent);
  } catch (p_error) {
    p_res.status(400).json({ message: p_error.message });
  }
};

const f_updateEvent = async (p_req, p_res) => {
  try {
    const v_event = await Event.findByIdAndUpdate(
      p_req.params.id,
      p_req.body,
      { new: true, runValidators: true }
    );
    if (!v_event) {
      return p_res.status(404).json({ message: 'Event not found' });
    }
    p_res.json(v_event);
  } catch (p_error) {
    p_res.status(400).json({ message: p_error.message });
  }
};

const f_deleteEvent = async (p_req, p_res) => {
  try {
    const v_event = await Event.findByIdAndDelete(p_req.params.id);
    if (!v_event) {
      return p_res.status(404).json({ message: 'Event not found' });
    }
    
    await EventAnalytics.findOneAndDelete({ event_id: p_req.params.id });
    
    p_res.json({ message: 'Event deleted successfully' });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_searchEvents = async (p_req, p_res) => {
  try {
    const { title, event_type, theater_id, movie_id, status, start_date, end_date } = p_req.query;
    const v_filter = {};

    if (title) {
      v_filter.title = { $regex: title, $options: 'i' };
    }
    if (event_type) {
      v_filter.event_type = event_type;
    }
    if (theater_id) {
      v_filter.theater_id = theater_id;
    }
    if (movie_id) {
      v_filter.movie_id = movie_id;
    }
    if (status) {
      v_filter.status = status;
    }
    if (start_date && end_date) {
      v_filter.start_date = {
        $gte: new Date(start_date),
        $lte: new Date(end_date)
      };
    }

    const v_events = await Event.find(v_filter)
      .populate('movie_id', 'title year genres')
      .populate('theater_id', 'theaterId location')
      .sort({ start_date: 1 });
    
    p_res.json(v_events);
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_getEventsByTheater = async (p_req, p_res) => {
  try {
    const v_events = await Event.find({ theater_id: p_req.params.theaterId })
      .populate('movie_id', 'title year genres')
      .sort({ start_date: 1 });
    
    p_res.json(v_events);
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_getEventsByMovie = async (p_req, p_res) => {
  try {
    const v_events = await Event.find({ movie_id: p_req.params.movieId })
      .populate('theater_id', 'theaterId location')
      .sort({ start_date: 1 });
    
    p_res.json(v_events);
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_getUpcomingEvents = async (p_req, p_res) => {
  try {
    const v_currentDate = new Date();
    const v_events = await Event.find({
      start_date: { $gte: v_currentDate },
      status: { $in: ['scheduled', 'active'] }
    })
      .populate('movie_id', 'title year genres')
      .populate('theater_id', 'theaterId location')
      .sort({ start_date: 1 })
      .limit(20);
    
    p_res.json(v_events);
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_cancelEvent = async (p_req, p_res) => {
  try {
    const v_event = await Event.findByIdAndUpdate(
      p_req.params.id,
      { status: 'cancelled' },
      { new: true }
    );
    
    if (!v_event) {
      return p_res.status(404).json({ message: 'Event not found' });
    }
    
    p_res.json({ message: 'Event cancelled successfully', event: v_event });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_rescheduleEvent = async (p_req, p_res) => {
  try {
    const { start_date, end_date } = p_req.body;
    
    if (!start_date || !end_date) {
      return p_res.status(400).json({ message: 'Start date and end date are required' });
    }
    
    const v_event = await Event.findByIdAndUpdate(
      p_req.params.id,
      { start_date: new Date(start_date), end_date: new Date(end_date) },
      { new: true, runValidators: true }
    );
    
    if (!v_event) {
      return p_res.status(404).json({ message: 'Event not found' });
    }
    
    p_res.json({ message: 'Event rescheduled successfully', event: v_event });
  } catch (p_error) {
    p_res.status(400).json({ message: p_error.message });
  }
};

module.exports = {
  f_getAllEvents,
  f_getEventById,
  f_createEvent,
  f_updateEvent,
  f_deleteEvent,
  f_searchEvents,
  f_getEventsByTheater,
  f_getEventsByMovie,
  f_getUpcomingEvents,
  f_cancelEvent,
  f_rescheduleEvent
};
