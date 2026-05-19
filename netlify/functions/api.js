const serverless = require('serverless-http');
const app = require('../../app');
const { connectDatabase } = require('../../config/db');

const serverlessHandler = serverless(app);

/** Map Netlify function path back to Express /api/* routes */
function normalizeEventPath(event) {
  const prefix = '/.netlify/functions/api';
  let path = event.path || '/';

  if (path.startsWith(prefix)) {
    path = path.slice(prefix.length) || '/';
  }

  if (!path.startsWith('/api') && path !== '/') {
    path = `/api${path.startsWith('/') ? path : `/${path}`}`;
  }

  event.path = path;

  if (event.rawUrl) {
    try {
      const url = new URL(event.rawUrl);
      url.pathname = path;
      event.rawUrl = url.toString();
    } catch {
      // ignore malformed rawUrl
    }
  }

  return event;
}

exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  await connectDatabase();
  normalizeEventPath(event);

  return serverlessHandler(event, context);
};
