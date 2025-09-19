const Booking = require('../models/Booking');
const MovieSession = require('../models/MovieSession');
const DiscountCode = require('../models/DiscountCode');
const mongoose = require('mongoose');

const f_getAllBookings = async (p_req, p_res) => {
  try {
    const v_page = parseInt(p_req.query.page) || 1;
    const v_limit = parseInt(p_req.query.limit) || 10;
    const v_skip = (v_page - 1) * v_limit;

    const v_bookings = await Booking.find()
      .populate('user_id', 'name email')
      .populate({
        path: 'movie_session_id',
        populate: [
          { path: 'movie_id', select: 'title year genres' },
          { path: 'theater_id', select: 'location' }
        ]
      })
      .skip(v_skip)
      .limit(v_limit)
      .sort({ created_at: -1 });

    const v_total = await Booking.countDocuments();

    p_res.json({
      bookings: v_bookings,
      currentPage: v_page,
      totalPages: Math.ceil(v_total / v_limit),
      totalBookings: v_total
    });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_getBookingById = async (p_req, p_res) => {
  try {
    const v_booking = await Booking.findById(p_req.params.id)
      .populate('user_id', 'name email')
      .populate({
        path: 'movie_session_id',
        populate: [
          { path: 'movie_id', select: 'title year genres plot' },
          { path: 'theater_id', select: 'location theaterId' }
        ]
      });

    if (!v_booking) {
      return p_res.status(404).json({ message: 'Booking not found' });
    }
    p_res.json(v_booking);
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_createBooking = async (p_req, p_res) => {
  const v_session = await mongoose.startSession();
  v_session.startTransaction();

  try {
    const { user_id, movie_session_id, seats, discount_code } = p_req.body;

    const v_movieSession = await MovieSession.findById(movie_session_id).session(v_session);
    if (!v_movieSession) {
      throw new Error('Movie session not found');
    }

    const v_requestedSeats = seats.map(seat => `${seat.row}-${seat.number}`);
    const v_unavailableSeats = v_movieSession.seat_map.filter(seat => 
      v_requestedSeats.includes(`${seat.row}-${seat.number}`) && !seat.is_available
    );

    if (v_unavailableSeats.length > 0) {
      throw new Error('Some seats are no longer available');
    }

    let v_totalAmount = 0;
    const v_seatDetails = seats.map(requestedSeat => {
      const v_seatInfo = v_movieSession.seat_map.find(seat => 
        seat.row === requestedSeat.row && seat.number === requestedSeat.number
      );
      const v_seatPrice = v_movieSession.price * (v_seatInfo.seat_type === 'premium' ? 1.5 : v_seatInfo.seat_type === 'vip' ? 2 : 1);
      v_totalAmount += v_seatPrice;
      return {
        row: requestedSeat.row,
        number: requestedSeat.number,
        seat_type: v_seatInfo.seat_type,
        price: v_seatPrice
      };
    });

    let v_discountApplied = null;
    if (discount_code) {
      const v_discount = await DiscountCode.findOne({ 
        code: discount_code.toUpperCase(),
        is_active: true,
        valid_from: { $lte: new Date() },
        valid_until: { $gte: new Date() }
      }).session(v_session);

      if (v_discount && (v_discount.max_uses === null || v_discount.current_uses < v_discount.max_uses)) {
        const v_discountAmount = (v_totalAmount * v_discount.discount_percentage) / 100;
        v_totalAmount -= v_discountAmount;
        v_discountApplied = {
          code: discount_code.toUpperCase(),
          discount_amount: v_discountAmount
        };
        
        await DiscountCode.findByIdAndUpdate(
          v_discount._id,
          { $inc: { current_uses: 1 } },
          { session: v_session }
        );
      }
    }

    const v_booking = new Booking({
      user_id,
      movie_session_id,
      seats: v_seatDetails,
      total_amount: v_totalAmount,
      discount_applied: v_discountApplied,
      booking_type: seats.length > 5 ? 'group' : 'individual',
      group_size: seats.length,
      booking_expires_at: new Date(Date.now() + 15 * 60 * 1000)
    });

    const v_savedBooking = await v_booking.save({ session: v_session });

    await MovieSession.findByIdAndUpdate(
      movie_session_id,
      {
        $inc: { available_seats: -seats.length },
        $set: {
          'seat_map.$[elem].is_available': false
        }
      },
      {
        arrayFilters: [{ 
          $or: v_requestedSeats.map(seat => {
            const [row, number] = seat.split('-');
            return { 'elem.row': row, 'elem.number': parseInt(number) };
          })
        }],
        session: v_session
      }
    );

    await v_session.commitTransaction();
    p_res.status(201).json(v_savedBooking);
  } catch (p_error) {
    await v_session.abortTransaction();
    p_res.status(400).json({ message: p_error.message });
  } finally {
    v_session.endSession();
  }
};

const f_confirmBooking = async (p_req, p_res) => {
  try {
    const { payment_method, transaction_id } = p_req.body;
    
    const v_booking = await Booking.findByIdAndUpdate(
      p_req.params.id,
      {
        status: 'confirmed',
        'payment_info.payment_method': payment_method,
        'payment_info.transaction_id': transaction_id,
        'payment_info.payment_status': 'completed'
      },
      { new: true, runValidators: true }
    );

    if (!v_booking) {
      return p_res.status(404).json({ message: 'Booking not found' });
    }

    p_res.json(v_booking);
  } catch (p_error) {
    p_res.status(400).json({ message: p_error.message });
  }
};

const f_cancelBooking = async (p_req, p_res) => {
  const v_session = await mongoose.startSession();
  v_session.startTransaction();

  try {
    const v_booking = await Booking.findById(p_req.params.id).session(v_session);
    if (!v_booking) {
      throw new Error('Booking not found');
    }

    if (v_booking.status === 'cancelled') {
      throw new Error('Booking already cancelled');
    }

    const v_seatUpdates = v_booking.seats.map(seat => ({
      'elem.row': seat.row,
      'elem.number': seat.number
    }));

    await MovieSession.findByIdAndUpdate(
      v_booking.movie_session_id,
      {
        $inc: { available_seats: v_booking.seats.length },
        $set: { 'seat_map.$[elem].is_available': true }
      },
      {
        arrayFilters: [{ $or: v_seatUpdates }],
        session: v_session
      }
    );

    v_booking.status = 'cancelled';
    if (v_booking.payment_info.payment_status === 'completed') {
      v_booking.payment_info.payment_status = 'refunded';
    }
    await v_booking.save({ session: v_session });

    await v_session.commitTransaction();
    p_res.json({ message: 'Booking cancelled successfully', booking: v_booking });
  } catch (p_error) {
    await v_session.abortTransaction();
    p_res.status(400).json({ message: p_error.message });
  } finally {
    v_session.endSession();
  }
};

const f_getBookingHistory = async (p_req, p_res) => {
  try {
    const v_bookings = await Booking.find({ user_id: p_req.params.userId })
      .populate({
        path: 'movie_session_id',
        populate: [
          { path: 'movie_id', select: 'title year genres' },
          { path: 'theater_id', select: 'location' }
        ]
      })
      .sort({ created_at: -1 });

    p_res.json({ bookings: v_bookings });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_generateTicket = async (p_req, p_res) => {
  try {
    const v_booking = await Booking.findById(p_req.params.id)
      .populate('user_id', 'name email')
      .populate({
        path: 'movie_session_id',
        populate: [
          { path: 'movie_id', select: 'title year genres' },
          { path: 'theater_id', select: 'location theaterId' }
        ]
      });

    if (!v_booking) {
      return p_res.status(404).json({ message: 'Booking not found' });
    }

    if (v_booking.status !== 'confirmed') {
      return p_res.status(400).json({ message: 'Booking must be confirmed to generate ticket' });
    }

    const v_ticket = {
      confirmation_code: v_booking.confirmation_code,
      movie: v_booking.movie_session_id.movie_id.title,
      theater: v_booking.movie_session_id.theater_id.location.address,
      showtime: v_booking.movie_session_id.showtime,
      seats: v_booking.seats,
      total_amount: v_booking.total_amount,
      user: v_booking.user_id.name,
      booking_date: v_booking.created_at
    };

    await Booking.findByIdAndUpdate(p_req.params.id, { ticket_generated: true });

    p_res.json({ ticket: v_ticket });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_validateDiscountCode = async (p_req, p_res) => {
  try {
    const { code } = p_req.params;
    const v_discount = await DiscountCode.findOne({
      code: code.toUpperCase(),
      is_active: true,
      valid_from: { $lte: new Date() },
      valid_until: { $gte: new Date() }
    });

    if (!v_discount) {
      return p_res.status(404).json({ message: 'Invalid or expired discount code' });
    }

    if (v_discount.max_uses !== null && v_discount.current_uses >= v_discount.max_uses) {
      return p_res.status(400).json({ message: 'Discount code usage limit reached' });
    }

    p_res.json({
      valid: true,
      discount_percentage: v_discount.discount_percentage,
      code: v_discount.code
    });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

module.exports = {
  f_getAllBookings,
  f_getBookingById,
  f_createBooking,
  f_confirmBooking,
  f_cancelBooking,
  f_getBookingHistory,
  f_generateTicket,
  f_validateDiscountCode
};
