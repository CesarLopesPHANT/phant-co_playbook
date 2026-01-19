import React, { useState, useRef, useEffect } from 'react';
import { getSalesMentorStream } from '../services/gemini';
import { ChatMessage, UserRole } from '../types';

interface AIAssistantProps {
  currentRole: UserRole;
}

const AIAssistant: React.FC<AIAssistantProps> = ({ currentRole }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: `Oi! Sou seu Mentor de Vendas. Tem algum lead travado ou precisa de ajuda para montar uma proposta hoje?` }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput('');
    
    // Fix: Explicitly type the array or cast role to literal type to satisfy ChatMessage interface
    const updatedMessages: ChatMessage[] = [...messages, { role: 'user', content: userMsg }];
    setMessages(updatedMessages);
    setIsLoading(true);

    // Initial empty message for the assistant
    setMessages(prev => [...prev, { role: 'assistant', content: '' } as ChatMessage]);

    const fullPrompt = `Você é um Mentor Comercial PhantLab. Ajude um usuário com cargo de ${currentRole}. 
    Usuário: ${userMsg}
    Forneça uma resposta prática, curta e orientada a fechamento de vendas.`;

    try {
      const result = await getSalesMentorStream(fullPrompt, (chunkText) => {
        setMessages(prev => {
          const newMsgs = [...prev];
          const lastMsg = newMsgs[newMsgs.length - 1];
          if (lastMsg && lastMsg.role === 'assistant') {
            lastMsg.content = chunkText;
          }
          return newMsgs;
        });
      });

      if (!result) {
        // If result is empty, it means an error occurred and was handled in getSalesMentorStream
        // but we might want to ensure the loading state is cleared and a placeholder is removed if empty
      }
    } catch (error) {
      console.error("Chat Error:", error);
      setMessages(prev => {
        const newMsgs = [...prev];
        const lastMsg = newMsgs[newMsgs.length - 1];
        if (lastMsg && lastMsg.role === 'assistant' && !lastMsg.content) {
          lastMsg.content = "Ocorreu um erro na comunicação. Por favor, tente novamente em alguns instantes.";
        }
        return newMsgs;
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-8 right-8 w-16 h-16 bg-black text-white rounded-[24px] shadow-2xl flex items-center justify-center hover:scale-105 transition-all z-[60] group overflow-hidden"
      >
        <div className={`absolute inset-0 bg-blue-600 transition-transform duration-500 ${isLoading ? 'translate-y-0' : 'translate-y-full'}`}></div>
        <div className="relative z-10 flex items-center justify-center">
          {isOpen ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
          ) : (
            isLoading ? <span className="text-xl animate-spin">🌀</span> : <span className="text-2xl">🤝</span>
          )}
        </div>
      </button>

      {isOpen && (
        <div className="fixed bottom-28 right-8 w-[400px] h-[550px] bg-white rounded-[40px] shadow-2xl border border-gray-100 flex flex-col z-[50] overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-300">
          <div className="p-8 bg-gray-50 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className={`w-10 h-10 rounded-xl bg-black text-white flex items-center justify-center text-lg transition-all ${isLoading ? 'scale-110 shadow-lg shadow-blue-500/20' : ''}`}>
                  {isLoading ? '🧠' : '💡'}
                </div>
                <div>
                  <h3 className="text-lg font-bold tracking-tight text-gray-900 leading-none">Mentor Comercial</h3>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">
                    {isLoading ? 'Raciocinando estratégia...' : 'Dicas em tempo real'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-6 bg-white custom-scrollbar">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}>
                <div className={`max-w-[85%] p-5 rounded-[24px] text-[13px] font-medium leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user' 
                    ? 'bg-black text-white rounded-tr-none' 
                    : 'bg-gray-100 text-gray-800 rounded-tl-none border border-gray-50 shadow-sm'
                }`}>
                  {msg.content || (isLoading && i === messages.length - 1 ? '...' : '')}
                </div>
              </div>
            ))}
          </div>

          <div className="p-6 bg-white border-t border-gray-100">
            <div className="relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ex: Como lidar com 'tá caro'?"
                disabled={isLoading}
                className="w-full pl-6 pr-14 py-4 bg-gray-50 rounded-2xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-black/5 border-none placeholder:text-gray-300 disabled:opacity-50 transition-all"
              />
              <button 
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className={`absolute right-2 top-2 w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                  isLoading || !input.trim() ? 'bg-gray-200 text-gray-400' : 'bg-black text-white hover:bg-gray-800 shadow-lg active:scale-95'
                }`}
              >
                {isLoading ? (
                   <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                ) : (
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 12h14M12 5l7 7-7 7"/></svg>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AIAssistant;