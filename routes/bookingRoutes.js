const express = require('express'); // Express framework
const router = express.Router();
const { body } = require('express-validator');
const {
  getBookings,
  getBooking,
  createBooking,
  updateBooking,
  cancelBooking,
  getMyBookings,
  deleteBooking
} = require('../controllers/bookingController');
const { protect, authorize } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');

// Validation rules
const bookingValidation = [
  body('room').notEmpty().withMessage('Room is required'),
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('startTime').isISO8601().withMessage('Valid start time is required'),
  body('endTime').isISO8601().withMessage('Valid end time is required'),
  body('attendees')
    .isArray({ min: 1 })
    .withMessage('At least one attendee is required')
    .custom((attendees) => {
      if (!attendees || attendees.length === 0) {
        throw new Error('At least one attendee is required');
      }
      if (attendees.length > 50) { // Reasonable upper limit
        throw new Error('Too many attendees selected');
      }
      return true;
    }),
  body('endTime').custom((value, { req }) => {
    if (new Date(value) <= new Date(req.body.startTime)) {
      throw new Error('End time must be after start time');
    }
    return true;
  }),
  handleValidationErrors
];

// Routes
router.get('/my-bookings', protect, getMyBookings);

router.route('/')
  .get(protect, getBookings)
  .post(protect, bookingValidation, createBooking);

router.route('/:id' )
  .get(protect, getBooking)
  .put(protect, updateBooking);

router.patch('/:id/cancel', protect, cancelBooking);

router.delete('/:id', protect, authorize('admin'), deleteBooking);

module.exports = router;
