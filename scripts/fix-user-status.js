const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const dns = require('dns');
const User = require('../models/User');

dns.setServers(['8.8.8.8', '1.1.1.1']);

dotenv.config({ path: path.join(__dirname, '../.env') });

async function fixUserStatus() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const result = await User.updateMany(
      { isOnline: { $exists: false } },
      { $set: { isOnline: false, lastSeen: new Date() } }
    );

    console.log(`Updated ${result.modifiedCount} users.`);
    process.exit(0);
  } catch (error) {
    console.error('Error fixing user status:', error);
    process.exit(1);
  }
}

fixUserStatus();
