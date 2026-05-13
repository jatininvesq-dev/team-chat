const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  throw new Error('MONGODB_URI is required in environment variables');
}

async function initCollections() {
  await mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();
  const existingNames = collections.map((c) => c.name);

  if (!existingNames.includes('users')) {
    await db.createCollection('users');
    console.log('Created users collection');
  } else {
    console.log('users collection already exists');
  }

  if (!existingNames.includes('messages')) {
    await db.createCollection('messages');
    console.log('Created messages collection');
  } else {
    console.log('messages collection already exists');
  }

  await mongoose.disconnect();
  console.log('Database initialization complete');
}

initCollections().catch((error) => {
  console.error('Failed to initialize database:', error);
  process.exit(1);
});
