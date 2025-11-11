const express = require('express'); // Express framework
const router = express.Router();
const {
  getAnalytics,
  getDashboardAnalytics,
  getRoomUtilization,
  getTimeSlotPopularity,
  getUserStats,
  getAllAnalytics
} = require('../controllers/analyticsController');
const { protect, authorize } = require('../middleware/auth');

// All analytics routes are admin-only
router.use(protect, authorize('admin'));

// Routes
router.get('/', getAnalytics);
router.get('/dashboard', getDashboardAnalytics);
router.get('/utilization', getRoomUtilization);
router.get('/time-slots', getTimeSlotPopularity);
router.get('/user-stats', getUserStats);

module.exports = router;
