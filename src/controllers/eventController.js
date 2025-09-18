const Event = require('../models/Event');

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
    const v_eventData = { ...p_req.body };
    v_eventData.available_seats = v_eventData.capacity;
    v_eventData.updated_date = new Date();

    const v_event = new Event(v_eventData);
    const v_savedEvent = await v_event.save();
    const v_populatedEvent = await Event.findById(v_savedEvent._id)
      .populate('movie_id', 'title year genres')
      .populate('theater_id', 'theaterId location')
      .populate('created_by', 'name email');
    
    p_res.status(201).json(v_populatedEvent);
  } catch (p_error) {
    p_res.status(400).json({ message: p_error.message });
  }
};

const f_updateEvent = async (p_req, p_res) => {
  try {
    const v_updateData = { ...p_req.body };
    v_updateData.updated_date = new Date();

    const v_event = await Event.findByIdAndUpdate(
      p_req.params.id,
      v_updateData,
      { new: true, runValidators: true }
    )
      .populate('movie_id', 'title year genres')
      .populate('theater_id', 'theaterId location')
      .populate('created_by', 'name email');
    
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
    p_res.json({ message: 'Event deleted successfully' });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_searchEvents = async (p_req, p_res) => {
  try {
    const { title, event_type, start_date, end_date, theater_id, movie_id } = p_req.query;
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
    if (start_date || end_date) {
      v_filter.start_date = {};
      if (start_date) {
        v_filter.start_date.$gte = new Date(start_date);
      }
      if (end_date) {
        v_filter.start_date.$lte = new Date(end_date);
      }
    }

    const v_events = await Event.find(v_filter)
      .populate('movie_id', 'title year genres')
      .populate('theater_id', 'theaterId location')
      .populate('created_by', 'name email')
      .sort({ start_date: 1 });
    
    p_res.json(v_events);
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_getEventsByMovie = async (p_req, p_res) => {
  try {
    const v_events = await Event.find({ movie_id: p_req.params.movieId })
      .populate('movie_id', 'title year genres')
      .populate('theater_id', 'theaterId location')
      .populate('created_by', 'name email')
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
      .populate('theater_id', 'theaterId location')
      .populate('created_by', 'name email')
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
      .populate('created_by', 'name email')
      .sort({ start_date: 1 })
      .limit(20);
    
    p_res.json(v_events);
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

module.exports = {
  f_getAllEvents,
  f_getEventById,
  f_createEvent,
  f_updateEvent,
  f_deleteEvent,
  f_searchEvents,
  f_getEventsByMovie,
  f_getEventsByTheater,
  f_getUpcomingEvents
};
