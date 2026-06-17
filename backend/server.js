import dns from 'dns';
dns.setServers(['8.8.8.8', '8.8.4.4']);
import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import http from 'http';
import {Server} from 'socket.io'
import morgan from "morgan"


const app = express();
const PORT = 5000;
import {connectDB} from './config/db.js';
import authRouter from './routes/auth.routes.js';
import userRouter from './routes/user.routes.js';
import PropertyRouter from './routes/property.routes.js';
import chatRouter from './routes/chat.routes.js';
import { Socket } from 'socket.io';
import inquiryRouter from './routes/inquiry.routes.js';
import adminRouter from './routes/admin.routes.js';


//DB
connectDB();

//middlewares
const allowedOrigins = [
    // "http://localhost:5173",
     "https://plotbase-usyn.vercel.app/",
     //" http://192.168.0.7:5173/"
     
].filter(Boolean);

app.use(morgan("dev"));

app.use(cors({
    origin: function (origin, callback){
        if(!origin || allowedOrigins.includes(origin)){
            callback(null, true);
        } else {
            callback(new Error("not allowed by CORS"))
        }
    },
    credentials: true
}
));

app.use(express.json());


//routes
app.use("/api/auth", authRouter)
app.use("/api/user", userRouter)
app.use("/api/property", PropertyRouter)
app.use("/api/inquiry", inquiryRouter)
app.use("/api/chat", chatRouter)
app.use("/api/admin", adminRouter)



app.get("/", (req, res) => {
    res.send("plotbase API WORKING")
})

const server = http.createServer(app);

//socket.io setup 
const io = new Server(server, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"],

    },

});
io.on("connection", (socket)=>{
    socket.on("joinChat", (chatId)=>{
        socket.join(chatId);
    });
    socket.on("sendMessage", (data)=>{
        io.to(data.chatId).emit("receivemessage", data);

    });

    socket.on("disconnect", ()=>{

    })
})

server.listen(PORT, "0.0.0.0", () => {
    console.log(`server Started on port ${PORT}`);
});