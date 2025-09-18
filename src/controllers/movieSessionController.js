const MovieSession = require('../models/MovieSession');

const f_getAllMovieSessions = async (p_req, p_res) => {
  try {
    const v_page = parseInt(p_req.query.page) || 1;
    const v_limit = parseInt(p_req.query.limit) || 10;
    const v_skip = (v_page - 1) * v_limit;

    const v_movieSessions = await MovieSession.find()
      .populate('movie_id', 'title year genres')
      .populate('theater_id', 'theaterId location')
      .skip(v_skip)
      .limit(v_limit)
      .sort({ showtime: 1 });

    const v_total = await MovieSession.countDocuments();

    p_res.json({
      movieSessions: v_movieSessions,
      currentPage: v_page,
      totalPages: Math.ceil(v_total / v_limit),
      totalMovieSessions: v_total
    });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_getMovieSessionById = async (p_req, p_res) => {
  try {
    const v_movieSession = await MovieSession.findById(p_req.params.id)
      .populate('movie_id', 'title year genres plot')
      .populate('theater_id', 'theaterId location');
    
    if (!v_movieSession) {
      return p_res.status(404).json({ message: 'Movie session not found' });
    }
    p_res.json(v_movieSession);
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_createMovieSession = async (p_req, p_res) => {
  try {
    // Generar asientos automáticamente si no se proporcionan
    if (!p_req.body.seats) {
      const v_seats = [];
      const v_rows = ['A', 'B', 'C', 'D', 'E', 'F'];
      const v_seatsPerRow = 10;
      
      for (const v_row of v_rows) {
        for (let i = 1; i <= v_seatsPerRow; i++) {
          v_seats.push({
            row: v_row,
            number: i,
            type: i <= 2 || i >= 9 ? 'premium' : 'standard',
            isAvailable: true
          });
        }
      }
      
      p_req.body.seats = v_seats;
      p_req.body.totalSeats = v_seats.length;
      p_req.body.availableSeats = v_seats.length;
    }

    const v_movieSession = new MovieSession(p_req.body);
    const v_savedMovieSession = await v_movieSession.save();
    p_res.status(201).json(v_savedMovieSession);
  } catch (p_error) {
    p_res.status(400).json({ message: p_error.message });
  }
};

const f_updateMovieSession = async (p_req, p_res) => {
  try {
    const v_movieSession = await MovieSession.findByIdAndUpdate(
      p_req.params.id,
      p_req.body,
      { new: true, runValidators: true }
    );
    if (!v_movieSession) {
      return p_res.status(404).json({ message: 'Movie session not found' });
    }
    p_res.json(v_movieSession);
  } catch (p_error) {
    p_res.status(400).json({ message: p_error.message });
  }
};

const f_deleteMovieSession = async (p_req, p_res) => {
  try {
    const v_movieSession = await MovieSession.findByIdAndDelete(p_req.params.id);
    if (!v_movieSession) {
      return p_res.status(404).json({ message: 'Movie session not found' });
    }
    p_res.json({ message: 'Movie session deleted successfully' });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_getAvailableSeats = async (p_req, p_res) => {
  try {
    const v_movieSession = await MovieSession.findById(p_req.params.id);
    if (!v_movieSession) {
      return p_res.status(404).json({ message: 'Movie session not found' });
    }
    
    const v_availableSeats = v_movieSession.seats.filter(seat => seat.isAvailable);
    p_res.json({
      sessionId: p_req.params.id,
      availableSeats: v_availableSeats,
      totalAvailable: v_availableSeats.length
    });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

module.exports = {
  f_getAllMovieSessions,
  f_getMovieSessionById,
  f_createMovieSession,
  f_updateMovieSession,
  f_deleteMovieSession,
  f_getAvailableSeats
};
