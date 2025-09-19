const Movie = require('../models/Movie');
const Theater = require('../models/Theater');
const Session = require('../models/Session');
const Comment = require('../models/Comment');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

const f_logAuditAction = async (p_adminId, p_action, p_targetType, p_targetId, p_details = {}) => {
  try {
    const v_auditLog = new AuditLog({
      admin_id: p_adminId,
      action: p_action,
      target_type: p_targetType,
      target_id: p_targetId,
      details: p_details
    });
    await v_auditLog.save();
  } catch (p_error) {
    console.error('Error logging audit action:', p_error);
  }
};

const f_createMovieAdmin = async (p_req, p_res) => {
  try {
    const v_movie = new Movie(p_req.body);
    const v_savedMovie = await v_movie.save();

    await f_logAuditAction(
      p_req.admin._id,
      'create_movie',
      'movie',
      v_savedMovie._id.toString(),
      { title: v_savedMovie.title }
    );

    p_res.status(201).json(v_savedMovie);
  } catch (p_error) {
    p_res.status(400).json({ message: p_error.message });
  }
};

const f_updateMovieAdmin = async (p_req, p_res) => {
  try {
    const v_movie = await Movie.findByIdAndUpdate(
      p_req.params.id,
      p_req.body,
      { new: true, runValidators: true }
    );

    if (!v_movie) {
      return p_res.status(404).json({ message: 'Película no encontrada' });
    }

    await f_logAuditAction(
      p_req.admin._id,
      'update_movie',
      'movie',
      v_movie._id.toString(),
      { title: v_movie.title, changes: p_req.body }
    );

    p_res.json(v_movie);
  } catch (p_error) {
    p_res.status(400).json({ message: p_error.message });
  }
};

const f_deleteMovieAdmin = async (p_req, p_res) => {
  try {
    const v_movie = await Movie.findByIdAndDelete(p_req.params.id);
    if (!v_movie) {
      return p_res.status(404).json({ message: 'Película no encontrada' });
    }

    await Comment.deleteMany({ movie_id: p_req.params.id });

    await f_logAuditAction(
      p_req.admin._id,
      'delete_movie',
      'movie',
      v_movie._id.toString(),
      { title: v_movie.title }
    );

    p_res.json({ message: 'Película eliminada exitosamente' });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_createTheaterAdmin = async (p_req, p_res) => {
  try {
    const v_theater = new Theater(p_req.body);
    const v_savedTheater = await v_theater.save();

    await f_logAuditAction(
      p_req.admin._id,
      'create_theater',
      'theater',
      v_savedTheater._id.toString(),
      { theaterId: v_savedTheater.theaterId }
    );

    p_res.status(201).json(v_savedTheater);
  } catch (p_error) {
    p_res.status(400).json({ message: p_error.message });
  }
};

const f_updateTheaterAdmin = async (p_req, p_res) => {
  try {
    const v_theater = await Theater.findByIdAndUpdate(
      p_req.params.id,
      p_req.body,
      { new: true, runValidators: true }
    );

    if (!v_theater) {
      return p_res.status(404).json({ message: 'Teatro no encontrado' });
    }

    await f_logAuditAction(
      p_req.admin._id,
      'update_theater',
      'theater',
      v_theater._id.toString(),
      { theaterId: v_theater.theaterId, changes: p_req.body }
    );

    p_res.json(v_theater);
  } catch (p_error) {
    p_res.status(400).json({ message: p_error.message });
  }
};

const f_deleteTheaterAdmin = async (p_req, p_res) => {
  try {
    const v_theater = await Theater.findByIdAndDelete(p_req.params.id);
    if (!v_theater) {
      return p_res.status(404).json({ message: 'Teatro no encontrado' });
    }

    await f_logAuditAction(
      p_req.admin._id,
      'delete_theater',
      'theater',
      v_theater._id.toString(),
      { theaterId: v_theater.theaterId }
    );

    p_res.json({ message: 'Teatro eliminado exitosamente' });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_exportData = async (p_req, p_res) => {
  try {
    const { type, format } = p_req.query;
    let v_data;

    switch (type) {
      case 'users':
        v_data = await User.find().select('-password');
        break;
      case 'movies':
        v_data = await Movie.find();
        break;
      case 'theaters':
        v_data = await Theater.find();
        break;
      case 'comments':
        v_data = await Comment.find().populate('movie_id', 'title');
        break;
      default:
        return p_res.status(400).json({ message: 'Tipo de datos no válido' });
    }

    await f_logAuditAction(
      p_req.admin._id,
      'export_data',
      type,
      'bulk',
      { format, count: v_data.length }
    );

    if (format === 'csv') {
      const v_csv = v_data.map(item => Object.values(item.toObject()).join(',')).join('\n');
      p_res.setHeader('Content-Type', 'text/csv');
      p_res.setHeader('Content-Disposition', `attachment; filename=${type}.csv`);
      p_res.send(v_csv);
    } else {
      p_res.json(v_data);
    }
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

module.exports = {
  f_createMovieAdmin,
  f_updateMovieAdmin,
  f_deleteMovieAdmin,
  f_createTheaterAdmin,
  f_updateTheaterAdmin,
  f_deleteTheaterAdmin,
  f_exportData
};
