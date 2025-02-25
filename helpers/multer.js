
const multer = require("multer");
const fs = require("fs");
const path = require("path");

// Define upload directory
const uploadDir = path.join(__dirname, "../public/uploads/re-images");

// Ensure the directory exists
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + "-" + file.originalname.replace(/\s+/g, "_"));
    },
});

module.exports = storage;
