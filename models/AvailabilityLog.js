const mongoose = require('mongoose'); // MongoDB ODM

const availabilityLogSchema = new mongoose.Schema({
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  totalMinutesBooked: {
    type: Number,
    default: 0
  },
  totalBookings: {
    type: Number,
    default: 0
  },
  utilizationRate: {
    type: Number,
    default: 0 // Percentage
  },
  peakHours: [{
    hour: Number,
    bookings: Number
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index for efficient queries
availabilityLogSchema.index({ room: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('AvailabilityLog', availabilityLogSchema);
