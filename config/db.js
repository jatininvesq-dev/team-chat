const mongoose = require('mongoose');

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

const MONGO_OPTIONS = {
  serverSelectionTimeoutMS: 8000,
  connectTimeoutMS: 8000,
  socketTimeoutMS: 10000,
  maxPoolSize: 1,
};

async function connectDatabase() {
  const MONGODB_URI = process.env.MONGODB_URI;

  if (!MONGODB_URI) {
    throw new Error(
      'MONGODB_URI is not set. Add it in Netlify: Site configuration → Environment variables (scope: All or Production), then redeploy.'
    );
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGODB_URI, MONGO_OPTIONS)
      .then((mongooseInstance) => {
        console.log('Connected to MongoDB');
        return mongooseInstance;
      })
      .catch((err) => {
        cached.promise = null;
        cached.conn = null;

        if (err.name === 'MongooseServerSelectionError' || err.message?.includes('timed out')) {
          throw new Error(
            'Cannot reach MongoDB. In MongoDB Atlas: Network Access → Add IP Address → Allow access from anywhere (0.0.0.0/0), wait 1–2 minutes, then try again.'
          );
        }
        throw err;
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

module.exports = { connectDatabase };
