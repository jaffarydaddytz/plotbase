import mongoose from "mongoose";

export const connectDB = async () => {
    await mongoose.connect("mongodb+srv://jaffarydaddytz_db_user:wbL0XVSQ35FBw3zl@cluster0.babf4yq.mongodb.net/plotdb")
    .then(() => {
        console.log("DB CONNECTED");
    })
}