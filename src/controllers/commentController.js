const Comment = require('../models/Comment');
const notificationService = require('../services/notificationService');

const f_getAllComments = async (p_req, p_res) => {
  try {
    const v_page = parseInt(p_req.query.page) || 1;
    const v_limit = parseInt(p_req.query.limit) || 10;
    const v_skip = (v_page - 1) * v_limit;

    const v_comments = await Comment.find()
      .populate('movie_id', 'title year')
      .skip(v_skip)
      .limit(v_limit)
      .sort({ date: -1 });

    const v_total = await Comment.countDocuments();

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

const f_getCommentById = async (p_req, p_res) => {
  try {
    const v_comment = await Comment.findById(p_req.params.id)
      .populate('movie_id', 'title year');
    if (!v_comment) {
      return p_res.status(404).json({ message: 'Comment not found' });
    }
    p_res.json(v_comment);
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_createComment = async (p_req, p_res) => {
  try {
    const v_comment = new Comment(p_req.body);
    const v_savedComment = await v_comment.save();
    const v_populatedComment = await Comment.findById(v_savedComment._id)
      .populate('movie_id', 'title year');
    
    try {
      await notificationService.createNotification({
        user_id: v_savedComment.movie_id,
        type: 'comment',
        title: 'New Comment Added',
        message: `${v_savedComment.name} commented: "${v_savedComment.text.substring(0, 100)}${v_savedComment.text.length > 100 ? '...' : ''}"`,
        data: {
          comment_id: v_savedComment._id,
          movie_id: v_savedComment.movie_id,
          commenter_name: v_savedComment.name
        },
        priority: 'medium'
      });
    } catch (notificationError) {
      console.error('Failed to create notification for new comment:', notificationError);
    }
    
    p_res.status(201).json(v_populatedComment);
  } catch (p_error) {
    p_res.status(400).json({ message: p_error.message });
  }
};

const f_updateComment = async (p_req, p_res) => {
  try {
    const v_comment = await Comment.findByIdAndUpdate(
      p_req.params.id,
      p_req.body,
      { new: true, runValidators: true }
    ).populate('movie_id', 'title year');
    
    if (!v_comment) {
      return p_res.status(404).json({ message: 'Comment not found' });
    }
    p_res.json(v_comment);
  } catch (p_error) {
    p_res.status(400).json({ message: p_error.message });
  }
};

const f_deleteComment = async (p_req, p_res) => {
  try {
    const v_comment = await Comment.findByIdAndDelete(p_req.params.id);
    if (!v_comment) {
      return p_res.status(404).json({ message: 'Comment not found' });
    }
    p_res.json({ message: 'Comment deleted successfully' });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_getCommentsByMovie = async (p_req, p_res) => {
  try {
    const v_comments = await Comment.find({ movie_id: p_req.params.movieId })
      .populate('movie_id', 'title year')
      .sort({ date: -1 });
    p_res.json(v_comments);
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

module.exports = {
  f_getAllComments,
  f_getCommentById,
  f_createComment,
  f_updateComment,
  f_deleteComment,
  f_getCommentsByMovie
};
