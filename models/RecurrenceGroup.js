const mongoose = require('mongoose'); // MongoDB ODM

const recurrenceGroupSchema = new mongoose.Schema({
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true
  },
  recurrencePattern: {
    type: String,
    enum: ['weekly'],
    default: 'weekly'
  },
  dayOfWeek: {
    type: Number,
    min: 0,
    max: 6,
    required: true // 0 = Sunday, 1 = Monday, etc.
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  baseStartTime: {
    type: String,
    required: true // Format: "HH:mm"
  },
  baseEndTime: {
    type: String,
    required: true // Format: "HH:mm"
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('RecurrenceGroup', recurrenceGroupSchema);
