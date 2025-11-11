const Booking = require('../models/Booking'); // Booking model
const RecurrenceGroup = require('../models/RecurrenceGroup');
const Room = require('../models/Room');
const User = require('../models/User');
const Notification = require('../models/Notification');
const NotificationService = require('../services/notificationService');
const { checkOverlap, checkOverlapWithRecurring, generateRecurringDates, combineDateAndTime } = require('../utils/bookingHelper');
const { sendEmail, bookingCreatedEmail, bookingCancelledEmail } = require('../utils/emailService');


exports.getBookings = async (req, res, next) => {
  try {
    const { room, startDate, endDate, status } = req.query;
    
    const query = {};
    
    // Filter by room
    if (room) query.room = room;
    
    // Filter by date range
    if (startDate || endDate) {
      query.startTime = {};
      if (startDate) query.startTime.$gte = new Date(startDate);
      if (endDate) query.startTime.$lte = new Date(endDate);
    }
    
    // Filter by status
    if (status) query.status = status;
    
    // Everyone can see all bookings (removed role-based filtering)

    const bookings = await Booking.find(query)
      .populate('room', 'name location capacity')
      .populate('bookedBy', 'name email')
      .populate('attendees', 'name email')
      .sort('-startTime');

    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single booking
// @route   GET /api/bookings/:id
// @access  Private
exports.getBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('room', 'name location capacity amenities')
      .populate('bookedBy', 'name email department')
      .populate('attendees', 'name email')
      .populate('recurrenceGroup');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check access rights
    if (req.user.role !== 'admin' && 
        booking.bookedBy._id.toString() !== req.user._id.toString() &&
        !booking.attendees.some(a => a._id.toString() === req.user._id.toString())) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this booking'
      });
    }

    res.status(200).json({
      success: true,
      data: booking
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create booking
// @route   POST /api/bookings
// @access  Private
exports.createBooking = async (req, res, next) => {
  try {
    const { room, title, description, startTime, endTime, attendees, isRecurring, recurrenceEndDate } = req.body;

    // Validate attendees
    if (!attendees || !Array.isArray(attendees) || attendees.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one attendee is required for the booking'
      });
    }

    // Verify room exists
    const roomExists = await Room.findById(room);
    if (!roomExists) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    // Validate attendees count doesn't exceed room capacity
    if (attendees.length > roomExists.capacity) {
      return res.status(400).json({
        success: false,
        message: `Too many attendees. Room capacity is ${roomExists.capacity} people, but ${attendees.length} attendees were selected.`
      });
    }

    // Check for overlapping bookings (including recurring bookings)
    // Skip overlap check for admins (they can override bookings)
    const startDateTime = new Date(startTime);
    const endDateTime = new Date(endTime);
    
    if (req.user.role !== 'admin') {
      const hasOverlap = await checkOverlapWithRecurring(room, startDateTime, endDateTime);
      if (hasOverlap) {
        return res.status(400).json({
          success: false,
          message: 'Room is already booked for this time slot. Please choose a different time.'
        });
      }
    }

    // Handle recurring booking
    if (isRecurring && recurrenceEndDate) {
      const dayOfWeek = startDateTime.getDay();
      
      // Extract time components
      const baseStartTime = `${startDateTime.getHours()}:${startDateTime.getMinutes().toString().padStart(2, '0')}`;
      const baseEndTime = `${endDateTime.getHours()}:${endDateTime.getMinutes().toString().padStart(2, '0')}`;

      // Create recurrence group
      const recurrenceGroup = await RecurrenceGroup.create({
        createdBy: req.user._id,
        room,
        recurrencePattern: 'weekly',
        dayOfWeek,
        startDate: startDateTime,
        endDate: new Date(recurrenceEndDate),
        baseStartTime,
        baseEndTime,
        title,
        description
      });

      // Generate all recurring dates
      const recurringDates = generateRecurringDates(startDateTime, new Date(recurrenceEndDate), dayOfWeek);
      
      // First, check ALL dates for conflicts before creating any bookings
      // Skip conflict check for admins (they can override bookings)
      if (req.user.role !== 'admin') {
        const conflictDates = [];
        for (const date of recurringDates) {
          const bookingStart = combineDateAndTime(date, baseStartTime);
          const bookingEnd = combineDateAndTime(date, baseEndTime);
          const overlap = await checkOverlapWithRecurring(room, bookingStart, bookingEnd);
          if (overlap) {
            conflictDates.push(date.toDateString());
          }
        }

        // If there are conflicts, return error with specific dates
        if (conflictDates.length > 0) {
          return res.status(400).json({
            success: false,
            message: `Room is already booked on the following dates: ${conflictDates.join(', ')}. Please choose different dates or times.`,
            conflictDates
          });
        }
      }

      // Create all recurring bookings (with admin override if needed)
      const createdBookings = [];
      for (const date of recurringDates) {
        const bookingStart = combineDateAndTime(date, baseStartTime);
        const bookingEnd = combineDateAndTime(date, baseEndTime);
        
        // Handle admin override for each recurring date
        if (req.user.role === 'admin') {
          const conflictingBookings = await Booking.find({
            room,
            status: 'confirmed',
            $or: [
              { startTime: { $lte: bookingStart }, endTime: { $gt: bookingStart } },
              { startTime: { $lt: bookingEnd }, endTime: { $gte: bookingEnd } },
              { startTime: { $gte: bookingStart }, endTime: { $lte: bookingEnd } },
              { startTime: { $lte: bookingStart }, endTime: { $gte: bookingEnd } }
            ]
          }).populate('bookedBy');

          for (const conflictBooking of conflictingBookings) {
            conflictBooking.status = 'cancelled';
            conflictBooking.cancelledBy = req.user._id;
            conflictBooking.cancelledAt = Date.now();
            conflictBooking.cancellationReason = 'Admin override - recurring booking created';
            await conflictBooking.save();

            // Notify affected user
            await Notification.create({
              user: conflictBooking.bookedBy._id,
              type: 'admin_override',
              title: 'Booking Cancelled by Admin',
              message: `Your booking "${conflictBooking.title}" has been cancelled due to an admin recurring booking override.`,
              booking: conflictBooking._id,
              room: conflictBooking.room
            });
          }
        }
        
        const booking = await Booking.create({
          room,
          bookedBy: req.user._id,
          title,
          description,
          startTime: bookingStart,
          endTime: bookingEnd,
          attendees: attendees,
          recurrenceGroup: recurrenceGroup._id
        });
        createdBookings.push(booking);
      }

      // Send notification to user
      await Notification.create({
        user: req.user._id,
        type: 'booking_created',
        title: 'Recurring Booking Created',
        message: `Your recurring booking for ${title} has been created with ${createdBookings.length} occurrences.`,
        room
      });
      
      // Notify admins of user action (if user is not admin)
      if (req.user.role !== 'admin') {
        await NotificationService.notifyAdminsOfUserAction('booking_created', {
          title: title,
          roomName: roomExists.name,
          bookingId: createdBookings[0]._id,
          roomId: room
        }, req.user);
      }
      
      // Notify attendees about all recurring meetings
      if (attendees && attendees.length > 0) {
        for (const booking of createdBookings) {
          await NotificationService.notifyAttendeesOfMeeting(booking, req.user);
        }
      }

      return res.status(201).json({
        success: true,
        message: 'Recurring booking created successfully',
        data: {
          recurrenceGroup,
          createdBookings: createdBookings.length,
          failedDates: failedDates.length
        }
      });
    }

    // Check if admin is overriding existing bookings
    let isAdminOverride = false;
    if (req.user.role === 'admin') {
      const hasOverlap = await checkOverlapWithRecurring(room, startDateTime, endDateTime);
      if (hasOverlap) {
        isAdminOverride = true;
        // Cancel conflicting bookings
        const conflictingBookings = await Booking.find({
          room,
          status: 'confirmed',
          $or: [
            { startTime: { $lte: startDateTime }, endTime: { $gt: startDateTime } },
            { startTime: { $lt: endDateTime }, endTime: { $gte: endDateTime } },
            { startTime: { $gte: startDateTime }, endTime: { $lte: endDateTime } },
            { startTime: { $lte: startDateTime }, endTime: { $gte: endDateTime } }
          ]
        }).populate('bookedBy');

        for (const conflictBooking of conflictingBookings) {
          conflictBooking.status = 'cancelled';
          conflictBooking.cancelledBy = req.user._id;
          conflictBooking.cancelledAt = Date.now();
          conflictBooking.cancellationReason = 'Admin override - conflicting booking created';
          await conflictBooking.save();

          // Notify affected user
          await Notification.create({
            user: conflictBooking.bookedBy._id,
            type: 'admin_override',
            title: 'Booking Cancelled by Admin',
            message: `Your booking "${conflictBooking.title}" has been cancelled due to an admin override.`,
            booking: conflictBooking._id,
            room: conflictBooking.room
          });
        }
      }
    }

    // Create single booking
    const booking = await Booking.create({
      room,
      bookedBy: req.user._id,
      title,
      description,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      attendees: attendees
    });

    await booking.populate('room bookedBy attendees');

    // Create notification for the user
    await Notification.create({
      user: req.user._id,
      type: isAdminOverride ? 'admin_override' : 'booking_created',
      title: isAdminOverride ? 'Admin Override Booking Created' : 'Booking Created',
      message: isAdminOverride ? 
        `Your admin booking for ${booking.title} has been created, overriding existing bookings.` :
        `Your booking for ${booking.title} has been confirmed.`,
      booking: booking._id,
      room: booking.room._id
    });
    
    // Notify admins of user action (if user is not admin)
    if (req.user.role !== 'admin') {
      await NotificationService.notifyAdminsOfUserAction('booking_created', {
        title: booking.title,
        roomName: roomExists.name,
        bookingId: booking._id,
        roomId: booking.room._id
      }, req.user);
    }
    
    // Notify attendees about the meeting
    if (attendees && attendees.length > 0) {
      await NotificationService.notifyAttendeesOfMeeting(booking, req.user);
    }

    // Send email notification (async, don't wait)
    if (process.env.EMAIL_USER) {
      sendEmail({
        email: req.user.email,
        subject: 'Booking Confirmation - Room Booking Lite',
        html: bookingCreatedEmail(booking, roomExists, req.user)
      }).catch(err => console.error('Email error:', err));
    }

    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      data: booking
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update booking
// @route   PUT /api/bookings/:id
// @access  Private
exports.updateBooking = async (req, res, next) => {
  try {
    let booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check authorization
    if (req.user.role !== 'admin' && booking.bookedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this booking'
      });
    }

    const { startTime, endTime, room } = req.body;

    // If time or room is being changed, check for overlaps
    if (startTime || endTime || room) {
      const newStartTime = startTime ? new Date(startTime) : booking.startTime;
      const newEndTime = endTime ? new Date(endTime) : booking.endTime;
      const newRoom = room || booking.room;

      const hasOverlap = await checkOverlap(newRoom, newStartTime, newEndTime, booking._id);
      if (hasOverlap) {
        return res.status(400).json({
          success: false,
          message: 'Room is already booked for this time slot'
        });
      }
    }

    booking = await Booking.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    ).populate('room bookedBy attendees');

    res.status(200).json({
      success: true,
      message: 'Booking updated successfully',
      data: booking
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel booking
// @route   PATCH /api/bookings/:id/cancel
// @access  Private
exports.cancelBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id).populate('room bookedBy attendees');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check authorization (own booking or admin)
    if (req.user.role !== 'admin' && booking.bookedBy._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to cancel this booking'
      });
    }

    booking.status = 'cancelled';
    booking.cancelledBy = req.user._id;
    booking.cancelledAt = Date.now();
    booking.cancellationReason = req.body.cancellationReason || req.body.reason || '';
    
    await booking.save({ validateBeforeSave: false });

    // Create notification for booking owner (with safety checks)
    if (booking.bookedBy && booking.room) {
      await Notification.create({
        user: booking.bookedBy._id,
        type: req.user.role === 'admin' ? 'admin_override' : 'booking_cancelled',
        title: 'Booking Cancelled',
        message: `Your booking for ${booking.title} has been cancelled.`,
        booking: booking._id,
        room: booking.room._id
      });
    }
    
    // Notify admins of user action (if user is not admin)
    if (req.user.role !== 'admin' && booking.room) {
      await NotificationService.notifyAdminsOfUserAction('booking_cancelled', {
        title: booking.title,
        roomName: booking.room.name,
        bookingId: booking._id,
        roomId: booking.room._id
      }, req.user);
    }
    
    // Notify attendees about meeting cancellation
    if (booking.attendees && booking.attendees.length > 0) {
      await NotificationService.notifyAttendeesOfMeetingUpdate(booking, req.user, 'cancelled');
    }

    // Send email notification
    if (process.env.EMAIL_USER && booking.bookedBy && booking.room) {
      const user = await User.findById(booking.bookedBy._id);
      if (user) {
        sendEmail({
          email: user.email,
          subject: 'Booking Cancelled - Room Booking Lite',
          html: bookingCancelledEmail(booking, booking.room, user)
        }).catch(err => console.error('Email error:', err));
      }
    }

    res.status(200).json({
      success: true,
      message: 'Booking cancelled successfully',
      data: booking
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get my bookings
// @route   GET /api/bookings/my-bookings
// @access  Private
exports.getMyBookings = async (req, res, next) => {
  try {
    const { upcoming } = req.query;
    
    const query = {
      bookedBy: req.user._id  // Only show bookings created by this user
    };

    if (upcoming === 'true') {
      query.startTime = { $gte: new Date() };
      query.status = 'confirmed';
    }

    const bookings = await Booking.find(query)
      .populate('room', 'name location capacity')
      .populate('bookedBy', 'name email')
      .populate('attendees', 'name email')
      .populate('recurrenceGroup')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings
    });
  } catch (error) {
    next(error);
  }
};

// Delete a booking (Admin only - for completed or cancelled bookings)
exports.deleteBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Only allow deletion of past/completed bookings or cancelled bookings
    const now = new Date();
    const isPastBooking = new Date(booking.endTime) < now;
    const isCancelled = booking.status === 'cancelled';
    
    if (!isPastBooking && !isCancelled) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete active upcoming bookings. Please cancel them first.'
      });
    }

    await booking.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Booking deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
