const MovieSession = require('../models/MovieSession');

const f_getAllMovieSessions = async (p_req, p_res) => {
  try {
    const v_page = parseInt(p_req.query.page) || 1;
    const v_limit = parseInt(p_req.query.limit) || 10;
    const v_skip = (v_page - 1) * v_limit;

    const v_sessions = await MovieSession.find()
      .populate('movie_id', 'title year genres')
      .populate('theater_id', 'location theaterId')
      .skip(v_skip)
      .limit(v_limit)
      .sort({ showtime: 1 });

    const v_total = await MovieSession.countDocuments();

    p_res.json({
      sessions: v_sessions,
      currentPage: v_page,
      totalPages: Math.ceil(v_total / v_limit),
      totalSessions: v_total
    });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_getMovieSessionById = async (p_req, p_res) => {
  try {
    const v_session = await MovieSession.findById(p_req.params.id)
      .populate('movie_id', 'title year genres plot')
      .populate('theater_id', 'location theaterId');
    
    if (!v_session) {
      return p_res.status(404).json({ message: 'Movie session not found' });
    }
    p_res.json(v_session);
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_createMovieSession = async (p_req, p_res) => {
  try {
    const { total_seats = 100 } = p_req.body;
    
    const v_seatMap = [];
    const v_rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    const v_seatsPerRow = Math.ceil(total_seats / v_rows.length);
    
    for (let i = 0; i < v_rows.length; i++) {
      for (let j = 1; j <= v_seatsPerRow && v_seatMap.length < total_seats; j++) {
        v_seatMap.push({
          row: v_rows[i],
          number: j,
          is_available: true,
          seat_type: i < 2 ? 'vip' : i < 4 ? 'premium' : 'standard'
        });
      }
    }

    const v_sessionData = {
      ...p_req.body,
      available_seats: total_seats,
      seat_map: v_seatMap
    };

    const v_session = new MovieSession(v_sessionData);
    const v_savedSession = await v_session.save();
    p_res.status(201).json(v_savedSession);
  } catch (p_error) {
    p_res.status(400).json({ message: p_error.message });
  }
};

const f_getAvailableSeats = async (p_req, p_res) => {
  try {
    const v_session = await MovieSession.findById(p_req.params.id);
    if (!v_session) {
      return p_res.status(404).json({ message: 'Movie session not found' });
    }

    const v_availableSeats = v_session.seat_map.filter(seat => seat.is_available);
    p_res.json({
      session_id: p_req.params.id,
      available_seats: v_availableSeats,
      total_available: v_session.available_seats
    });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

module.exports = {
  f_getAllMovieSessions,
  f_getMovieSessionById,
  f_createMovieSession,
  f_getAvailableSeats
};
