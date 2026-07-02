'use client';

import { useState, useRef, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { Sparkles, X, Send, MessageSquare, Bot, User, Loader2 } from 'lucide-react';

export default function QACopilot() {
 const { activeProject, sendCopilotMessage } = useAppStore();
 const [isOpen, setIsOpen] = useState(false);
 const [message, setMessage] = useState('');
 const [loading, setLoading] = useState(false);
 
 const [chatHistory, setChatHistory] = useState<any[]>([
  {
   role: 'assistant',
   content: 'Hi! I am your QA Assistant. I have context on your active project, its requirements, test cases, and suggested bugs. Ask me to draft test cases, summarize logs, or audit coverage!'
  }
 ]);
 
 const messagesEndRef = useRef<HTMLDivElement>(null);

 const suggestionPills = [
  "Verify Login security rules",
  "Analyze coverage hotspots",
  "Suggest API validation steps",
  "List critical draft bugs"
 ];

 const scrollToBottom = () => {
  messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
 };

 useEffect(() => {
  if (isOpen) {
   scrollToBottom();
  }
 }, [isOpen, chatHistory]);

 if (!activeProject) return null;

 const handleSend = async (textToSend: string) => {
  if (!textToSend.trim() || loading) return;
  
  const userMessage = { role: 'user', content: textToSend };
  setChatHistory(prev => [...prev, userMessage]);
  setMessage('');
  setLoading(true);

  try {
   // Keep only last 10 messages for prompt efficiency
   const historyPayload = chatHistory.slice(-10);
   const response = await sendCopilotMessage(activeProject.id, textToSend, historyPayload);
   
   setChatHistory(prev => [...prev, { 
    role: 'assistant', 
    content: response || 'I couldn\'t fetch a response. Please check your AI engine configuration.' 
   }]);
  } catch (err) {
   setChatHistory(prev => [...prev, { 
    role: 'assistant', 
    content: 'Failed to communicate with LLM. Verify your API token endpoints.' 
   }]);
  } finally {
   setLoading(false);
  }
 };

 return (
  <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
   {/* Chat Window Panel */}
   {isOpen && (
    <div className="w-80 sm:w-96 h-[500px] mb-4 bg-[#0e0b17]/95 border border-slate-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200 backdrop-blur-xl">
     {/* Header */}
     <div className="p-4 bg-gradient-to-r from-blue-950/45 to-slate-950/30 border-b border-slate-200 flex items-center justify-between">
      <div className="flex items-center gap-2">
       <div className="w-8 h-8 rounded-lg bg-[#2F81F7] flex items-center justify-center font-bold text-black ">
        <Sparkles className="w-4 h-4 text-black" />
       </div>
       <div>
        <h3 className="text-xs font-bold text-slate-900 tracking-tight">QA Assistant</h3>
        <span className="text-[9px] text-[#2F81F7] font-mono tracking-wider font-semibold uppercase">Live Context Active</span>
       </div>
      </div>
      <button 
       onClick={() => setIsOpen(false)}
       className="text-slate-500 hover:text-slate-800 p-1 transition"
      >
       <X className="w-4 h-4" />
      </button>
     </div>

     {/* Messages Area */}
     <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 scrollbar-thin">
      {chatHistory.map((msg, idx) => {
       const isBot = msg.role === 'assistant';
       return (
        <div 
         key={idx} 
         className={`flex gap-2 max-w-[85%] ${isBot ? 'self-start' : 'self-end flex-row-reverse'}`}
        >
         <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] shrink-0 border ${
          isBot 
           ? 'bg-blue-950/60 border-blue-800 text-[#2F81F7]' 
           : 'bg-slate-50/60 border-slate-200 text-slate-500'
         }`}>
          {isBot ? <Bot className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
         </div>
         <div className={`p-3 rounded-2xl text-[11px] leading-relaxed ${
          isBot 
           ? 'bg-white/40 border border-slate-200 text-slate-800 rounded-tl-none' 
           : 'bg-slate-600 text-slate-900 rounded-tr-none '
         }`}>
          <div className="whitespace-pre-wrap">{msg.content}</div>
         </div>
        </div>
       );
      })}
      
      {loading && (
       <div className="flex gap-2 max-w-[80%] self-start">
        <div className="w-6 h-6 rounded-full bg-blue-950/60 border border-blue-800 text-[#2F81F7] flex items-center justify-center shrink-0">
         <Bot className="w-3.5 h-3.5" />
        </div>
        <div className="p-3 bg-white/40 border border-slate-200 rounded-2xl rounded-tl-none flex items-center gap-1.5 text-[10px] text-slate-500">
         <Loader2 className="w-3.5 h-3.5 animate-spin text-[#2F81F7]" />
         Generating answers...
        </div>
       </div>
      )}
      <div ref={messagesEndRef} />
     </div>

     {/* Suggestions footer pills */}
     {chatHistory.length === 1 && (
      <div className="px-4 py-2 border-t border-slate-200/65 flex flex-wrap gap-1.5 bg-slate-50/10">
       {suggestionPills.map(pill => (
        <button
         key={pill}
         onClick={() => handleSend(pill)}
         className="px-2 py-1 rounded bg-[#130f21] border border-slate-200 hover:border-[#2F81F7]/20 text-slate-500 hover:text-slate-800 text-[9px] font-semibold transition"
        >
         {pill}
        </button>
       ))}
      </div>
     )}

     {/* Chat input box */}
     <form 
      onSubmit={(e) => {
       e.preventDefault();
       handleSend(message);
      }}
      className="p-3 border-t border-slate-200 bg-[#0e0b17]/95 flex gap-2"
     >
      <input 
       type="text"
       value={message}
       onChange={(e) => setMessage(e.target.value)}
       placeholder="Ask QA Assistant..."
       className="flex-1 glass-input px-3 py-2 text-xs"
       disabled={loading}
      />
      <button 
       type="submit"
       disabled={loading || !message.trim()}
       className="p-2 rounded-lg bg-[#2F81F7] hover:bg-[#2F81F7] text-slate-900 disabled:opacity-50 transition active:scale-95 flex items-center justify-center shrink-0"
      >
       <Send className="w-3.5 h-3.5" />
      </button>
     </form>
    </div>
   )}

   {/* Floating Toggle button */}
   <button 
    onClick={() => setIsOpen(!isOpen)}
    className="px-4 py-2.5 rounded-full bg-[#2F81F7] hover:from-blue-500 hover:to-slate-500 text-slate-900 font-bold text-xs flex items-center gap-2 transition duration-300 hover:scale-105 active:scale-95 group border border-[#2F81F7]/20"
   >
    {isOpen ? (
     <>
      <X className="w-4 h-4" />
      Close Chat
     </>
    ) : (
     <>
      <MessageSquare className="w-4 h-4 group-hover:animate-bounce" />
      Ask QA Assistant
     </>
    )}
   </button>
  </div>
 );
}
