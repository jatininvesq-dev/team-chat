const multer = require('multer');
const path = require('path');
const os = require('os');
const fs = require('fs');

const isServerless = Boolean(
  process.env.NETLIFY ||
    process.env.NETLIFY_DEV ||
    process.env.AWS_LAMBDA_FUNCTION_NAME
);

function getUploadDir() {
  if (isServerless) {
    return path.join(os.tmpdir(), 'chatty-uploads');
  }
  return path.join(process.cwd(), 'uploads');
}

function createMulterUpload() {
  const uploadDir = getUploadDir();
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    },
  });

  return multer({ storage });
}

module.exports = { createMulterUpload, getUploadDir, isServerless };
