import { useState } from 'react';
import { useChat } from '../../contexts/ChatContext';

const ChatInput = () => {
    const [text, setText] = useState("");
    const { sendMessage, selectedConversation } = useChat();

    const handleSend = async () => {
        if (!text.trim() || !selectedConversation) return;

        try {
            // Gọi hàm từ Context
            await sendMessage(text, selectedConversation._id, []); 
            setText(""); // Clear input sau khi gửi thành công
        } catch (err) {
            alert("Gửi lỗi!");
        }
    };

    return (
        <div>
            <input value={text} onChange={e => setText(e.target.value)} />
            <button onClick={handleSend}>Send</button>
        </div>
    )
}