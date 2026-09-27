import multer from "multer";

const storage = multer.diskStorage({
    destination: "uploads/geojson",

    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const geoJsonUploadMiddleware = multer({
    storage
});

export default geoJsonUploadMiddleware;