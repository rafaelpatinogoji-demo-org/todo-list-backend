const Session = require('../models/Session');

const f_getAllSessions = async (p_req, p_res) => {
  try {
    const v_page = parseInt(p_req.query.page) || 1;
    const v_limit = parseInt(p_req.query.limit) || 10;
    const v_skip = (v_page - 1) * v_limit;

    const v_sessions = await Session.find()
      .skip(v_skip)
      .limit(v_limit);

    const v_total = await Session.countDocuments();

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

const f_getSessionById = async (p_req, p_res) => {
  try {
    const v_session = await Session.findById(p_req.params.id);
    if (!v_session) {
      return p_res.status(404).json({ message: 'Session not found' });
    }
    p_res.json(v_session);
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_createSession = async (p_req, p_res) => {
  try {
    const v_session = new Session(p_req.body);
    const v_savedSession = await v_session.save();
    p_res.status(201).json(v_savedSession);
  } catch (p_error) {
    p_res.status(400).json({ message: p_error.message });
  }
};

const f_updateSession = async (p_req, p_res) => {
  try {
    const v_session = await Session.findByIdAndUpdate(
      p_req.params.id,
      p_req.body,
      { new: true, runValidators: true }
    );
    if (!v_session) {
      return p_res.status(404).json({ message: 'Session not found' });
    }
    p_res.json(v_session);
  } catch (p_error) {
    p_res.status(400).json({ message: p_error.message });
  }
};

const f_deleteSession = async (p_req, p_res) => {
  try {
    const v_session = await Session.findByIdAndDelete(p_req.params.id);
    if (!v_session) {
      return p_res.status(404).json({ message: 'Session not found' });
    }
    p_res.json({ message: 'Session deleted successfully' });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

module.exports = {
  f_getAllSessions,
  f_getSessionById,
  f_createSession,
  f_updateSession,
  f_deleteSession
};
