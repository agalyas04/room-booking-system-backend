const mongoose = require('mongoose'); // MongoDB ODM

const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: [
      'booking_created', 'booking_cancelled', 'booking_updated', 'booking_reassigned', 
      'booking_reminder', 'admin_override', 'meeting_scheduled', 'user_action_alert',
      'room_created', 'room_updated', 'room_deleted', 'user_registered'
    ],
    required : true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking'
  },
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room'
  },
  isRead: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for efficient queries
notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
