const express = require('express');
const router = express.Router();
const {
  getAnalytics,
  getDashboardStats,
  getRoomUtilization,
  getBookingTrends
} = require('../controllers/adminAnalyticsController');
const { protect, authorize } = require('../middleware/auth');

// All routes are admin-only
router.use(protect, authorize('admin'));

// Analytics routes
router.get('/', getAnalytics);
router.get('/dashboard', getDashboardStats);
router.get('/rooms', getRoomUtilization);
router.get('/trends', getBookingTrends);

module.exports = router;
