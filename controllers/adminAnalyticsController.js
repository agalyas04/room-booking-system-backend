const Booking = require('../models/Booking');
const Room = require('../models/Room');
const User = require('../models/User');

// @desc    Get comprehensive analytics data
// @route   GET /api/admin/analytics
// @access  Private/Admin
exports.getAnalytics = async (req, res, next) => {
  try {
    const { timeRange = 'week' } = req.query;
    
    // Calculate date range
    const now = new Date();
    let startDate;
    
    switch (timeRange) {
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default: // week
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    // Get basic stats
    const totalRooms = await Room.countDocuments();
    const activeBookings = await Booking.countDocuments({
      status: 'confirmed',
      startTime: { $lte: now },
      endTime: { $gte: now }
    });

    // Get total bookings in time range
    const totalBookings = await Booking.countDocuments({
      createdAt: { $gte: startDate }
    });

    // Calculate utilization rate (simplified)
    const utilizationRate = totalRooms > 0 ? Math.round((activeBookings / totalRooms) * 100) : 0;

    // Get popular rooms
    const popularRooms = await Booking.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          status: 'confirmed'
        }
      },
      {
        $group: {
          _id: '$room',
          bookingCount: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'rooms',
          localField: '_id',
          foreignField: '_id',
          as: 'roomInfo'
        }
      },
      {
        $unwind: '$roomInfo'
      },
      {
        $sort: { bookingCount: -1 }
      },
      {
        $limit: 5
      }
    ]);

    // Get booking trends by day
    const bookingTrends = await Booking.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          status: 'confirmed'
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id': 1 }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalRooms,
        activeBookings,
        totalBookings,
        utilizationRate,
        popularRooms,
        bookingTrends,
        timeRange
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get dashboard statistics
// @route   GET /api/admin/analytics/dashboard
// @access  Private/Admin
exports.getDashboardStats = async (req, res, next) => {
  try {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    // Today's stats
    const todayBookings = await Booking.countDocuments({
      startTime: { $gte: startOfDay, $lt: endOfDay },
      status: 'confirmed'
    });

    const totalUsers = await User.countDocuments();
    const totalRooms = await Room.countDocuments();
    const activeRooms = await Room.countDocuments({ isActive: true });

    // Current active bookings
    const activeBookings = await Booking.countDocuments({
      status: 'confirmed',
      startTime: { $lte: now },
      endTime: { $gte: now }
    });

    res.status(200).json({
      success: true,
      data: {
        todayBookings,
        totalUsers,
        totalRooms,
        activeRooms,
        activeBookings
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get room utilization data
// @route   GET /api/admin/analytics/rooms
// @access  Private/Admin
exports.getRoomUtilization = async (req, res, next) => {
  try {
    const { timeRange = 'week' } = req.query;
    
    // Calculate date range
    const now = new Date();
    let startDate;
    
    switch (timeRange) {
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default: // week
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    const roomUtilization = await Room.aggregate([
      {
        $lookup: {
          from: 'bookings',
          let: { roomId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$room', '$$roomId'] },
                status: 'confirmed',
                startTime: { $gte: startDate }
              }
            }
          ],
          as: 'bookings'
        }
      },
      {
        $project: {
          name: 1,
          location: 1,
          capacity: 1,
          bookingCount: { $size: '$bookings' },
          totalHours: {
            $sum: {
              $map: {
                input: '$bookings',
                as: 'booking',
                in: {
                  $divide: [
                    { $subtract: ['$$booking.endTime', '$$booking.startTime'] },
                    1000 * 60 * 60 // Convert to hours
                  ]
                }
              }
            }
          }
        }
      },
      {
        $sort: { bookingCount: -1 }
      }
    ]);

    res.status(200).json({
      success: true,
      data: roomUtilization
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get booking trends
// @route   GET /api/admin/analytics/trends
// @access  Private/Admin
exports.getBookingTrends = async (req, res, next) => {
  try {
    const { timeRange = 'week' } = req.query;
    
    // Calculate date range
    const now = new Date();
    let startDate;
    
    switch (timeRange) {
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default: // week
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    // Booking trends by hour
    const hourlyTrends = await Booking.aggregate([
      {
        $match: {
          startTime: { $gte: startDate },
          status: 'confirmed'
        }
      },
      {
        $group: {
          _id: { $hour: '$startTime' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id': 1 }
      }
    ]);

    // Booking trends by day of week
    const weeklyTrends = await Booking.aggregate([
      {
        $match: {
          startTime: { $gte: startDate },
          status: 'confirmed'
        }
      },
      {
        $group: {
          _id: { $dayOfWeek: '$startTime' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id': 1 }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        hourlyTrends,
        weeklyTrends
      }
    });
  } catch (error) {
    next(error);
  }
};
