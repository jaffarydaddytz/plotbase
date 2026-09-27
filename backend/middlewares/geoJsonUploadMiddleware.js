import multer from "multer";

const destination = process.env.VERCEL
    ? "/tmp"
    : "uploads/geojson";

const storage = multer.diskStorage({
    destination,
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const geoJsonUploadMiddleware = multer({
    storage
});

export default geoJsonUploadMiddleware;