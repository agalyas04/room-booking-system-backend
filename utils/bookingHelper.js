const moment = require('moment'); // Date utility
const Booking = require('../models/Booking');

// Check for overlapping bookings
exports.checkOverlap = async (roomId, startTime, endTime, excludeBookingId = null) => {
  const query = {
    room: roomId,
    status: 'confirmed',
    $or: [
      // New booking starts during existing booking
      { startTime: { $lte: startTime }, endTime: { $gt: startTime } },
      // New booking ends during existing booking
      { startTime: { $lt: endTime }, endTime: { $gte: endTime } },
      // New booking completely contains existing booking
      { startTime: { $gte: startTime }, endTime: { $lte: endTime } },
      // Existing booking completely contains new booking
      { startTime: { $lte: startTime }, endTime: { $gte: endTime } }
    ]
  };

  // Exclude current booking when updating
  if (excludeBookingId) {
    query._id = { $ne: excludeBookingId };
  }

  const overlapping = await Booking.findOne(query);
  return !!overlapping;
};

// Generate recurring booking dates
exports.generateRecurringDates = (startDate, endDate, dayOfWeek) => {
  const dates = [];
  const current = new Date(startDate);
  const end = new Date(endDate);

  // Find the first occurrence of the day of week
  while (current.getDay() !== dayOfWeek) {
    current.setDate(current.getDate() + 1);
  }

  // Generate all occurrences
  while (current <= end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 7); // Add one week
  }

  return dates;
};

// Combine date and time
exports.combineDateAndTime = (date, timeString) => {
  const [hours, minutes] = timeString.split(':');
  const combined = new Date(date);
  combined.setHours(parseInt(hours), parseInt(minutes), 0, 0);
  return combined;
};

// Enhanced overlap check that includes recurring bookings
exports.checkOverlapWithRecurring = async (roomId, startTime, endTime, excludeBookingId = null) => {
  // First check regular bookings
  const hasRegularOverlap = await exports.checkOverlap(roomId, startTime, endTime, excludeBookingId);
  if (hasRegularOverlap) {
    return true;
  }

  // Then check against recurring booking patterns
  const RecurrenceGroup = require('../models/RecurrenceGroup');
  const activeRecurrenceGroups = await RecurrenceGroup.find({
    room: roomId,
    startDate: { $lte: endTime },
    endDate: { $gte: startTime }
  });

  for (const group of activeRecurrenceGroups) {
    const recurringDates = exports.generateRecurringDates(
      group.startDate, 
      group.endDate, 
      group.dayOfWeek
    );

    for (const date of recurringDates) {
      const recurringStart = exports.combineDateAndTime(date, group.baseStartTime);
      const recurringEnd = exports.combineDateAndTime(date, group.baseEndTime);
      
      // Check if the new booking overlaps with this recurring instance
      if ((startTime < recurringEnd && endTime > recurringStart)) {
        return true;
      }
    }
  }

  return false;
};
