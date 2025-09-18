const Theater = require('../models/Theater');

const f_getAllTheatersAdmin = async (p_req, p_res) => {
  try {
    const v_page = parseInt(p_req.query.page) || 1;
    const v_limit = parseInt(p_req.query.limit) || 20;
    const v_skip = (v_page - 1) * v_limit;
    const { city, state, search } = p_req.query;

    const v_filter = {};
    if (city) v_filter['location.address.city'] = { $regex: city, $options: 'i' };
    if (state) v_filter['location.address.state'] = { $regex: state, $options: 'i' };
    if (search) {
      v_filter.$or = [
        { 'location.address.city': { $regex: search, $options: 'i' } },
        { 'location.address.state': { $regex: search, $options: 'i' } },
        { 'location.address.street1': { $regex: search, $options: 'i' } }
      ];
    }

    const v_theaters = await Theater.find(v_filter)
      .skip(v_skip)
      .limit(v_limit)
      .sort({ theaterId: 1 });

    const v_total = await Theater.countDocuments(v_filter);

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

const f_bulkTheaterOperations = async (p_req, p_res) => {
  try {
    const { theaterIds, operation, updateData } = p_req.body;

    let v_result;
    switch (operation) {
      case 'update':
        v_result = await Theater.updateMany(
          { _id: { $in: theaterIds } },
          updateData
        );
        break;
      case 'delete':
        v_result = await Theater.deleteMany({ _id: { $in: theaterIds } });
        break;
      default:
        return p_res.status(400).json({ message: 'Operación no válida' });
    }

    p_res.json({
      message: `Operación ${operation} completada`,
      modifiedCount: v_result.modifiedCount || v_result.deletedCount
    });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_getTheaterStats = async (p_req, p_res) => {
  try {
    const v_theatersByState = await Theater.aggregate([
      {
        $group: {
          _id: "$location.address.state",
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    const v_theatersByCity = await Theater.aggregate([
      {
        $group: {
          _id: {
            city: "$location.address.city",
            state: "$location.address.state"
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    p_res.json({
      theatersByState: v_theatersByState,
      theatersByCity: v_theatersByCity
    });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_exportTheaters = async (p_req, p_res) => {
  try {
    const v_theaters = await Theater.find();
    
    p_res.setHeader('Content-Type', 'application/json');
    p_res.setHeader('Content-Disposition', 'attachment; filename=theaters_export.json');
    p_res.json(v_theaters);
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

module.exports = {
  f_getAllTheatersAdmin,
  f_bulkTheaterOperations,
  f_getTheaterStats,
  f_exportTheaters
};
