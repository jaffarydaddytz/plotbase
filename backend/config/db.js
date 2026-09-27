import mongoose from "mongoose";
import dotenv from "dotenv";

//const atlasdb = "mongodb+srv://jaffarydaddytz_db_user:wbL0XVSQ35FBw3zl@cluster0.babf4yq.mongodb.net/plotdb";
//const localdb = "mongodb://plot_db_user:plotbase@localhost:27017/plotdb?authSource=plotdb"

export const connectDB = async () => {
    await mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log("DB CONNECTED");
    })
}