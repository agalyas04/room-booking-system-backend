const Booking = require('../models/Booking'); // Booking model
const Room = require('../models/Room');
const User = require('../models/User');
const AvailabilityLog = require('../models/AvailabilityLog');
const moment = require('moment');

// @desc    Get comprehensive analytics for dashboard
// @route   GET /api/analytics
// @access  Private/Admin
exports.getAnalytics = async (req, res, next) => {
  try {
    const { startDate, endDate, range = 'week' } = req.query;
    
    let start, end;
    
    // Use provided date range if available, otherwise fall back to range
    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
      // Set end date to end of day
      end.setHours(23, 59, 59, 999);
    } else {
      switch (range) {
        case 'week':
          start = moment().startOf('week').toDate();
          end = moment().endOf('week').toDate();
          break;
        case 'month':
          start = moment().startOf('month').toDate();
          end = moment().endOf('month').toDate();
          break;
        case 'year':
          start = moment().startOf('year').toDate();
          end = moment().endOf('year').toDate();
          break;
        default:
          start = moment().startOf('week').toDate();
          end = moment().endOf('week').toDate();
      }
    }

    // Get total rooms
    const totalRooms = await Room.countDocuments({ isActive: true });

    // Get active bookings (currently ongoing)
    const now = new Date();
    const activeBookings = await Booking.countDocuments({
      startTime: { $lte: now },
      endTime: { $gte: now },
      status: 'confirmed'
    });

    // Get total bookings for the period
    const totalBookings = await Booking.countDocuments({
      startTime: { $gte: start, $lte: end },
      status: 'confirmed'
    });

    // Calculate overall utilization rate
    const rooms = await Room.find({ isActive: true });
    let totalUtilization = 0;
    const roomUtilization = [];
    const totalRoomsCount = rooms.length;

    // First pass: collect all room booking data
    const roomBookingData = [];
    for (const room of rooms) {
      const bookings = await Booking.find({
        room: room._id,
        startTime: { $gte: start, $lte: end },
        status: 'confirmed'
      });

      const totalBookedMinutes = bookings.reduce((sum, booking) => {
        return sum + (booking.endTime - booking.startTime) / 60000;
      }, 0);

      const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
      const totalAvailableMinutes = days * 10 * 60; // 10 hours per day
      const utilization = totalAvailableMinutes > 0 ? 
        Math.round((totalBookedMinutes / totalAvailableMinutes) * 100) : 0;

      totalUtilization += utilization;
      
      roomBookingData.push({
        room,
        bookingCount: bookings.length,
        utilization
      });
    }

    // Calculate booking percentage: (room bookings / total rooms) * 100
    roomBookingData.forEach(data => {
      const bookingPercentage = totalRoomsCount > 0 
        ? Math.round((data.bookingCount / totalRoomsCount) * 100)
        : 0;
      
      roomUtilization.push({
        roomName: data.room.name,
        utilizationRate: data.utilization,
        totalBookings: data.bookingCount,
        bookingPercentage: bookingPercentage
      });
    });

    const utilizationRate = rooms.length > 0 ? Math.round(totalUtilization / rooms.length) : 0;

    // Get peak usage hour
    const peakHourData = await Booking.aggregate([
      {
        $match: {
          startTime: { $gte: start, $lte: end },
          status: 'confirmed'
        }
      },
      {
        $project: {
          hour: { $hour: '$startTime' }
        }
      },
      {
        $group: {
          _id: '$hour',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 1
      }
    ]);

    const peakUsage = peakHourData.length > 0 ? 
      `${peakHourData[0]._id}:00` : 'N/A';

    // Weekly utilization data
    const weeklyUtilization = [];
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    for (let i = 0; i < 7; i++) {
      const dayStart = moment().startOf('week').add(i, 'days').toDate();
      const dayEnd = moment().startOf('week').add(i, 'days').endOf('day').toDate();
      
      const dayBookings = await Booking.countDocuments({
        startTime: { $gte: dayStart, $lte: dayEnd },
        status: 'confirmed'
      });
      
      const maxPossibleBookings = totalRooms * 10; // 10 possible slots per room per day
      const dayUtilization = maxPossibleBookings > 0 ? 
        Math.round((dayBookings / maxPossibleBookings) * 100) : 0;
      
      weeklyUtilization.push({
        day: weekDays[i],
        utilization: dayUtilization
      });
    }

    // Popular time slots
    const timeSlotData = await Booking.aggregate([
      {
        $match: {
          startTime: { $gte: start, $lte: end },
          status: 'confirmed'
        }
      },
      {
        $project: {
          hour: { $hour: '$startTime' }
        }
      },
      {
        $group: {
          _id: '$hour',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 4
      }
    ]);

    const popularTimeSlots = timeSlotData.map(slot => ({
      timeSlot: `${slot._id}:00 - ${slot._id + 1}:00`,
      count: slot.count
    }));

    // Booking frequency by type
    const recurringBookings = await Booking.countDocuments({
      startTime: { $gte: start, $lte: end },
      status: 'confirmed',
      recurrenceGroup: { $exists: true }
    });

    const singleBookings = totalBookings - recurringBookings;
    
    const bookingFrequency = [
      {
        type: 'Single Bookings',
        count: singleBookings,
        percentage: totalBookings > 0 ? Math.round((singleBookings / totalBookings) * 100) : 0
      },
      {
        type: 'Recurring Bookings',
        count: recurringBookings,
        percentage: totalBookings > 0 ? Math.round((recurringBookings / totalBookings) * 100) : 0
      }
    ];

    // Debug logging
    console.log('Analytics Query:', { startDate, endDate, start, end });
    console.log('Analytics Results:', {
      totalRooms,
      activeBookings,
      utilizationRate,
      totalBookings,
      weeklyUtilizationCount: weeklyUtilization.length,
      roomUtilizationCount: roomUtilization.length,
      popularTimeSlotsCount: popularTimeSlots.length
    });

    res.status(200).json({
      success: true,
      data: {
        totalRooms,
        activeBookings,
        utilizationRate,
        totalBookings,
        peakUsage,
        weeklyUtilization,
        roomUtilization: roomUtilization.sort((a, b) => b.utilizationRate - a.utilizationRate),
        popularTimeSlots,
        bookingFrequency
      }
    });
  } catch (error) {
    console.error('Analytics error:', error);
    next(error);
  }
};

// @desc    Get all analytics data (combined)
// @route   GET /api/analytics
// @access  Private/Admin
exports.getAllAnalytics = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate) : moment().subtract(30, 'days').toDate();
    const end = endDate ? new Date(endDate) : new Date();

    // Total bookings
    const totalBookings = await Booking.countDocuments({
      createdAt: { $gte: start, $lte: end }
    });

    // Bookings by status
    const bookingsByStatus = await Booking.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Most popular rooms
    const mostPopularRooms = await Booking.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
          status: { $in: ['confirmed', 'completed'] }
        }
      },
      {
        $group: {
          _id: '$room',
          bookingCount: { $sum: 1 },
          totalHours: {
            $sum: {
              $divide: [
                { $subtract: ['$endTime', '$startTime'] },
                3600000
              ]
            }
          }
        }
      },
      {
        $sort: { bookingCount: -1 }
      },
      {
        $limit: 10
      },
      {
        $lookup: {
          from: 'rooms',
          localField: '_id',
          foreignField: '_id',
          as: 'roomData'
        }
      },
      {
        $unwind: '$roomData'
      },
      {
        $project: {
          _id: 0,
          name: '$roomData.name',
          location: '$roomData.location',
          bookingCount: 1,
          totalHours: { $round: ['$totalHours', 2] }
        }
      }
    ]);

    // Peak booking hours
    const peakHours = await Booking.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
          status: { $in: ['confirmed', 'completed'] }
        }
      },
      {
        $project: {
          hour: { $hour: '$startTime' }
        }
      },
      {
        $group: {
          _id: '$hour',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      },
      {
        $project: {
          _id: 0,
          hour: '$_id',
          count: 1
        }
      }
    ]);

    // Room utilization
    const rooms = await Room.find({ isActive: true });
    
    const roomUtilization = await Promise.all(
      rooms.map(async (room) => {
        const bookings = await Booking.find({
          room: room._id,
          createdAt: { $gte: start, $lte: end },
          status: { $in: ['confirmed', 'completed'] }
        });

        const totalBookedMinutes = bookings.reduce((sum, booking) => {
          const duration = (booking.endTime - booking.startTime) / 60000;
          return sum + duration;
        }, 0);

        const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
        const totalAvailableMinutes = days * 10 * 60;

        const utilizationRate = totalAvailableMinutes > 0
          ? parseFloat(((totalBookedMinutes / totalAvailableMinutes) * 100).toFixed(2))
          : 0;

        return {
          roomName: room.name,
          location: room.location,
          totalBookings: bookings.length,
          totalHours: parseFloat((totalBookedMinutes / 60).toFixed(2)),
          utilizationRate
        };
      })
    );

    // Top users
    const topUsers = await Booking.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
          status: { $in: ['confirmed', 'completed'] }
        }
      },
      {
        $group: {
          _id: '$bookedBy',
          bookingCount: { $sum: 1 },
          totalHours: {
            $sum: {
              $divide: [
                { $subtract: ['$endTime', '$startTime'] },
                3600000
              ]
            }
          }
        }
      },
      {
        $sort: { bookingCount: -1 }
      },
      {
        $limit: 10
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userData'
        }
      },
      {
        $unwind: '$userData'
      },
      {
        $project: {
          _id: 0,
          name: '$userData.name',
          email: '$userData.email',
          department: '$userData.department',
          bookingCount: 1,
          totalHours: { $round: ['$totalHours', 2] }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalBookings,
        bookingsByStatus,
        mostPopularRooms,
        peakHours,
        roomUtilization: roomUtilization.sort((a, b) => b.utilizationRate - a.utilizationRate),
        topUsers
      }
    });
  } catch (error) {
    console.error('Analytics error:', error);
    next(error);
  }
};

// @desc    Get analytics dashboard data
// @route   GET /api/analytics/dashboard
// @access  Private/Admin
exports.getDashboardAnalytics = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate) : moment().subtract(30, 'days').toDate();
    const end = endDate ? new Date(endDate) : new Date();

    // Total bookings
    const totalBookings = await Booking.countDocuments({
      startTime: { $gte: start, $lte: end },
      status: 'confirmed'
    });

    // Bookings by status
    const bookingsByStatus = await Booking.aggregate([
      {
        $match: {
          startTime: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Most popular rooms
    const popularRooms = await Booking.aggregate([
      {
        $match: {
          startTime: { $gte: start, $lte: end },
          status: 'confirmed'
        }
      },
      {
        $group: {
          _id: '$room',
          bookingCount: { $sum: 1 },
          totalHours: {
            $sum: {
              $divide: [
                { $subtract: ['$endTime', '$startTime'] },
                3600000 // Convert milliseconds to hours
              ]
            }
          }
        }
      },
      {
        $sort: { bookingCount: -1 }
      },
      {
        $limit: 5
      },
      {
        $lookup: {
          from: 'rooms',
          localField: '_id',
          foreignField: '_id',
          as: 'room'
        }
      },
      {
        $unwind: '$room'
      },
      {
        $project: {
          roomName: '$room.name',
          location: '$room.location',
          bookingCount: 1,
          totalHours: { $round: ['$totalHours', 2] }
        }
      }
    ]);

    // Peak booking hours
    const peakHours = await Booking.aggregate([
      {
        $match: {
          startTime: { $gte: start, $lte: end },
          status: 'confirmed'
        }
      },
      {
        $project: {
          hour: { $hour: '$startTime' }
        }
      },
      {
        $group: {
          _id: '$hour',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // Bookings trend (daily)
    const bookingsTrend = await Booking.aggregate([
      {
        $match: {
          startTime: { $gte: start, $lte: end },
          status: 'confirmed'
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$startTime' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalBookings,
        bookingsByStatus,
        popularRooms,
        peakHours,
        bookingsTrend,
        dateRange: { start, end }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get room utilization rates
// @route   GET /api/analytics/utilization
// @access  Private/Admin
exports.getRoomUtilization = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate) : moment().subtract(30, 'days').toDate();
    const end = endDate ? new Date(endDate) : new Date();

    const rooms = await Room.find({ isActive: true });
    
    const utilizationData = await Promise.all(
      rooms.map(async (room) => {
        const bookings = await Booking.find({
          room: room._id,
          startTime: { $gte: start, $lte: end },
          status: 'confirmed'
        });

        // Calculate total booked hours
        const totalBookedMinutes = bookings.reduce((sum, booking) => {
          const duration = (booking.endTime - booking.startTime) / 60000; // Convert to minutes
          return sum + duration;
        }, 0);

        // Calculate available hours (8 AM to 6 PM = 10 hours/day)
        const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
        const totalAvailableMinutes = days * 10 * 60; // 10 hours * 60 minutes

        const utilizationRate = totalAvailableMinutes > 0
          ? ((totalBookedMinutes / totalAvailableMinutes) * 100).toFixed(2)
          : 0;

        return {
          roomId: room._id,
          roomName: room.name,
          location: room.location,
          capacity: room.capacity,
          totalBookings: bookings.length,
          totalBookedHours: (totalBookedMinutes / 60).toFixed(2),
          utilizationRate: parseFloat(utilizationRate)
        };
      })
    );

    // Sort by utilization rate
    utilizationData.sort((a, b) => b.utilizationRate - a.utilizationRate);

    res.status(200).json({
      success: true,
      data: utilizationData,
      dateRange: { start, end }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get booking frequency by time slot
// @route   GET /api/analytics/time-slots
// @access  Private/Admin
exports.getTimeSlotPopularity = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate) : moment().subtract(30, 'days').toDate();
    const end = endDate ? new Date(endDate) : new Date();

    const timeSlots = await Booking.aggregate([
      {
        $match: {
          startTime: { $gte: start, $lte: end },
          status: 'confirmed'
        }
      },
      {
        $project: {
          hour: { $hour: '$startTime' },
          dayOfWeek: { $dayOfWeek: '$startTime' } // 1 = Sunday, 2 = Monday, etc.
        }
      },
      {
        $group: {
          _id: {
            hour: '$hour',
            dayOfWeek: '$dayOfWeek'
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.dayOfWeek': 1, '_id.hour': 1 }
      }
    ]);

    // Format data for frontend
    const formattedData = timeSlots.map(slot => ({
      hour: slot._id.hour,
      dayOfWeek: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][slot._id.dayOfWeek - 1],
      count: slot.count
    }));

    res.status(200).json({
      success: true,
      data: formattedData,
      dateRange: { start, end }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user booking statistics
// @route   GET /api/analytics/user-stats
// @access  Private/Admin
exports.getUserStats = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate) : moment().subtract(30, 'days').toDate();
    const end = endDate ? new Date(endDate) : new Date();

    const userStats = await Booking.aggregate([
      {
        $match: {
          startTime: { $gte: start, $lte: end },
          status: 'confirmed'
        }
      },
      {
        $group: {
          _id: '$bookedBy',
          totalBookings: { $sum: 1 },
          totalHours: {
            $sum: {
              $divide: [
                { $subtract: ['$endTime', '$startTime'] },
                3600000
              ]
            }
          }
        }
      },
      {
        $sort: { totalBookings: -1 }
      },
      {
        $limit: 10
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: '$user'
      },
      {
        $project: {
          userName: '$user.name',
          userEmail: '$user.email',
          department: '$user.department',
          totalBookings: 1,
          totalHours: { $round: ['$totalHours', 2] }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: userStats,
      dateRange: { start, end }
    });
  } catch (error) {
    next(error);
  }
};
