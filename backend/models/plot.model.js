import mongoose from "mongoose";

const plotSchema = new mongoose.Schema(
    {
        projectId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Project",
            required: true,
            index: true
        },
        plotNumber : {
            type: String,
            required: true,
            trim: true
        },
        areaSqm:{
            type: Number,
            required: true,
            min: 0
        },
        totalPrice:{
            type: Number,
            required: true,
            min: 0
        },
        status: {
            type: String,
            enum: ["AVAILABLE", "RESERVED", "SOLD"],
            default: "AVAILABLE"
        },
        geometry:{
                type: String,
                enum: ["Polygon", "MultiPolygon"],
                required: true
    
        },
        coordinates: {
            type: mongoose.Schema.Types.Mixed,
            required: true
        }

    },
    {
        timestamps:true
    }
)

const Plot = mongoose.model("Plot", plotSchema);
export default Plot;