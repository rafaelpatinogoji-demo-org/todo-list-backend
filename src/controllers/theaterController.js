const Theater = require('../models/Theater');

const f_getAllTheaters = async (p_req, p_res) => {
  try {
    const v_page = parseInt(p_req.query.page) || 1;
    const v_limit = parseInt(p_req.query.limit) || 10;
    const v_skip = (v_page - 1) * v_limit;

    const v_theaters = await Theater.find()
      .skip(v_skip)
      .limit(v_limit);

    const v_total = await Theater.countDocuments();

    p_res.json({
      theaters: v_theaters,
      currentPage: v_page,
      totalPages: Math.ceil(v_total / v_limit),
      totalTheaters: v_total
    });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_getTheaterById = async (p_req, p_res) => {
  try {
    const v_theater = await Theater.findById(p_req.params.id);
    if (!v_theater) {
      return p_res.status(404).json({ message: 'Theater not found' });
    }
    p_res.json(v_theater);
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_createTheater = async (p_req, p_res) => {
  try {
    const v_theater = new Theater(p_req.body);
    const v_savedTheater = await v_theater.save();
    p_res.status(201).json(v_savedTheater);
  } catch (p_error) {
    p_res.status(400).json({ message: p_error.message });
  }
};

const f_updateTheater = async (p_req, p_res) => {
  try {
    const v_theater = await Theater.findByIdAndUpdate(
      p_req.params.id,
      p_req.body,
      { new: true, runValidators: true }
    );
    if (!v_theater) {
      return p_res.status(404).json({ message: 'Theater not found' });
    }
    p_res.json(v_theater);
  } catch (p_error) {
    p_res.status(400).json({ message: p_error.message });
  }
};

const f_deleteTheater = async (p_req, p_res) => {
  try {
    const v_theater = await Theater.findByIdAndDelete(p_req.params.id);
    if (!v_theater) {
      return p_res.status(404).json({ message: 'Theater not found' });
    }
    p_res.json({ message: 'Theater deleted successfully' });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

module.exports = {
  f_getAllTheaters,
  f_getTheaterById,
  f_createTheater,
  f_updateTheater,
  f_deleteTheater
};
