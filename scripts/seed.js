require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Room = require('../models/Room');
const Booking = require('../models/Booking');
const Notification = require('../models/Notification');

// Sample data
const users = [
  {
    name: 'Admin User',
    email: 'admin@roombooking.com',
    password: 'admin123',
    role: 'admin',
    department: 'IT',
    phoneNumber: '+1234567890'
  },
  {
    name: 'John Doe',
    email: 'john.doe@company.com',
    password: 'password123',
    role: 'employee',
    department: 'Engineering',
    phoneNumber: '+1234567891'
  },
  {
    name: 'Jane Smith',
    email: 'jane.smith@company.com',
    password: 'password123',
    role: 'employee',
    department: 'Marketing',
    phoneNumber: '+1234567892'
  },
  {
    name: 'Mike Johnson',
    email: 'mike.johnson@company.com',
    password: 'password123',
    role: 'employee',
    department: 'Sales',
    phoneNumber: '+1234567893'
  },
  {
    name: 'Sarah Williams',
    email: 'sarah.williams@company.com',
    password: 'password123',
    role: 'employee',
    department: 'HR',
    phoneNumber: '+1234567894'
  }
];

const rooms = [
  {
    name: 'Conference Room A',
    location: 'Floor 1, Wing A',
    capacity: 10,
    amenities: ['Projector', 'Whiteboard', 'Video Conference', 'WiFi'],
    description: 'Large conference room perfect for team meetings',
    floor: 1,
    imageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c'
  },
  {
    name: 'Conference Room B',
    location: 'Floor 1, Wing B',
    capacity: 8,
    amenities: ['TV Screen', 'Whiteboard', 'WiFi'],
    description: 'Medium-sized meeting room',
    floor: 1,
    imageUrl: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2'
  },
  {
    name: 'Executive Boardroom',
    location: 'Floor 2, Executive Suite',
    capacity: 15,
    amenities: ['Projector', 'Video Conference', 'Premium Furniture', 'WiFi', 'Coffee Machine'],
    description: 'Premium boardroom for executive meetings',
    floor: 2,
    imageUrl: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72'
  },
  {
    name: 'Meeting Pod 1',
    location: 'Floor 3, Open Area',
    capacity: 4,
    amenities: ['Whiteboard', 'WiFi'],
    description: 'Small meeting pod for quick discussions',
    floor: 3,
    imageUrl: 'https://images.unsplash.com/photo-1556761175-4b46a572b786'
  },
  {
    name: 'Meeting Pod 2',
    location: 'Floor 3, Open Area',
    capacity: 4,
    amenities: ['TV Screen', 'WiFi'],
    description: 'Compact meeting space',
    floor: 3,
    imageUrl: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7'
  },
  {
    name: 'Training Room',
    location: 'Floor 2, Wing C',
    capacity: 20,
    amenities: ['Projector', 'Whiteboard', 'Sound System', 'WiFi', 'Microphone'],
    description: 'Large training and presentation room',
    floor: 2,
    imageUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87'
  },
  {
    name: 'Innovation Lab',
    location: 'Floor 4, Innovation Center',
    capacity: 12,
    amenities: ['Interactive Whiteboard', 'Video Conference', 'WiFi', 'Standing Desks'],
    description: 'Creative space for brainstorming sessions',
    floor: 4,
    imageUrl: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36'
  }
];

// Connect to database
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const seedData = async () => {
  try {
    console.log('🌱 Starting seed process...');

    // Clear existing data
    console.log('🗑️  Clearing existing data...');
    await User.deleteMany();
    await Room.deleteMany();
    await Booking.deleteMany();
    await Notification.deleteMany();

    // Create users
    console.log('👥 Creating users...');
    const createdUsers = await User.create(users);
    console.log(`✅ Created ${createdUsers.length} users`);

    // Create rooms
    console.log('🏢 Creating rooms...');
    const createdRooms = await Room.create(rooms);
    console.log(`✅ Created ${createdRooms.length} rooms`);

    // Create sample bookings
    console.log('📅 Creating sample bookings...');
    const bookings = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Create bookings for the next 7 days
    for (let day = 0; day < 7; day++) {
      const bookingDate = new Date(today);
      bookingDate.setDate(today.getDate() + day);

      // Create 3-5 random bookings per day
      const bookingsPerDay = Math.floor(Math.random() * 3) + 3;
      
      for (let i = 0; i < bookingsPerDay; i++) {
        const randomRoom = createdRooms[Math.floor(Math.random() * createdRooms.length)];
        const randomUser = createdUsers.filter(u => u.role === 'employee')[Math.floor(Math.random() * (createdUsers.length - 1))];
        
        // Random start hour between 9 AM and 4 PM
        const startHour = Math.floor(Math.random() * 8) + 9;
        const duration = [1, 2, 3][Math.floor(Math.random() * 3)]; // 1-3 hours
        
        const startTime = new Date(bookingDate);
        startTime.setHours(startHour, 0, 0, 0);
        
        const endTime = new Date(startTime);
        endTime.setHours(startTime.getHours() + duration);

        bookings.push({
          room: randomRoom._id,
          bookedBy: randomUser._id,
          title: ['Team Standup', 'Client Meeting', 'Project Review', 'Training Session', 'Strategy Discussion'][Math.floor(Math.random() * 5)],
          description: 'Sample booking created by seed script',
          startTime,
          endTime,
          attendees: createdUsers.filter(u => u.role === 'employee').slice(0, Math.floor(Math.random() * 3) + 1).map(u => u._id),
          status: 'confirmed'
        });
      }
    }

    const createdBookings = await Booking.create(bookings);
    console.log(`✅ Created ${createdBookings.length} bookings`);

    // Create sample notifications
    console.log('🔔 Creating sample notifications...');
    const notifications = createdUsers.filter(u => u.role === 'employee').map(user => ({
      user: user._id,
      type: 'booking_created',
      title: 'Welcome to Room Booking Lite',
      message: 'Your account has been created. You can now start booking meeting rooms!',
      isRead: false
    }));

    const createdNotifications = await Notification.create(notifications);
    console.log(`✅ Created ${createdNotifications.length} notifications`);

    console.log('\n✨ Seed completed successfully!');
    console.log('\n📋 Login Credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Admin:');
    console.log('  Email: admin@roombooking.com');
    console.log('  Password: admin123');
    console.log('\nEmployees:');
    createdUsers.filter(u => u.role === 'employee').forEach(user => {
      console.log(`  Email: ${user.email}`);
      console.log(`  Password: password123`);
    });
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  }
};

seedData();
