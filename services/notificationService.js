const Notification = require('../models/Notification');
const User = require('../models/User');
const Booking = require('../models/Booking');

class NotificationService {
  
  // Notify all admins about user actions
  static async notifyAdminsOfUserAction(actionType, actionData, performedBy) {
    try {
      // Get all admin users
      const admins = await User.find({ role: 'admin' });
      
      const notifications = [];
      
      for (const admin of admins) {
        // Don't notify admin of their own actions
        if (admin._id.toString() === performedBy._id.toString()) {
          continue;
        }
        
        let title, message;
        
        switch (actionType) {
          case 'booking_created':
            title = 'New Booking Created';
            message = `${performedBy.name} created a new booking: "${actionData.title}" in ${actionData.roomName}`;
            break;
          case 'booking_cancelled':
            title = 'Booking Cancelled';
            message = `${performedBy.name} cancelled their booking: "${actionData.title}"`;
            break;
          case 'booking_updated':
            title = 'Booking Updated';
            message = `${performedBy.name} updated their booking: "${actionData.title}"`;
            break;
          case 'user_registered':
            title = 'New User Registration';
            message = `${performedBy.name} (${performedBy.email}) has registered`;
            break;
          default:
            title = 'User Activity';
            message = `${performedBy.name} performed an action: ${actionType}`;
        }
        
        notifications.push({
          user: admin._id,
          type: 'user_action_alert',
          title,
          message,
          booking: actionData.bookingId || null,
          room: actionData.roomId || null
        });
      }
      
      if (notifications.length > 0) {
        await Notification.insertMany(notifications);
      }
      
    } catch (error) {
      console.error('Error notifying admins:', error);
    }
  }
  
  // Notify attendees about meeting scheduled
  static async notifyAttendeesOfMeeting(booking, organizer) {
    try {
      if (!booking.attendees || booking.attendees.length === 0) {
        return;
      }
      
      const notifications = [];
      
      for (const attendeeId of booking.attendees) {
        // Don't notify the organizer
        if (attendeeId.toString() === organizer._id.toString()) {
          continue;
        }
        
        notifications.push({
          user: attendeeId,
          type: 'meeting_scheduled',
          title: 'Meeting Invitation',
          message: `You have been invited to "${booking.title}" by ${organizer.name}. Meeting scheduled for ${new Date(booking.startTime).toLocaleString()} in ${booking.room.name}`,
          booking: booking._id,
          room: booking.room
        });
      }
      
      if (notifications.length > 0) {
        await Notification.insertMany(notifications);
      }
      
    } catch (error) {
      console.error('Error notifying attendees:', error);
    }
  }
  
  // Notify attendees about meeting updates
  static async notifyAttendeesOfMeetingUpdate(booking, organizer, updateType = 'updated') {
    try {
      if (!booking.attendees || booking.attendees.length === 0) {
        return;
      }
      
      const notifications = [];
      let title, message;
      
      switch (updateType) {
        case 'cancelled':
          title = 'Meeting Cancelled';
          message = `The meeting "${booking.title}" organized by ${organizer.name} has been cancelled.`;
          break;
        case 'updated':
          title = 'Meeting Updated';
          message = `The meeting "${booking.title}" organized by ${organizer.name} has been updated.`;
          break;
        case 'rescheduled':
          title = 'Meeting Rescheduled';
          message = `The meeting "${booking.title}" organized by ${organizer.name} has been rescheduled to ${new Date(booking.startTime).toLocaleString()}`;
          break;
        default:
          title = 'Meeting Update';
          message = `The meeting "${booking.title}" organized by ${organizer.name} has been modified.`;
      }
      
      for (const attendeeId of booking.attendees) {
        // Don't notify the organizer
        if (attendeeId.toString() === organizer._id.toString()) {
          continue;
        }
        
        notifications.push({
          user: attendeeId,
          type: 'booking_updated',
          title,
          message,
          booking: booking._id,
          room: booking.room
        });
      }
      
      if (notifications.length > 0) {
        await Notification.insertMany(notifications);
      }
      
    } catch (error) {
      console.error('Error notifying attendees of update:', error);
    }
  }
  
  // Notify user about their booking status
  static async notifyUserOfBookingStatus(userId, booking, status, additionalMessage = '') {
    try {
      let title, message;
      
      switch (status) {
        case 'confirmed':
          title = 'Booking Confirmed';
          message = `Your booking "${booking.title}" has been confirmed.`;
          break;
        case 'cancelled':
          title = 'Booking Cancelled';
          message = `Your booking "${booking.title}" has been cancelled. ${additionalMessage}`;
          break;
        case 'admin_override':
          title = 'Booking Cancelled by Admin';
          message = `Your booking "${booking.title}" has been cancelled due to an admin override. ${additionalMessage}`;
          break;
        default:
          title = 'Booking Update';
          message = `Your booking "${booking.title}" status has been updated to ${status}.`;
      }
      
      await Notification.create({
        user: userId,
        type: status === 'admin_override' ? 'admin_override' : 'booking_updated',
        title,
        message,
        booking: booking._id,
        room: booking.room
      });
      
    } catch (error) {
      console.error('Error notifying user of booking status:', error);
    }
  }
  
  // Notify admins about room management actions
  static async notifyAdminsOfRoomAction(actionType, roomData, performedBy) {
    try {
      const admins = await User.find({ role: 'admin' });
      const notifications = [];
      
      for (const admin of admins) {
        // Don't notify admin of their own actions
        if (admin._id.toString() === performedBy._id.toString()) {
          continue;
        }
        
        let title, message;
        
        switch (actionType) {
          case 'room_created':
            title = 'New Room Created';
            message = `${performedBy.name} created a new room: "${roomData.name}" at ${roomData.location}`;
            break;
          case 'room_updated':
            title = 'Room Updated';
            message = `${performedBy.name} updated room: "${roomData.name}"`;
            break;
          case 'room_deleted':
            title = 'Room Deleted';
            message = `${performedBy.name} deleted room: "${roomData.name}"`;
            break;
          default:
            title = 'Room Management';
            message = `${performedBy.name} performed room action: ${actionType}`;
        }
        
        notifications.push({
          user: admin._id,
          type: actionType,
          title,
          message,
          room: roomData._id || null
        });
      }
      
      if (notifications.length > 0) {
        await Notification.insertMany(notifications);
      }
      
    } catch (error) {
      console.error('Error notifying admins of room action:', error);
    }
  }
  
  // Send reminder notifications
  static async sendBookingReminders() {
    try {
      const now = new Date();
      const reminderTime = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes from now
      
      const upcomingBookings = await Booking.find({
        startTime: {
          $gte: now,
          $lte: reminderTime
        },
        status: 'confirmed'
      }).populate('bookedBy attendees room');
      
      const notifications = [];
      
      for (const booking of upcomingBookings) {
        // Check if reminder already sent
        const existingReminder = await Notification.findOne({
          booking: booking._id,
          type: 'booking_reminder'
        });
        
        if (existingReminder) continue;
        
        // Notify organizer
        notifications.push({
          user: booking.bookedBy._id,
          type: 'booking_reminder',
          title: 'Upcoming Meeting Reminder',
          message: `Your meeting "${booking.title}" starts in 30 minutes at ${booking.room.name}`,
          booking: booking._id,
          room: booking.room._id
        });
        
        // Notify attendees
        for (const attendee of booking.attendees) {
          if (attendee._id.toString() !== booking.bookedBy._id.toString()) {
            notifications.push({
              user: attendee._id,
              type: 'booking_reminder',
              title: 'Upcoming Meeting Reminder',
              message: `Meeting "${booking.title}" starts in 30 minutes at ${booking.room.name}`,
              booking: booking._id,
              room: booking.room._id
            });
          }
        }
      }
      
      if (notifications.length > 0) {
        await Notification.insertMany(notifications);
      }
      
    } catch (error) {
      console.error('Error sending booking reminders:', error);
    }
  }
}

module.exports = NotificationService;
