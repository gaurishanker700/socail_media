const multer = require('multer');
const path = require('path');


const uploadDirectory = path.join('/home/deftsoft/Desktop/1/public/user');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDirectory);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

module.exports = upload;
