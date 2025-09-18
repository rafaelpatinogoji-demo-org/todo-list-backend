const Review = require('../models/Review');

const f_getAllReviews = async (p_req, p_res) => {
  try {
    const v_page = parseInt(p_req.query.page) || 1;
    const v_limit = parseInt(p_req.query.limit) || 10;
    const v_skip = (v_page - 1) * v_limit;

    const v_reviews = await Review.find()
      .populate('user_id', 'name email')
      .populate('movie_id', 'title year')
      .skip(v_skip)
      .limit(v_limit)
      .sort({ created_at: -1 });

    const v_total = await Review.countDocuments();

    p_res.json({
      reviews: v_reviews,
      currentPage: v_page,
      totalPages: Math.ceil(v_total / v_limit),
      totalReviews: v_total
    });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_getReviewById = async (p_req, p_res) => {
  try {
    const v_review = await Review.findById(p_req.params.id)
      .populate('user_id', 'name email')
      .populate('movie_id', 'title year');
    if (!v_review) {
      return p_res.status(404).json({ message: 'Review not found' });
    }
    p_res.json(v_review);
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_createReview = async (p_req, p_res) => {
  try {
    const v_existingReview = await Review.findOne({
      user_id: p_req.body.user_id,
      movie_id: p_req.body.movie_id
    });

    if (v_existingReview) {
      return p_res.status(400).json({ 
        message: 'User already has a review for this movie' 
      });
    }

    const v_review = new Review(p_req.body);
    const v_savedReview = await v_review.save();
    const v_populatedReview = await Review.findById(v_savedReview._id)
      .populate('user_id', 'name email')
      .populate('movie_id', 'title year');
    p_res.status(201).json(v_populatedReview);
  } catch (p_error) {
    if (p_error.code === 11000) {
      return p_res.status(400).json({ 
        message: 'User already has a review for this movie' 
      });
    }
    p_res.status(400).json({ message: p_error.message });
  }
};

const f_updateReview = async (p_req, p_res) => {
  try {
    const v_review = await Review.findByIdAndUpdate(
      p_req.params.id,
      { ...p_req.body, updated_at: Date.now() },
      { new: true, runValidators: true }
    ).populate('user_id', 'name email')
     .populate('movie_id', 'title year');
    
    if (!v_review) {
      return p_res.status(404).json({ message: 'Review not found' });
    }
    p_res.json(v_review);
  } catch (p_error) {
    p_res.status(400).json({ message: p_error.message });
  }
};

const f_deleteReview = async (p_req, p_res) => {
  try {
    const v_review = await Review.findByIdAndDelete(p_req.params.id);
    if (!v_review) {
      return p_res.status(404).json({ message: 'Review not found' });
    }
    p_res.json({ message: 'Review deleted successfully' });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_getReviewsByMovie = async (p_req, p_res) => {
  try {
    const v_page = parseInt(p_req.query.page) || 1;
    const v_limit = parseInt(p_req.query.limit) || 10;
    const v_skip = (v_page - 1) * v_limit;

    const v_reviews = await Review.find({ movie_id: p_req.params.movieId })
      .populate('user_id', 'name email')
      .populate('movie_id', 'title year')
      .skip(v_skip)
      .limit(v_limit)
      .sort({ created_at: -1 });

    const v_total = await Review.countDocuments({ movie_id: p_req.params.movieId });

    p_res.json({
      reviews: v_reviews,
      currentPage: v_page,
      totalPages: Math.ceil(v_total / v_limit),
      totalReviews: v_total
    });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_getReviewsByUser = async (p_req, p_res) => {
  try {
    const v_page = parseInt(p_req.query.page) || 1;
    const v_limit = parseInt(p_req.query.limit) || 10;
    const v_skip = (v_page - 1) * v_limit;

    const v_reviews = await Review.find({ user_id: p_req.params.userId })
      .populate('user_id', 'name email')
      .populate('movie_id', 'title year')
      .skip(v_skip)
      .limit(v_limit)
      .sort({ created_at: -1 });

    const v_total = await Review.countDocuments({ user_id: p_req.params.userId });

    p_res.json({
      reviews: v_reviews,
      currentPage: v_page,
      totalPages: Math.ceil(v_total / v_limit),
      totalReviews: v_total
    });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_searchReviews = async (p_req, p_res) => {
  try {
    const { title, text, rating, moderation_status } = p_req.query;
    const v_filter = {};

    if (title) {
      v_filter.title = { $regex: title, $options: 'i' };
    }
    if (text) {
      v_filter.text = { $regex: text, $options: 'i' };
    }
    if (rating) {
      v_filter.rating = parseInt(rating);
    }
    if (moderation_status) {
      v_filter.moderation_status = moderation_status;
    }

    const v_reviews = await Review.find(v_filter)
      .populate('user_id', 'name email')
      .populate('movie_id', 'title year')
      .sort({ created_at: -1 });

    p_res.json(v_reviews);
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_getMovieRatingStats = async (p_req, p_res) => {
  try {
    const mongoose = require('mongoose');
    const v_stats = await Review.aggregate([
      {
        $match: { 
          movie_id: new mongoose.Types.ObjectId(p_req.params.movieId),
          moderation_status: 'approved'
        }
      },
      {
        $group: {
          _id: '$movie_id',
          averageRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 },
          ratingDistribution: {
            $push: '$rating'
          }
        }
      },
      {
        $addFields: {
          ratingCounts: {
            '1': {
              $size: {
                $filter: {
                  input: '$ratingDistribution',
                  cond: { $eq: ['$$this', 1] }
                }
              }
            },
            '2': {
              $size: {
                $filter: {
                  input: '$ratingDistribution',
                  cond: { $eq: ['$$this', 2] }
                }
              }
            },
            '3': {
              $size: {
                $filter: {
                  input: '$ratingDistribution',
                  cond: { $eq: ['$$this', 3] }
                }
              }
            },
            '4': {
              $size: {
                $filter: {
                  input: '$ratingDistribution',
                  cond: { $eq: ['$$this', 4] }
                }
              }
            },
            '5': {
              $size: {
                $filter: {
                  input: '$ratingDistribution',
                  cond: { $eq: ['$$this', 5] }
                }
              }
            }
          }
        }
      },
      {
        $project: {
          ratingDistribution: 0
        }
      }
    ]);

    if (v_stats.length === 0) {
      return p_res.json({
        movieId: p_req.params.movieId,
        averageRating: 0,
        totalReviews: 0,
        ratingCounts: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 }
      });
    }

    p_res.json({
      movieId: p_req.params.movieId,
      averageRating: Math.round(v_stats[0].averageRating * 10) / 10,
      totalReviews: v_stats[0].totalReviews,
      ratingCounts: v_stats[0].ratingCounts
    });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_moderateReview = async (p_req, p_res) => {
  try {
    const { moderation_status } = p_req.body;
    
    if (!['pending', 'approved', 'rejected'].includes(moderation_status)) {
      return p_res.status(400).json({ 
        message: 'Invalid moderation status. Must be: pending, approved, or rejected' 
      });
    }

    const v_review = await Review.findByIdAndUpdate(
      p_req.params.id,
      { moderation_status, updated_at: Date.now() },
      { new: true, runValidators: true }
    ).populate('user_id', 'name email')
     .populate('movie_id', 'title year');
    
    if (!v_review) {
      return p_res.status(404).json({ message: 'Review not found' });
    }
    
    p_res.json(v_review);
  } catch (p_error) {
    p_res.status(400).json({ message: p_error.message });
  }
};

const f_voteOnReview = async (p_req, p_res) => {
  try {
    const { vote_type } = p_req.body;
    
    if (!['upvote', 'downvote'].includes(vote_type)) {
      return p_res.status(400).json({ 
        message: 'Invalid vote type. Must be: upvote or downvote' 
      });
    }

    const v_updateField = vote_type === 'upvote' 
      ? { $inc: { 'helpfulness_votes.upvotes': 1 } }
      : { $inc: { 'helpfulness_votes.downvotes': 1 } };

    const v_review = await Review.findByIdAndUpdate(
      p_req.params.id,
      { ...v_updateField, updated_at: Date.now() },
      { new: true, runValidators: true }
    ).populate('user_id', 'name email')
     .populate('movie_id', 'title year');
    
    if (!v_review) {
      return p_res.status(404).json({ message: 'Review not found' });
    }
    
    p_res.json(v_review);
  } catch (p_error) {
    p_res.status(400).json({ message: p_error.message });
  }
};

module.exports = {
  f_getAllReviews,
  f_getReviewById,
  f_createReview,
  f_updateReview,
  f_deleteReview,
  f_getReviewsByMovie,
  f_getReviewsByUser,
  f_searchReviews,
  f_getMovieRatingStats,
  f_moderateReview,
  f_voteOnReview
};
