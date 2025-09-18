const Comment = require('../models/Comment');

const f_getAllCommentsAdmin = async (p_req, p_res) => {
  try {
    const v_page = parseInt(p_req.query.page) || 1;
    const v_limit = parseInt(p_req.query.limit) || 20;
    const v_skip = (v_page - 1) * v_limit;
    const { movieId, email, search, startDate, endDate } = p_req.query;

    const v_filter = {};
    if (movieId) v_filter.movie_id = movieId;
    if (email) v_filter.email = { $regex: email, $options: 'i' };
    if (search) {
      v_filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { text: { $regex: search, $options: 'i' } }
      ];
    }
    if (startDate || endDate) {
      v_filter.date = {};
      if (startDate) v_filter.date.$gte = new Date(startDate);
      if (endDate) v_filter.date.$lte = new Date(endDate);
    }

    const v_comments = await Comment.find(v_filter)
      .populate('movie_id', 'title year')
      .skip(v_skip)
      .limit(v_limit)
      .sort({ date: -1 });

    const v_total = await Comment.countDocuments(v_filter);

    p_res.json({
      comments: v_comments,
      currentPage: v_page,
      totalPages: Math.ceil(v_total / v_limit),
      totalComments: v_total
    });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_bulkCommentOperations = async (p_req, p_res) => {
  try {
    const { commentIds, operation } = p_req.body;

    let v_result;
    switch (operation) {
      case 'delete':
        v_result = await Comment.deleteMany({ _id: { $in: commentIds } });
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

const f_getCommentStats = async (p_req, p_res) => {
  try {
    const v_thirtyDaysAgo = new Date();
    v_thirtyDaysAgo.setDate(v_thirtyDaysAgo.getDate() - 30);

    const v_commentsByDay = await Comment.aggregate([
      { $match: { date: { $gte: v_thirtyDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const v_topCommenters = await Comment.aggregate([
      {
        $group: {
          _id: "$email",
          name: { $first: "$name" },
          commentCount: { $sum: 1 }
        }
      },
      { $sort: { commentCount: -1 } },
      { $limit: 10 }
    ]);

    p_res.json({
      commentsByDay: v_commentsByDay,
      topCommenters: v_topCommenters
    });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_exportComments = async (p_req, p_res) => {
  try {
    const v_comments = await Comment.find()
      .populate('movie_id', 'title year');
    
    p_res.setHeader('Content-Type', 'application/json');
    p_res.setHeader('Content-Disposition', 'attachment; filename=comments_export.json');
    p_res.json(v_comments);
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

module.exports = {
  f_getAllCommentsAdmin,
  f_bulkCommentOperations,
  f_getCommentStats,
  f_exportComments
};
