// Import necessary modules
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');

// Initialize Express app
const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(bodyParser.json());
app.use(
  session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.initialize());
app.use(passport.session());

// MongoDB connection
mongoose.connect('mongodb://localhost/waste_tracking', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// User model
const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  password: String,
  location: {
    type: { type: String },
    coordinates: [Number],
  },
});

userSchema.index({ location: '2dsphere' });
const User = mongoose.model('User', userSchema);

// Recycling Facility model
const recyclingFacilitySchema = new mongoose.Schema({
  name: String,
  location: {
    type: { type: String },
    coordinates: [Number],
  },
});

recyclingFacilitySchema.index({ location: '2dsphere' });
const RecyclingFacility = mongoose.model('RecyclingFacility', recyclingFacilitySchema);

// Passport local strategy for authentication
passport.use(
  new LocalStrategy(async (username, password, done) => {
    try {
      const user = await User.findOne({ username: username });

      if (!user || !bcrypt.compareSync(password, user.password)) {
        return done(null, false, { message: 'Incorrect username or password' });
      }

      return done(null, user);
    } catch (error) {
      return done(error);
    }
  })
);

// Passport serialization and deserialization
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error);
  }
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

// User login route
app.post('/api/user/login', passport.authenticate('local'), (req, res) => {
  res.json(req.user);
});

// User registration route with validation
app.post(
  '/api/user/register',
  [
    body('username').notEmpty().isLength({ min: 3 }),
    body('email').isEmail(),
    body('password').isLength({ min: 6 }),
  ],
  async (req, res) => {
    // Validate request body
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const hashedPassword = bcrypt.hashSync(req.body.password, 10);
      const newUser = new User({
        username: req.body.username,
        email: req.body.email,
        password: hashedPassword,
        location: {
          type: 'Point',
          coordinates: [req.body.longitude, req.body.latitude],
        },
      });

      const savedUser = await newUser.save();
      res.json(savedUser);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Recycling facilities route
app.get('/api/recycling-facilities', async (req, res) => {
  try {
    const { latitude, longitude } = req.query;

    // Example: Fetch recycling facilities within a certain radius from the given location
    const radiusInKilometers = 1000; // Adjust this value based on your requirements

    const facilities = await RecyclingFacility.find({
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)],
          },
          $maxDistance: radiusInKilometers * 1000, // Convert kilometers to meters
        },
      },
    });

    res.json({ facilities });
  } catch (error) {
    console.error('Error fetching recycling facilities:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// User logout route
app.get('/api/user/logout', (req, res) => {
  req.logout();
  res.json({ message: 'Logout successful' });
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
