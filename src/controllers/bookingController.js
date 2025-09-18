const Booking = require('../models/Booking');
const MovieSession = require('../models/MovieSession');
const DiscountCode = require('../models/DiscountCode');
const crypto = require('crypto');

// Generar código de confirmación único
const f_generateConfirmationCode = () => {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
};

// Validar disponibilidad de asientos
const f_validateSeatAvailability = async (p_sessionId, p_selectedSeats) => {
  const v_session = await MovieSession.findById(p_sessionId);
  if (!v_session) {
    throw new Error('Movie session not found');
  }

  for (const v_selectedSeat of p_selectedSeats) {
    const v_seat = v_session.seats.find(
      seat => seat.row === v_selectedSeat.row && seat.number === v_selectedSeat.number
    );
    
    if (!v_seat || !v_seat.isAvailable) {
      throw new Error(`Seat ${v_selectedSeat.row}${v_selectedSeat.number} is not available`);
    }
  }
  
  return v_session;
};

// Aplicar código de descuento
const f_applyDiscountCode = async (p_discountCode, p_totalAmount) => {
  if (!p_discountCode) {
    return { discountAmount: 0, finalAmount: p_totalAmount };
  }

  const v_discount = await DiscountCode.findOne({ 
    code: p_discountCode.toUpperCase(),
    isActive: true,
    expirationDate: { $gt: new Date() }
  });

  if (!v_discount) {
    throw new Error('Invalid or expired discount code');
  }

  if (v_discount.usageLimit && v_discount.usedCount >= v_discount.usageLimit) {
    throw new Error('Discount code usage limit exceeded');
  }

  let v_discountAmount = 0;
  if (v_discount.discountType === 'percentage') {
    v_discountAmount = (p_totalAmount * v_discount.discountValue) / 100;
  } else {
    v_discountAmount = v_discount.discountValue;
  }

  const v_finalAmount = Math.max(0, p_totalAmount - v_discountAmount);
  
  return { 
    discountAmount: v_discountAmount, 
    finalAmount: v_finalAmount,
    discountCode: v_discount 
  };
};

const f_getAllBookings = async (p_req, p_res) => {
  try {
    const v_page = parseInt(p_req.query.page) || 1;
    const v_limit = parseInt(p_req.query.limit) || 10;
    const v_skip = (v_page - 1) * v_limit;

    const v_filter = {};
    if (p_req.query.userId) v_filter.user_id = p_req.query.userId;
    if (p_req.query.status) v_filter.status = p_req.query.status;

    const v_bookings = await Booking.find(v_filter)
      .populate('user_id', 'name email')
      .populate({
        path: 'movieSession_id',
        populate: [
          { path: 'movie_id', select: 'title year' },
          { path: 'theater_id', select: 'theaterId location' }
        ]
      })
      .skip(v_skip)
      .limit(v_limit)
      .sort({ createdAt: -1 });

    const v_total = await Booking.countDocuments(v_filter);

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
        path: 'movieSession_id',
        populate: [
          { path: 'movie_id', select: 'title year plot' },
          { path: 'theater_id', select: 'theaterId location' }
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
  try {
    const { movieSession_id, selectedSeats, discountCode, bookingType, groupSize } = p_req.body;

    // Validar disponibilidad de asientos
    const v_session = await f_validateSeatAvailability(movieSession_id, selectedSeats);

    // Calcular precio total
    let v_totalAmount = 0;
    const v_seatsWithPrices = selectedSeats.map(selectedSeat => {
      const v_sessionSeat = v_session.seats.find(
        seat => seat.row === selectedSeat.row && seat.number === selectedSeat.number
      );
      const v_price = v_session.pricing[v_sessionSeat.type];
      v_totalAmount += v_price;
      
      return {
        row: selectedSeat.row,
        number: selectedSeat.number,
        type: v_sessionSeat.type,
        price: v_price
      };
    });

    // Aplicar descuento si existe
    const v_discountResult = await f_applyDiscountCode(discountCode, v_totalAmount);

    // Crear reserva
    const v_bookingData = {
      ...p_req.body,
      selectedSeats: v_seatsWithPrices,
      totalAmount: v_totalAmount,
      discountAmount: v_discountResult.discountAmount,
      finalAmount: v_discountResult.finalAmount,
      confirmationCode: f_generateConfirmationCode(),
      groupSize: groupSize || selectedSeats.length
    };

    const v_booking = new Booking(v_bookingData);
    const v_savedBooking = await v_booking.save();

    // Marcar asientos como no disponibles
    for (const v_seat of selectedSeats) {
      const v_seatIndex = v_session.seats.findIndex(
        seat => seat.row === v_seat.row && seat.number === v_seat.number
      );
      if (v_seatIndex !== -1) {
        v_session.seats[v_seatIndex].isAvailable = false;
      }
    }
    v_session.availableSeats -= selectedSeats.length;
    await v_session.save();

    // Incrementar uso del código de descuento
    if (v_discountResult.discountCode) {
      v_discountResult.discountCode.usedCount += 1;
      await v_discountResult.discountCode.save();
    }

    p_res.status(201).json(v_savedBooking);
  } catch (p_error) {
    p_res.status(400).json({ message: p_error.message });
  }
};

const f_updateBooking = async (p_req, p_res) => {
  try {
    const v_booking = await Booking.findByIdAndUpdate(
      p_req.params.id,
      p_req.body,
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
  try {
    const v_booking = await Booking.findById(p_req.params.id);
    if (!v_booking) {
      return p_res.status(404).json({ message: 'Booking not found' });
    }

    if (v_booking.status === 'cancelled') {
      return p_res.status(400).json({ message: 'Booking already cancelled' });
    }

    // Liberar asientos
    const v_session = await MovieSession.findById(v_booking.movieSession_id);
    if (v_session) {
      for (const v_seat of v_booking.selectedSeats) {
        const v_seatIndex = v_session.seats.findIndex(
          seat => seat.row === v_seat.row && seat.number === v_seat.number
        );
        if (v_seatIndex !== -1) {
          v_session.seats[v_seatIndex].isAvailable = true;
        }
      }
      v_session.availableSeats += v_booking.selectedSeats.length;
      await v_session.save();
    }

    // Actualizar estado de reserva
    v_booking.status = 'cancelled';
    v_booking.paymentStatus = 'refunded';
    await v_booking.save();

    p_res.json({ message: 'Booking cancelled successfully', booking: v_booking });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_confirmBooking = async (p_req, p_res) => {
  try {
    const { paymentMethod, transactionId } = p_req.body;
    
    const v_booking = await Booking.findById(p_req.params.id);
    if (!v_booking) {
      return p_res.status(404).json({ message: 'Booking not found' });
    }

    if (v_booking.status !== 'pending') {
      return p_res.status(400).json({ message: 'Booking cannot be confirmed' });
    }

    v_booking.status = 'confirmed';
    v_booking.paymentStatus = 'completed';
    v_booking.paymentMethod = paymentMethod;
    v_booking.transactionId = transactionId;
    
    await v_booking.save();

    p_res.json({ message: 'Booking confirmed successfully', booking: v_booking });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_getBookingHistory = async (p_req, p_res) => {
  try {
    const v_userId = p_req.params.userId;
    const v_bookings = await Booking.find({ user_id: v_userId })
      .populate({
        path: 'movieSession_id',
        populate: [
          { path: 'movie_id', select: 'title year' },
          { path: 'theater_id', select: 'theaterId location' }
        ]
      })
      .sort({ createdAt: -1 });

    p_res.json({ bookings: v_bookings, totalBookings: v_bookings.length });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

module.exports = {
  f_getAllBookings,
  f_getBookingById,
  f_createBooking,
  f_updateBooking,
  f_cancelBooking,
  f_confirmBooking,
  f_getBookingHistory
};
