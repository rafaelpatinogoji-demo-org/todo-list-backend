const Session = require('../models/Session');
const User = require('../models/User');

const f_getAllSessionsAdmin = async (p_req, p_res) => {
  try {
    const v_page = parseInt(p_req.query.page) || 1;
    const v_limit = parseInt(p_req.query.limit) || 20;
    const v_skip = (v_page - 1) * v_limit;
    const { userId, search } = p_req.query;

    const v_filter = {};
    if (userId) v_filter.user_id = userId;

    const v_sessions = await Session.find(v_filter)
      .skip(v_skip)
      .limit(v_limit)
      .sort({ _id: -1 });

    const v_sessionsWithUsers = await Promise.all(
      v_sessions.map(async (session) => {
        const v_user = await User.findById(session.user_id).select('name email role');
        return {
          ...session.toObject(),
          user: v_user
        };
      })
    );

    const v_total = await Session.countDocuments(v_filter);

    p_res.json({
      sessions: v_sessionsWithUsers,
      currentPage: v_page,
      totalPages: Math.ceil(v_total / v_limit),
      totalSessions: v_total
    });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_bulkSessionOperations = async (p_req, p_res) => {
  try {
    const { sessionIds, operation } = p_req.body;

    let v_result;
    switch (operation) {
      case 'delete':
        v_result = await Session.deleteMany({ _id: { $in: sessionIds } });
        break;
      case 'deleteByUser':
        v_result = await Session.deleteMany({ user_id: { $in: sessionIds } });
        break;
      default:
        return p_res.status(400).json({ message: 'Operación no válida' });
    }

    p_res.json({
      message: `Operación ${operation} completada`,
      deletedCount: v_result.deletedCount
    });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_getSessionStats = async (p_req, p_res) => {
  try {
    const v_totalSessions = await Session.countDocuments();

    const v_sessionsByUser = await Session.aggregate([
      {
        $group: {
          _id: "$user_id",
          sessionCount: { $sum: 1 }
        }
      },
      { $sort: { sessionCount: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' }
    ]);

    p_res.json({
      totalSessions: v_totalSessions,
      sessionsByUser: v_sessionsByUser
    });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_exportSessions = async (p_req, p_res) => {
  try {
    const v_sessions = await Session.find();
    
    p_res.setHeader('Content-Type', 'application/json');
    p_res.setHeader('Content-Disposition', 'attachment; filename=sessions_export.json');
    p_res.json(v_sessions);
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

module.exports = {
  f_getAllSessionsAdmin,
  f_bulkSessionOperations,
  f_getSessionStats,
  f_exportSessions
};
