import mongoose from "mongoose";

//message schema
const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  text: {
    type: String,
    required: true,
  },
  image: {
    type: String,
    required: false,
  },
  createdAt: {
    type: Date,
    default: Date.now(),
  },
});

//chat schema
const chatSchema = new mongoose.Schema(
  {
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property",
      required: false,
    },
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      rer: "Usser",
      required: true,
    },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    messages: [messageSchema],
  },

  { timestamps: true },
);


const Chat = mongoose.model("Chat", chatSchema);
export default Chat;