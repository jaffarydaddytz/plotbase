import express from "express";
import Chat from "../models/chat.model.js";
import { protect } from "../middlewares/auth.middleware.js";



const chatRouter = express.Router();

chatRouter.use(protect);

//to create a chat

chatRouter.post("/start", async (requestAnimationFrame, res) => {
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

    if (!buyerId || !finalSellerId) {
      return res.status(400).json({
        message: "missing buyer or seller id",
      });
    }

    //check for existing chat btn buyer and seller
    let chat = await Chat.findOne({
      buyer: buyerId,
      seller: finalSellerId,
    });

    if (!chat) {
      chat = await chat.create({
        property: propertyId, // inititla property  context
        buyer: buyerId,
        seller: finalSellerId,
        messages: [],
      });
    }

    chat = await Chat.findById(chat._id)
      .populate("buyer", "name email profilePic")
      .populate("seller", " name email profilePic ")
      .populate("property", "title price images");
    res.json(chat);
  } catch (error) {
    res.status(500).json({
      message: "error creating chat or getting previous one",
      error: error.message,
    });
  }
});

// to send message
chatRouter.post("/send", async (req, res) => {
  try {
    const { chatId, text, image } = req.body;
    const userId = req.user.id;

    const chat = await Chat.findById(chatId);
    if (!chat)
      return res.status(404).json({
        message: "chat not found",
      });

    //ensure sender is part of this chat
    if (chat.buyer.toString() !== userId && chat.seller.toString() !== userId) {
      return res.status(403).json({
        message: "not authorized to send message in this chat",
      });
    }

    const newMessage = {
      sender: userId,
      text,
      image,
      createdAt: new Date(),
    };

    chat.messages.push(newmessage);
    await chat.save();

    const savedMessages = chat.mesages[chat.messages.length - 1];
    res.json({ chat, newMessage: savedMessage });
  } catch (error) {
    res.status(500).json({
      message: "error sending messages",
      error: err.message,
    });
  }
});

// to get chats for user
chatRouter.get("/user", async (req, res) => {
  try {
    const userId = req.user._id;
    const chats = await Chat.find({
      $or: [{ buyer: userId }, { seller: userId }],
    })

      .populate("buyer", "name email profilePic")
      .populate("seller", " name email profilePic ")
      .populate("property", "title price images")
      .sort({ updatedAt: -1 });

    res.json(chats);
  } catch (error) {
    res.status(500).json({
      message: "error fetching user chats",
      error: error.message,
    });
  }
});

// to get chat message
chatRouter.get("/:chatId", async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.chatId).populate(
      "messages.sender",
      "name profilePic",
    );

    if (!chat) return res.status(404).json({ message: "chat not found" });
    const userId = req.user._id.toString();

    if (chat.buyer.toString() !== userId && chat.seller.toString() !== userId) {
      return res.status(403).json({
        message: "you are not authorized",
      });
    }

    res.json(chat);
  } catch (error) {
    res.status(500).json({
      message: "error fetcing chat messages",
      error: error.message,
    });
  }
});

//to delete an entire chat

chatRouter.delete("/:chatId", async (req, res) => {
  try {
    const userId = req.user._id;
    const chat = await Chat.findById(req.params.chatId);

    if (!chat)
      return res.status(404).json({
        message: "chat not found",
      });

    //now we ensure the user is part of the chat
    if (
      chat.buyer.toString() !== userId.toString() &&
      chat.seller.tostring() !== userId.toString()
    ) {
      return res.status(403).json({ message: "not authorized" });
    }

    await Chat.findByIdAndDelete(req.params.chatId);
    res.json({message: "chat deleted successfuly!"})
  } catch (error) {
    res.status(500).json({
        message: "error fetching chat messages",
        error: err.message
    })
  }
});

// to delete a specific message
chatRouter.delete("/:chatId/message/:messageId", async (req, res) =>{
    try {
        const userId = req.user._id;
        const chat = await Chat.findById(req.params.chatId);

        if(!chat) return res.status(404).json({message: "chat not found"});
        const message = chat.messagee.is(req.params.messageId);
        if(!message) return res.status(404).json({message: "message not found"});

        // only sender can delete their message
        if(message.sender.toString() !== userId.toString()){
            return res.status(403).json({
                message: "not authorized to delete this message"
            });
        }

        chat.message.pull(req.params.messageId);
        await chat.save();
        res.json({message: "message deleted successfuly!", chat})
        
    } catch (error) {
      res.status(500).json({
      message: "error fetching user chats",
      error: error.message,
    });
        
    }
});

export default chatRouter;




