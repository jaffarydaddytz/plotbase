import express from "express";
import Chat from "../models/chat.model.js";
import { protect } from "../middlewares/auth.middleware.js";

const chatRouter = express.Router();

/* =========================
   APPLY AUTH TO ALL ROUTES
========================= */
chatRouter.use(protect);

/* =========================
   START CHAT
========================= */
chatRouter.post("/start", async (req, res) => {
  try {
    const { propertyId, sellerId, buyerId: providedBuyerId } = req.body;

    let buyerId, finalSellerId;

    if (req.user.role === "seller") {
      buyerId = providedBuyerId;
      finalSellerId = req.user._id;
    } else {
      buyerId = req.user._id;
      finalSellerId = sellerId;
    }

    if (!buyerId || !finalSellerId || !propertyId) {
      return res.status(400).json({
        message: "missing buyer, seller or property id",
      });
    }

    let chat = await Chat.findOne({
      buyer: buyerId,
      seller: finalSellerId,
      property: propertyId,
    });

    if (!chat) {
      chat = await Chat.create({
        property: propertyId,
        buyer: buyerId,
        seller: finalSellerId,
        messages: [],
      });
    }

    chat = await Chat.findById(chat._id)
      .populate("buyer", "name email profilePic")
      .populate("seller", "name email profilePic")
      .populate("property", "title price images");

    res.json(chat);
  } catch (error) {
    res.status(500).json({
      message: "error creating chat",
      error: error.message,
    });
  }
});

/* =========================
   SEND MESSAGE
========================= */
chatRouter.post("/send", async (req, res) => {
  try {
    const { chatId, text, image } = req.body;
    const userId = req.user._id;

    const chat = await Chat.findById(chatId);
    if (!chat) return res.status(404).json({ message: "chat not found" });

    const buyerId =
      typeof chat.buyer === "object"
        ? chat.buyer._id.toString()
        : chat.buyer.toString();

    const sellerId =
      typeof chat.seller === "object"
        ? chat.seller._id.toString()
        : chat.seller.toString();

    if (
      buyerId !== userId.toString() &&
      sellerId !== userId.toString()
    ) {
      return res.status(403).json({
        message: "not authorized to send message",
      });
    }

    const newMessage = {
      sender: userId,
      text,
      image,
      createdAt: new Date(),
    };

    chat.messages.push(newMessage);

    chat.lastMessage = {
      text: newMessage.text,
      sender: newMessage.sender,
      createdAt: newMessage.createdAt,
    };

    await chat.save();

    const savedMessage = chat.messages.at(-1);

    const io = req.app.get("io");
    if (io) {
      io.to(chatId).emit("receiveMessage", {
        ...savedMessage.toObject(),
        chatId,
      });
    }

    res.json({ chat, newMessage: savedMessage });
  } catch (error) {
    res.status(500).json({
      message: "error sending message",
      error: error.message,
    });
  }
});

/* =========================
   GET USER CHATS
========================= */
chatRouter.get("/user", async (req, res) => {
  try {
    const userId = req.user._id;

    const chats = await Chat.find({
      $or: [{ buyer: userId }, { seller: userId }],
    })
      .populate("buyer", "name email profilePic")   // ✅ ensure buyer details
      .populate("seller", "name email profilePic")  // ✅ ensure seller details
      .populate("property", "title price images")
      .populate("lastMessage.sender", "name profilePic") // ✅ add sender details for preview
      .sort({ updatedAt: -1 });

    res.json(chats);
  } catch (error) {
    res.status(500).json({
      message: "error fetching user chats",
      error: error.message,
    });
  }
});
/* =========================
   GET SINGLE CHAT (FIXED)
========================= */
chatRouter.get("/:chatId", async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.chatId)
      .populate("buyer", "name email profilePic")
      .populate("seller", "name email profilePic")
      .populate("messages.sender", "name profilePic");

    if (!chat) {
      return res.status(404).json({ message: "chat not found" });
    }

    const userId = req.user._id.toString();

    const buyerId =
      typeof chat.buyer === "object"
        ? chat.buyer._id.toString()
        : chat.buyer.toString();

    const sellerId =
      typeof chat.seller === "object"
        ? chat.seller._id.toString()
        : chat.seller.toString();

    if (buyerId !== userId && sellerId !== userId) {
      return res.status(403).json({
        message: "you are not authorized",
      });
    }

    res.json(chat);
  } catch (error) {
    res.status(500).json({
      message: "error fetching chat messages",
      error: error.message,
    });
  }
});

/* =========================
   DELETE CHAT
========================= */
chatRouter.delete("/:chatId", async (req, res) => {
  try {
    const userId = req.user._id;
    const chat = await Chat.findById(req.params.chatId);

    if (!chat) {
      return res.status(404).json({ message: "chat not found" });
    }

    const buyerId =
      typeof chat.buyer === "object"
        ? chat.buyer._id.toString()
        : chat.buyer.toString();

    const sellerId =
      typeof chat.seller === "object"
        ? chat.seller._id.toString()
        : chat.seller.toString();

    if (buyerId !== userId.toString() && sellerId !== userId.toString()) {
      return res.status(403).json({ message: "not authorized" });
    }

    await Chat.findByIdAndDelete(req.params.chatId);

    res.json({ message: "chat deleted successfully!" });
  } catch (error) {
    res.status(500).json({
      message: "error deleting chat",
      error: error.message,
    });
  }
});

/* =========================
   DELETE MESSAGE
========================= */
chatRouter.delete("/:chatId/message/:messageId", async (req, res) => {
  try {
    const userId = req.user._id;

    const chat = await Chat.findById(req.params.chatId);

    if (!chat) {
      return res.status(404).json({ message: "chat not found" });
    }

    const message = chat.messages.id(req.params.messageId);

    if (!message) {
      return res.status(404).json({ message: "message not found" });
    }

    if (message.sender.toString() !== userId.toString()) {
      return res.status(403).json({
        message: "not authorized to delete this message",
      });
    }

    chat.messages.pull(req.params.messageId);
    await chat.save();

    res.json({
      message: "message deleted successfully!",
      chat,
    });
  } catch (error) {
    res.status(500).json({
      message: "error deleting message",
      error: error.message,
    });
  }
});

export default chatRouter;