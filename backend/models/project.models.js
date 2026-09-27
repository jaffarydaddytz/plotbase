import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
    {
        userId:{
            type: mongoose.Schema.Types.ObjectId,
            ref:"User",
            required:true,
            index: true

        },
        title:{
            type:String,
            required:true,
            trim:true
        },
        description:{
            type: String,
            required: true,
            trim: true
        },
        location:{
            type:String,
            trim:true
        },
        pricePerSqm:{
            type: Number,
            required: true,
            min:0
        },
        status:{
            type: String,
            enum: ["ACTIVE", "INACTIVE", "DRAFT"],
            default: "DRAFT"
        }


    },
    {
        timestamps:true,
    }
);

const Project = mongoose.model("Project", projectSchema);
export default Project;