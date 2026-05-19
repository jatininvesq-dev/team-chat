const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const serverless = require('serverless-http');
const app = require('../../app');
const { connectDatabase } = require('../../config/db');

const serverlessHandler = serverless(app);

function normalizeEventPath(event) {
  const prefix = '/.netlify/functions/api';
  let routePath = event.path || '/';

  if (routePath.startsWith(prefix)) {
    routePath = routePath.slice(prefix.length) || '/';
  }

  if (!routePath.startsWith('/api') && routePath !== '/') {
    routePath = `/api${routePath.startsWith('/') ? routePath : `/${routePath}`}`;
  }

  event.path = routePath;

  if (event.rawUrl) {
    try {
      const url = new URL(event.rawUrl);
      url.pathname = routePath;
      event.rawUrl = url.toString();
    } catch {
      // ignore malformed rawUrl
    }
  }

  return event;
}

exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  normalizeEventPath(event);

  try {
    await connectDatabase();
  } catch (err) {
    console.error('Database connection failed:', err.message);
    return {
      statusCode: 503,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: err.message || 'Database connection failed.',
      }),
    };
  }

  return serverlessHandler(event, context);
};
