const nodemailer = require('nodemailer'); // Email service

// Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Send email function
exports.sendEmail = async (options) => {
  try {
    const message = {
      from: `${process.env.EMAIL_FROM} <${process.env.EMAIL_USER}>`,
      to: options.email,
      subject: options.subject,
      html: options.html
    };

    const info = await transporter.sendMail(message);
    console.log('Email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

// Email templates
exports.bookingCreatedEmail = (booking, room, user) => {
  return `
    <h2>Booking Confirmation</h2>
    <p>Dear ${user.name},</p>
    <p>Your booking has been confirmed!</p>
    <h3>Booking Details:</h3>
    <ul>
      <li><strong>Room:</strong> ${room.name} (${room.location})</li>
      <li><strong>Title:</strong> ${booking.title}</li>
      <li><strong>Start:</strong> ${new Date(booking.startTime).toLocaleString()}</li>
      <li><strong>End:</strong> ${new Date(booking.endTime).toLocaleString()}</li>
    </ul>
    <p>Thank you for using Room Booking Lite!</p>
  `;
};

exports.bookingCancelledEmail = (booking, room, user) => {
  return `
    <h2>Booking Cancelled</h2>
    <p>Dear ${user.name},</p>
    <p>Your booking has been cancelled.</p>
    <h3>Booking Details:</h3>
    <ul>
      <li><strong>Room:</strong> ${room.name} (${room.location})</li>
      <li><strong>Title:</strong> ${booking.title}</li>
      <li><strong>Originally scheduled:</strong> ${new Date(booking.startTime).toLocaleString()} - ${new Date(booking.endTime).toLocaleString()}</li>
      ${booking.cancellationReason ? `<li><strong>Reason:</strong> ${booking.cancellationReason}</li>` : ''}
    </ul>
    <p>Thank you for using Room Booking Lite!</p>
  `;
};
