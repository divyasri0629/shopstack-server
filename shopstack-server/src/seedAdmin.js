// Usage: ADMIN_EMAIL=you@x.com ADMIN_PASSWORD=secret node src/seedAdmin.js
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  await User.create({ name: 'Admin', email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD, role: 'admin' });
  console.log('Admin created'); process.exit(0);
})();
