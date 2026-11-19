import dns from 'dns';
dns.setServers(['8.8.8.8', '8.8.4.4']);
import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import http from 'http';
import {Server} from 'socket.io'
import morgan from "morgan"



const app = express();
const PORT = Number(process.env.PORT || 5000);
const HOST = process.env.HOST || "0.0.0.0";
import {connectDB} from './config/db.js';
import authRouter from './routes/auth.routes.js';
import userRouter from './routes/user.routes.js';
import PropertyRouter from './routes/property.routes.js';
import chatRouter from './routes/chat.routes.js';
import { Socket } from 'socket.io';
import inquiryRouter from './routes/inquiry.routes.js';
import adminRouter from './routes/admin.routes.js';
import wishlistRouter from './routes/wishlist.routes.js';
import projectRouter from './routes/project.routes.js';
import companyRouter from './routes/company.routes.js';
import mtaalamuRouter from './routes/mtaalamu.routes.js';
import reservationRouter from './routes/reservation.routes.js';
import {
  expirePendingReservations,
} from "./services/reservationService.js";


app.set('trust proxy', false);



//middlewares


const allowedOrigins = process.env.ALLOWED_ORIGINS
    .split(",")
    .map(origin => origin.trim())
    .filter(Boolean);

app.use(morgan("dev"));

app.use(
    cors({
        origin: (origin, callback) => {
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                callback(new Error("Not allowed by CORS"));
            }
        }
    })
);
app.use(express.json());


//routes
app.use("/api/auth", authRouter)
app.use("/api/user", userRouter)
app.use("/api/property", PropertyRouter)
app.use("/api/inquiry", inquiryRouter)
app.use("/api/chat", chatRouter)
app.use("/api/admin", adminRouter)
app.use("/api/wishlist", wishlistRouter)
app.use("/api/project", projectRouter)
app.use("/api/companies", companyRouter);
app.use("/api/reservations", reservationRouter);
// Mtaalamu AI Assistant
app.use("/api/mtaalamu", mtaalamuRouter);



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
    console.log("USER CONNECTED SOCKET:", socket.id);

    socket.on("joinChat", (chatId)=>{
        socket.join(chatId);
    });
    socket.on("sendMessage", (data)=>{
        io.to(data.chatId).emit("receiveMessage", data);

    });

    socket.on("disconnect", ()=>{

    })
})

app.set("io", io);


// ==========================================
// RESERVATION EXPIRY CONFIGURATION
// ==========================================

const EXPIRY_INTERVAL_MS = 60 * 1000;

let expiryCheckRunning = false;

// ==========================================
// PROCESS EXPIRED RESERVATIONS
// ==========================================

const runReservationExpiry = async () => {
  // Prevent overlapping processing runs.

  if (expiryCheckRunning) {
    return;
  }

  expiryCheckRunning = true;

  try {
    const result = await expirePendingReservations({
      batchSize: 50,
    });

    if (result.checked > 0) {
      console.log(
        "[Reservation Expiry]",
        `Checked: ${result.checked}`,
        `Expired: ${result.expired}`,
        `Skipped: ${result.skipped}`
      );
    }
  } catch (error) {
    console.error(
      "[Reservation Expiry] Processing failed:",
      error
    );
  } finally {
    expiryCheckRunning = false;
  }
};

// ==========================================
// START BACKEND SERVER
// ==========================================

const startServer = async () => {
  try {
    // Connect to MongoDB before starting
    // the API and background processing.

    await connectDB();

    server.listen(PORT, HOST, () => {
      console.log(
        `Server started on ${HOST}:${PORT}`
      );

      // Process overdue reservations
      // immediately after startup.

      void runReservationExpiry();

      // Continue processing periodically.

      const expiryTimer = setInterval(
        () => {
          void runReservationExpiry();
        },
        EXPIRY_INTERVAL_MS
      );

      // The interval should not keep Node.js
      // running after other services close.

      expiryTimer.unref();
    });
  } catch (error) {
    console.error(
      "Backend startup failed:",
      error
    );

    process.exit(1);
  }
};

// ==========================================
// INITIALIZE APPLICATION
// ==========================================

void startServer();
