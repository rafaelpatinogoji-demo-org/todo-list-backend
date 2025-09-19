const Review = require('../models/Review');
const Movie = require('../models/Movie');
const mongoose = require('mongoose');

const f_getAllReviews = async (p_req, p_res) => {
  try {
    const v_page = parseInt(p_req.query.page) || 1;
    const v_limit = parseInt(p_req.query.limit) || 10;
    const v_skip = (v_page - 1) * v_limit;
    const v_status = p_req.query.status || 'approved';

    const v_filter = { status: v_status };

    const v_reviews = await Review.find(v_filter)
      .populate('user_id', 'name email')
      .populate('movie_id', 'title year')
      .skip(v_skip)
      .limit(v_limit)
      .sort({ date: -1 });

    const v_total = await Review.countDocuments(v_filter);

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
    const v_movie = await Movie.findById(p_req.body.movie_id);
    if (!v_movie) {
      return p_res.status(404).json({ message: 'Movie not found' });
    }

    const v_review = new Review(p_req.body);
    const v_savedReview = await v_review.save();
    const v_populatedReview = await Review.findById(v_savedReview._id)
      .populate('user_id', 'name email')
      .populate('movie_id', 'title year');
    
    await f_updateMovieRating(p_req.body.movie_id);
    
    p_res.status(201).json(v_populatedReview);
  } catch (p_error) {
    if (p_error.code === 11000) {
      return p_res.status(400).json({ message: 'User already has a review for this movie' });
    }
    p_res.status(400).json({ message: p_error.message });
  }
};

const f_updateReview = async (p_req, p_res) => {
  try {
    const v_review = await Review.findByIdAndUpdate(
      p_req.params.id,
      p_req.body,
      { new: true, runValidators: true }
    ).populate('user_id', 'name email')
     .populate('movie_id', 'title year');
    
    if (!v_review) {
      return p_res.status(404).json({ message: 'Review not found' });
    }
    
    if (p_req.body.rating) {
      await f_updateMovieRating(v_review.movie_id._id);
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
    
    await f_updateMovieRating(v_review.movie_id);
    
    p_res.json({ message: 'Review deleted successfully' });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_getReviewsByMovie = async (p_req, p_res) => {
  try {
    const v_status = p_req.query.status || 'approved';
    const v_reviews = await Review.find({ 
      movie_id: p_req.params.movieId,
      status: v_status 
    })
      .populate('user_id', 'name email')
      .populate('movie_id', 'title year')
      .sort({ date: -1 });
    p_res.json(v_reviews);
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_getReviewsByUser = async (p_req, p_res) => {
  try {
    const v_reviews = await Review.find({ user_id: p_req.params.userId })
      .populate('user_id', 'name email')
      .populate('movie_id', 'title year')
      .sort({ date: -1 });
    p_res.json(v_reviews);
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_moderateReview = async (p_req, p_res) => {
  try {
    const { status } = p_req.body;
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return p_res.status(400).json({ message: 'Invalid status' });
    }

    const v_review = await Review.findByIdAndUpdate(
      p_req.params.id,
      { status },
      { new: true, runValidators: true }
    ).populate('user_id', 'name email')
     .populate('movie_id', 'title year');
    
    if (!v_review) {
      return p_res.status(404).json({ message: 'Review not found' });
    }
    
    await f_updateMovieRating(v_review.movie_id._id);
    
    p_res.json(v_review);
  } catch (p_error) {
    p_res.status(400).json({ message: p_error.message });
  }
};

const f_voteReviewHelpfulness = async (p_req, p_res) => {
  try {
    const { vote } = p_req.body; // 'up' or 'down'
    if (!['up', 'down'].includes(vote)) {
      return p_res.status(400).json({ message: 'Invalid vote type' });
    }

    const v_updateField = vote === 'up' ? 'helpfulness_votes.upvotes' : 'helpfulness_votes.downvotes';
    
    const v_review = await Review.findByIdAndUpdate(
      p_req.params.id,
      { $inc: { [v_updateField]: 1 } },
      { new: true }
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

const f_getMovieRatingStats = async (p_req, p_res) => {
  try {
    const v_stats = await Review.aggregate([
      { $match: { movie_id: new mongoose.Types.ObjectId(p_req.params.movieId), status: 'approved' } },
      {
        $group: {
          _id: '$movie_id',
          averageRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 },
          ratingDistribution: {
            $push: '$rating'
          }
        }
      }
    ]);

    if (v_stats.length === 0) {
      return p_res.json({
        averageRating: 0,
        totalReviews: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      });
    }

    const v_distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    v_stats[0].ratingDistribution.forEach(rating => {
      v_distribution[rating]++;
    });

    p_res.json({
      averageRating: Math.round(v_stats[0].averageRating * 10) / 10,
      totalReviews: v_stats[0].totalReviews,
      ratingDistribution: v_distribution
    });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_updateMovieRating = async (p_movieId) => {
  try {
    const v_stats = await Review.aggregate([
      { $match: { movie_id: new mongoose.Types.ObjectId(p_movieId), status: 'approved' } },
      {
        $group: {
          _id: '$movie_id',
          averageRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 }
        }
      }
    ]);

    const v_avgRating = v_stats.length > 0 ? v_stats[0].averageRating : 0;
    const v_totalReviews = v_stats.length > 0 ? v_stats[0].totalReviews : 0;

    await Movie.findByIdAndUpdate(p_movieId, {
      'imdb.rating': Math.round(v_avgRating * 10) / 10,
      num_mflix_reviews: v_totalReviews
    });
  } catch (p_error) {
    console.error('Error updating movie rating:', p_error);
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
  f_moderateReview,
  f_voteReviewHelpfulness,
  f_getMovieRatingStats
};
