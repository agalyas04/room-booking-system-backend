const mongoose = require('mongoose'); // MongoDB ODM

const roomSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a room name'],
    unique: true,
    trim: true
  },
  location:  {
    type: String,
    required : [true, 'Please provide a location'],
    trim: true
  },
  capacity: {
    type: Number,
    required: [true, 'Please provide room capacity'],
    min: 1
  },
  amenities: [{
    type: String,
    trim: true
  }],
  description: {
    type: String,
    trim: true
  },
  floor: {
    type: Number
  },
  isActive: {
    type: Boolean,
    default: true
  },
  imageUrl: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update timestamp on save
roomSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Room', roomSchema);

// Room model export
