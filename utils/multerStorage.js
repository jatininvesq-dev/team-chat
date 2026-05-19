const multer = require('multer');
const path = require('path');
const os = require('os');
const fs = require('fs');

function isServerless() {
  return Boolean(
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.LAMBDA_TASK_ROOT ||
    process.env.NETLIFY ||
    process.env.NETLIFY_DEV
  );
}

function getUploadDir() {
  if (isServerless()) {
    return path.join(os.tmpdir(), 'chatty-uploads');
  }
  return path.join(process.cwd(), 'uploads');
}

function ensureUploadDir(uploadDir) {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
}

function createMulterUpload() {
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      try {
        const uploadDir = getUploadDir();
        ensureUploadDir(uploadDir);
        cb(null, uploadDir);
      } catch (err) {
        cb(err);
      }
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    },
  });

  return multer({ storage });
}

module.exports = { createMulterUpload, getUploadDir, isServerless };
