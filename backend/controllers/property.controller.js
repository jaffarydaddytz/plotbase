import Property from "../models/property.model.js";
import Inquiry from "../models/inquiry.model.js";
import { uploadToCloudinary } from "../utils/uploadToCloudinary.js";
import { logRequestData } from "../utils/logRequestData.js";
import cloudinary from "cloudinary";
import jwt from "jsonwebtoken";

// ================= ADD PROPERTY =================
export const addProperty = async (req, res) => {
  try {
    let imageUrls = [];

    if (req.files && req.files.length > 0) {
      for (let file of req.files) {
        const result = await uploadToCloudinary(file.buffer);
        imageUrls.push(result.secure_url);
      }
    }

    // clean amenities parsing
    let amenities = [];
    if (req.body.amenities) {
      if (Array.isArray(req.body.amenities)) {
        amenities = req.body.amenities;
      } else {
        try {
          amenities = JSON.parse(req.body.amenities);
        } catch {
          amenities = req.body.amenities.split(",");
        }
      }
    }

    const property = await Property.create({
      title: req.body.title,
      description: req.body.description,
      price: Number(req.body.price),
      city: req.body.city,
      area: Number(req.body.area),
      pincode: req.body.pincode,
      propertyType: req.body.propertyType,
      bhk: req.body.bhk ? String(req.body.bhk) : undefined,
      bathroom: req.body.bathrooms
        ? Number(req.body.bathrooms)
        : undefined,
      areaSize: req.body.areaSize
        ? Number(req.body.areaSize)
        : undefined,
      furnishing: req.body.furnishing,
      status: req.body.status,
      images: imageUrls,
      seller: req.user._id,
      amenities,
    });

    res.json({ success: true, property });
  } catch (error) {
    console.error("add property error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "internal server error",
    });
  }
};

// ================= GET MY PROPERTIES =================
export const getMyProperties = async (req, res) => {
  try {
    const properties = await Property.find({
      seller: req.user._id,
    });

    res.json({ success: true, properties });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ================= UPDATE PROPERTY =================
export const updateProperty = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Property not found",
      });
    }

    if (property.seller.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    const fields = [
      "title",
      "description",
      "price",
      "city",
      "area",
      "pincode",
      "propertyType",
      "bhk",
      "bathrooms",
      "areaSize",
      "furnishing",
      "status",
    ];

    fields.forEach((field) => {
      if (req.body[field] !== undefined) {
        property[field] = req.body[field];
      }
    });

    // amenities
    if (req.body.amenities) {
      try {
        property.amenities = JSON.parse(req.body.amenities);
      } catch {
        property.amenities = req.body.amenities.split(",");
      }
    }

    // existing images
    if (req.body.existingImages) {
      try {
        const existing = JSON.parse(req.body.existingImages);
        property.images = Array.isArray(existing)
          ? existing
          : property.images;
      } catch (e) {
        console.error("failed to parse existing images", e);
      }
    }

    // upload new images
    if (req.files && req.files.length > 0) {
      let newImages = [];

      for (let file of req.files) {
        const result = await uploadToCloudinary(file.buffer, "properties");
        newImages.push(result.secure_url);
      }

      property.images = [...property.images, ...newImages];
    }

    await property.save();

    res.json({
      success: true,
      message: "Property updated",
      property,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ================= DELETE PROPERTY =================
export const deleteProperty = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Property not found",
      });
    }

    if (property.seller.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    // delete images from cloudinary
    for (let imageUrl of property.images) {
      const publicId = imageUrl.split("/").pop().split(".")[0];
      await cloudinary.uploader.destroy(`properties/${publicId}`);
    }

    await property.deleteOne();

    res.json({
      success: true,
      message: "Property deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ================= UPDATE STATUS =================
export const updatePropertyStatus = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Property not found",
      });
    }

    if (property.seller.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    property.status = req.body.status;
    await property.save();

    res.json({
      success: true,
      message: "Status updated",
      property,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ================= GET ALL PROPERTIES =================
export const getAllProperties = async (req, res) => {
  try {
    const {
      city,
      area,
      pincode,
      propertyType,
      bhk,
      furnishing,
      status,
      minPrice,
      maxPrice,
      amenities,
      sort,
      seller,
    } = req.query;

    let query = { status: "sale" };

    if (seller) query.seller = seller;
    if (city) query.city = new RegExp(city, "i");
    if (area) query.area = new RegExp(area, "i");
    if (pincode) query.pincode = pincode;

    if (propertyType) {
      query.propertyType = {
        $in: propertyType.toLowerCase().split(","),
      };
    }

    if (bhk) {
      query.bhk = bhk === "5+" ? { $gte: "5" } : bhk;
    }

    if (furnishing) {
      query.furnishing = {
        $in: furnishing.split(",").map(
          (f) => new RegExp(`^${f.trim()}$`, "i")
        ),
      };
    }

    if (status) query.status = status;

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    if (amenities) {
      query.amenities = {
        $in: amenities.split(",").map((a) => a.trim()),
      };
    }

    let sortOption = { createdAt: -1 };
    if (sort === "priceLow") sortOption = { price: 1 };
    if (sort === "priceHigh") sortOption = { price: -1 };

    const properties = await Property.find(query)
      .populate("seller", "name phone profilePic")
      .sort(sortOption);

    res.json({
      success: true,
      count: properties.length,
      properties,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching properties",
      error: error.message,
    });
  }
};

// ================= GET PROPERTY DETAILS =================
export const getPropertyDetails = async (req, res) => {
  try {
    logRequestData(req);

    const property = await Property.findById(req.params.id).populate(
      "seller",
      "name email phone profilePic"
    );

    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Property not found",
      });
    }

    let visitorId = req.ip;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer")) {
      try {
        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        visitorId = decoded.id;
      } catch {}
    }

    const isSeller = visitorId === property.seller._id.toString();

    if (!isSeller && !property.viewedBy.includes(visitorId)) {
      property.views += 1;
      property.viewedBy.push(visitorId);
      await property.save();
    }

    const similarProperties = await Property.find({
      _id: { $ne: property._id },
      city: property.city,
      propertyType: property.propertyType,
      status: property.status,
    })
      .limit(4)
      .select(
        "title price images city area propertyType bhk areaSize status"
      );

    res.json({
      success: true,
      property,
      similarProperties,
    });
  } catch (error) {
    console.log("property error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ================= DASHBOARD =================
export const getSellerDashboard = async (req, res) => {
  try {
    const sellerId = req.user._id;

    const totalProperties = await Property.countDocuments({ seller: sellerId });
    const activeListings = await Property.countDocuments({
      seller: sellerId,
      status: "sale",
    });
    const soldProperties = await Property.countDocuments({
      seller: sellerId,
      status: "sold",
    });
    const totalInquiries = await Inquiry.countDocuments({
      seller: sellerId,
    });

    const viewsData = await Property.aggregate([
      { $match: { seller: sellerId } },
      { $group: { _id: null, totalViews: { $sum: "$views" } } },
    ]);

    const totalViews =
      viewsData.length > 0 ? viewsData[0].totalViews : 0;

    res.json({
      success: true,
      stats: {
        totalProperties,
        activeListings,
        soldProperties,
        totalInquiries,
        totalViews,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ================= PROPERTY COUNTS =================
export const getPropertyCounts = async (req, res) => {
  try {
    const counts = await Property.aggregate([
      { $match: { status: "sale" } },
      { $group: { _id: "$propertyType", count: { $sum: 1 } } },
    ]);

    const formattedCounts = counts.reduce((acc, curr) => {
      acc[curr._id] = curr.count;
      return acc;
    }, {});

    res.json({
      success: true,
      counts: formattedCounts,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching counts",
      error: error.message,
    });
  }
};