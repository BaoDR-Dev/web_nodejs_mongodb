import React, { useState, useRef, useEffect } from 'react';
import { aiAPI } from '../../api/services';
import { useAuth } from '../../context/AuthContext';
import { toast } from './Toast';

export default function Chatbot() {
  const { user } = useAuth(); // AI route của bạn dùng middleware protect nên cần đăng nhập
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'model', text: 'Xin chào! Tôi là trợ lý ảo của Fashion Store. Quý khách muốn tìm sản phẩm nào ạ? 👗' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  
  const messagesEndRef = useRef(null);

  // Tự động cuộn xuống tin nhắn mới nhất
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Nếu user chưa đăng nhập, không hiển thị nút Chat
  if (!user) return null;

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!input.trim()) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    try {
      const { data } = await aiAPI.chat({ 
        message: userMsg, 
        session_id: sessionId 
      });
      
      setSessionId(data.session_id);
      setMessages(prev => [...prev, { role: 'model', text: data.answer }]);
    } catch (err) {
      toast.error('Lỗi kết nối AI. Vui lòng thử lại.');
      setMessages(prev => [...prev, { role: 'model', text: 'Xin lỗi, hệ thống AI đang bận. Bạn thử lại sau nhé!' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    if (sessionId) {
      await aiAPI.clearSession(sessionId).catch(() => {});
    }
    setSessionId(null);
    setMessages([{ role: 'model', text: 'Đã xóa lịch sử trò chuyện. Bạn cần giúp gì thêm không? ✨' }]);
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100]">
      {/* Nút bật/tắt Chat */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full bg-blue-600 text-white shadow-2xl flex items-center justify-center text-2xl hover:bg-blue-700 hover:scale-110 transition-all ${isOpen ? 'rotate-90' : ''}`}
      >
        {isOpen ? '✕' : '✨'}
      </button>

      {/* Cửa sổ Chat */}
      {isOpen && (
        <div className="absolute bottom-20 right-0 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden animate-slide-in h-[500px]">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 flex items-center justify-between text-white">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🤖</span>
              <div>
                <h3 className="font-bold text-sm">Trợ lý Fashion AI</h3>
                <p className="text-[10px] text-blue-200">Luôn sẵn sàng hỗ trợ 24/7</p>
              </div>
            </div>
            <button onClick={handleClear} title="Xóa lịch sử" className="text-white hover:text-gray-200 text-sm">
              🗑️
            </button>
          </div>

          {/* Nội dung chat */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 scrollbar-hide">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div 
                  className={`max-w-[85%] p-3 rounded-2xl text-sm ${
                    msg.role === 'user' 
                      ? 'bg-blue-600 text-white rounded-br-none' 
                      : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-sm'
                  }`}
                >
                  {/* Backend của bạn trả về HTML, nên cần dùng dangerouslySetInnerHTML */}
                  {msg.role === 'model' ? (
                     <div 
                       className="prose prose-sm max-w-none prose-img:rounded-xl prose-img:max-w-full prose-a:text-blue-600"
                       dangerouslySetInnerHTML={{ __html: msg.text }} 
                     />
                  ) : (
                    msg.text
                  )}
                </div>
              </div>
            ))}
            
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 p-3 rounded-2xl rounded-bl-none shadow-sm flex gap-1 items-center h-10">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Ô nhập liệu */}
          <form onSubmit={handleSend} className="p-3 bg-white border-t border-gray-100 flex gap-2 items-center">
            <input 
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Nhập câu hỏi..."
              className="flex-1 bg-gray-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button 
              type="submit" 
              disabled={loading || !input.trim()}
              className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 disabled:opacity-50 transition"
            >
              ➤
            </button>
          </form>
        </div>
      )}
    </div>
  );
}