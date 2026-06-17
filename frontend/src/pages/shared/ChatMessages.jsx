import  { useEffect, useRef, useState } from 'react'
import { chatMessagesStyles as s } from '../../assets/dummyStyles'
import { useAuth } from '../../context/AuthContext'
import { useChat } from '../../context/ChatContext'
import { useLocation } from 'react-router-dom'
import axios from 'axios'
import API_URL from '../../config'
import Navbar from '../../components/common/Navbar'
import { HiChevronLeft, HiOutlineChatAlt2, HiOutlineTrash, HiPaperAirplane } from 'react-icons/hi'




const ChatMessages = () => {
    const {user, token} = useAuth();
    const location = useLocation();
    const {socket, activeChat, setActiveChat, joinChat} = useChat();
    const [conversations, setConversations] = useState([]);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef(null);

// to scroll to bottom
const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({behavior: "smooth"})
}

// to get the partner
const getChatPartner = (chat) => {
  if (!chat) return null;
  // chat may have buyer/seller or participants structure
  if (chat.buyer && chat.seller && user) {
    return user._id === chat.buyer._id ? chat.seller : chat.buyer;
  }
  if (chat.participants && Array.isArray(chat.participants) && user) {
    return chat.participants.find(p => p._id !== user._id) || null;
  }
  return null;
};

// to fetch the conversations
useEffect(() => {
    const fetchConversations = async () => {
        try {
            const res = await axios.get(`${API_URL}/api/chat/user`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            const fetchedConversations = res.data;
            setConversations(fetchedConversations);

            if(location.state?.chat) {
                const existingChat = fetchedConversations.find(c => c._id === location.state.chat._id);

                if(existingChat) {
                    setActiveChat(existingChat);

                } else {
                    setActiveChat(location.state.chat)
                }
            }

            setLoading(false);
           
        } catch (error) {
            console.error("error fetching conversations", error);
            setLoading(false);

        }
    };

    fetchConversations();

}, [user, location.state, setActiveChat, token]);



// to fetch message
useEffect(() => {
    if(activeChat){
        const fetchMessages = async () => {
            try {
                const res = await axios.get(`${API_URL}/api/chat/${activeChat._id}`, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
                setMessages(res.data.messages);
                joinChat(activeChat._id);
                scrollToBottom();
            } catch (error) {
                console.error("error fetching messages", error);
            }
        } 
        fetchMessages();
    }
}, [activeChat, token, joinChat]);

// updating the chat when new message arrives
useEffect(() => {
    if(socket) {
        socket.on("receivemessage", (data) => {
            if(activeChat && data.chatId === activeChat._id) {
                setMessages((prev) => [...prev, data]);
            }
        });
    }
    return () => socket?.off("receivemessage");
}, [socket, activeChat])



useEffect(() => {
    scrollToBottom();
}, [messages]);


useEffect(() => {
    const timer = setTimeout(() => scrollToBottom(), 100);
    return () => clearTimeout(timer);
}, [activeChat])

// to send mesage
const handleSendMessage = async (e) => {
    e.preventDefault();
    if(newMessage.trim() || !activeChat) return;

    const textToSend = newMessage;
    setMessages("");

    try {
        const res = await axios.post(`${API_URL}/api/chat/send`, 
        {

            chatId: activeChat._id,
            text: textToSend
        },

        {
            headers: { Authorization: `Bearer ${token}`}}
     ) ;

     if (res.data.newMessage) {
        setMessages(
            activeChat._id,
            textToSend,
            res.data.newMessage._id,
            res.data.newMessage.createdAt
        );
     }
        scrollToBottom();

   
    } catch (error) {
        console.error("error sending message", error);
        
    }
    
}



// to delete entire chat
const handleDeleteChat = async (e, chatId) => {
    e.stopPropagation();
    if(!Window.confirm("are you sure you want to delete this chat?"))
        return;

                          
    try {
        await axios.delete(`${API_URL}/api/chatId}`, {
            headers: {Authorization: `Bearer ${token}`}
        });

        setConversations((prev) => prev.filter((c) => c._id !== chatId));
        if(activeChat?._id === chatId) 
            setActiveChat(null);
    } catch (error) {
        console.log(error)
        
    }
    
}


// to delete a message

const handleDeleteMessage = async (chatId, messageId) => {
    if(!window.confirm("Delete tis message")) return;

    try {
        const res = await axios.delete(
            `${API_URL}/api/chat/${chatId}/message/${messageId}`,
            {
                headers: {Authorization: `Bearer ${token}`}
            }
        );
        setMessages(res.data.chat.messages);
    } catch (error) {
        console.error("error deleting message", error)
        
    }


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-10 h-10 border-4 border-gray-300 border-t-green-500 rounded-full animate-spin"></div>
      </div>
    );
  }
    
}

  return (
    <div className={`${s.chatContainer} ${
        user?.role === "seller ? s.chatContainerSeller : s.chatContainerNonSeller"
    }`}>

        {user?.role !== "seller" && <Navbar />}

        <div className={`${s.sidebar} ${activeChat ? s.sidebarHidden : ""}`}>
            <div className={s.sidebarHeader}>
                <h2 className={s.sidebarTitle}>
                    Messages

                </h2>

            </div>


            <div className={s.sidebarContent}>
                {conversations.length === 0 ? (
                    <div className={s.emptyConversations}>
                        <HiOutlineChatAlt2 className={s.emptyIcon} />
                        <p>
                            No conversations yet
                        </p>

                    </div>
                ): (
                    conversations.map((chat) => (
                        <div key={chat._id} className={`${s.conversationItem} ${
                            activeChat?._id === chat._id ? s.conversationItemActive : ""
                        }`} onClick={() => setActiveChat(chat)}>

                            <div className={s.avatar}>
                                {getChatPartner(chat)?.profilePic ? (
                                    <img src={getChatPartner(chat).profilePic } className={s.avatarImg} alt="" />
                                ): (
                                    getChatPartner(chat)?.name?.charAt(0)
                                )}

                            </div>


                            <div className={s.conversationInfo}>
                                <div className={s.conversationName}>
                                    {getChatPartner(chat)?.name}

                                </div>

                                <div className={s.conversationPreview}>
                                    {chat.messages.at(-1)?.text || "stated a conversation"}

                                </div>

                            </div>


                            <button onClick={(e) => handleDeleteChat(e, chat._id)}   className={s.deleteChatButton}>
                                <HiOutlineTrash />

                            </button>

                        </div>
                    ))
                )}

            </div>



            {/* main chat area */}

            <div className={s.chatArea}>
          {activeChat ? (
            <>
              <div className={s.chatHeader}>
                <div className={s.chatHeaderLeft}>
                  <button
                    className={s.backButton}
                    onClick={() => setActiveChat(null)}
                  >
                    <HiChevronLeft size={24} />
                  </button>
                  <div className={s.avatar}>
                    {getChatPartner(activeChat)?.profilePic ? (
                      <img
                        className={s.avatarImg}
                        src={getChatPartner(activeChat).profilePic}
                        alt=""
                      />
                    ) : (
                      getChatPartner(activeChat)?.name?.charAt(0)
                    )}
                  </div>
                  <div className={s.chatPartnerName}>
                    {getChatPartner(activeChat)?.name}
                  </div>
                </div>
              </div>

              <div className={s.messagesArea}>
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`${s.messageBubble} ${(msg.sender?._id || msg.sender) === user._id ? s.messageOwn : s.messageOther}`}
                  >
                    <div className={s.messageContent}>
                      {msg.image && (
                        <div className={s.messageImageWrapper}>
                          <img
                            src={msg.image}
                            alt="Property Reference"
                            className={s.messageImage}
                          />
                        </div>
                      )}
                      <div className={s.messageText}>{msg.text}</div>
                      {(msg.sender?._id || msg.sender) === user._id && (
                        <button
                          className={s.deleteMessageButton}
                          onClick={() =>
                            handleDeleteMessage(activeChat._id, msg._id)
                          }
                          title="Delete Message"
                        >
                          <HiOutlineTrash size={14} />
                        </button>
                      )}
                    </div>
                    <span className={s.messageTime}>
                      {new Date(msg.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              <form className={s.messageForm} onSubmit={handleSendMessage}>
                <input
                  type="text"
                  className={s.messageInput}
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                />
                <button type="submit" className={s.sendButton}>
                  <HiPaperAirplane className={s.sendIcon} />
                </button>
              </form>
            </>
          ) : (
            <div className={s.noChatSelected}>
              <HiOutlineChatAlt2 className={s.noChatIcon} />
              <h3 className={s.noChatTitle}>Your Messages</h3>
              <p>Select a conversation to start chatting</p>
            </div>
          )}
        </div>



        </div>

    </div>
  )
}

export default ChatMessages