# room-booking-system-backend

Backend API for Room Booking Lite - A modern meeting room booking system.

## 🚀 Features

- **User Authentication** - JWT-based authentication with role-based access
- **Room Management** - CRUD operations for meeting rooms
- **Booking System** - Create, view, cancel, and manage bookings
- **Real-time Notifications** - Socket.io for live updates
- **Analytics Dashboard** - Comprehensive booking analytics
- **Email Notifications** - Automated booking confirmations
- **Recurring Bookings** - Support for recurring meeting patterns
- **Admin Controls** - Administrative oversight and management

## 🛠 Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB with Mongoose ODM
- **Authentication:** JWT (JSON Web Tokens)
- **Real-time:** Socket.io
- **Email:** Nodemailer
- **Validation:** express-validator
- **Security:** Helmet, CORS, bcryptjs
- **File Upload:** Multer
- **Date Handling:** Moment.js

## 📦 Installation

```bash
# Clone the repository
git clone https://github.com/agalyas04/room-booking-system-backend.git

# Navigate to project directory
cd room-booking-system-backend

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env with your configuration
# Add your MongoDB URI, JWT secret, etc.

# Start development server
npm run dev
```

## 🔧 Environment Variables

Create a `.env` file in the root directory:

```env
# Database
MONGO_URI=mongodb://localhost:27017/room-booking-lite

# JWT Configuration
JWT_SECRET=your-super-secure-jwt-secret-key
JWT_EXPIRE=30d

# Server Configuration
NODE_ENV=development
PORT=5000

# Email Configuration (Optional)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=noreply@roombookinglite.com
```

## 🚀 Deployment

For deployment configuration, see `backendDeploy.env` for platform-specific environment variables.

### Recommended Platforms:
- **Railway** - railway.app
- **Heroku** - heroku.com
- **Render** - render.com

## 📚 API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/updatedetails` - Update user details
- `PUT /api/auth/updatepassword` - Update password

### Room Endpoints
- `GET /api/rooms` - Get all rooms
- `GET /api/rooms/:id` - Get single room
- `POST /api/rooms` - Create room (Admin)
- `DELETE /api/rooms/:id` - Delete room (Admin)
- `GET /api/rooms/:id/availability` - Check room availability

### Booking Endpoints
- `GET /api/bookings` - Get all bookings (Admin) / user bookings
- `GET /api/bookings/my-bookings` - Get user's bookings
- `POST /api/bookings` - Create booking
- `PUT /api/bookings/:id/cancel` - Cancel booking
- `DELETE /api/bookings/:id` - Delete booking (Admin)

### Analytics Endpoints
- `GET /api/analytics` - Get booking analytics (Admin)

### Notification Endpoints
- `GET /api/notifications` - Get user notifications
- `PUT /api/notifications/:id/read` - Mark notification as read

## 🏗 Project Structure

```
backend/
├── controllers/         # Request handlers
├── middleware/         # Custom middleware
├── models/            # Database models
├── routes/            # API routes
├── utils/             # Utility functions
├── scripts/           # Database seeding scripts
├── uploads/           # File uploads directory
├── server.js          # Main server file
└── package.json       # Dependencies and scripts
```

## 🔐 Security Features

- **JWT Authentication** - Secure token-based authentication
- **Password Hashing** - bcryptjs for password security
- **CORS Protection** - Configurable cross-origin requests
- **Rate Limiting** - Prevent API abuse
- **Input Validation** - express-validator for data validation
- **Security Headers** - Helmet.js for security headers

## 🧪 Development

```bash
# Start development server with hot reload
npm run dev

# Run database seeding
npm run seed

# Check for linting issues
npm run lint
```

## 📄 License

This project is licensed under the MIT License.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📞 Support

For support and questions, please open an issue on GitHub.

---

**Room Booking Lite Backend** - Built with ❤️ for efficient meeting room management.
