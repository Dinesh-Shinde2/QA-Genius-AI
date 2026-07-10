'use client';

import { useState, useRef, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { 
  Sparkles, 
  X, 
  Send, 
  MessageSquare, 
  Bot, 
  User, 
  Loader2, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Square, 
  Sun, 
  Moon, 
  Copy,
  Check
} from 'lucide-react';

export default function QACopilot() {
  const { activeProject, sendVoiceAssistantMessage } = useAppStore();
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Theme state: dark mode by default, can toggle to light
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  
  // Voice settings
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  
  // Browser SpeechSynthesis Voices
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>('');

  const [chatHistory, setChatHistory] = useState<any[]>([
    {
      role: 'assistant',
      content: 'Hi! I am your Senior QA Assistant. I am ready to help you with anything—testing concepts, automation scripts, test cases, or general chat. You can talk to me directly using the microphone button, and I will speak my responses back to you. How can I help you today?'
    }
  ]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const transcriptRef = useRef('');

  // Sync transcription ref for recognition callbacks
  useEffect(() => {
    transcriptRef.current = interimTranscript;
  }, [interimTranscript]);

  // Load browser SpeechSynthesis voices
  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      const updateVoices = () => {
        const allVoices = window.speechSynthesis.getVoices();
        
        // Filter for English and Hindi voices primarily for clean list
        const filteredVoices = allVoices.filter(v => v.lang.startsWith('en') || v.lang.startsWith('hi'));
        setVoices(filteredVoices.length > 0 ? filteredVoices : allVoices);
        
        // Try to select a default Hindi voice or a premium natural English voice
        const defaultVoice = allVoices.find(v => v.lang.startsWith('hi') || v.name.includes('Hindi')) ||
                             allVoices.find(v => v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Samantha'))) ||
                             allVoices.find(v => v.lang.startsWith('en')) ||
                             allVoices[0];
        if (defaultVoice) {
          setSelectedVoiceName(prev => prev || defaultVoice.name);
        }
      };
      
      updateVoices();
      // Chrome/Edge load voices asynchronously
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }, []);

  const suggestionPills = [
    "Generate login page test cases.",
    "Create bug report for OTP failure.",
    "Explain severity vs priority.",
    "Generate Playwright script for login.",
    "Create API test cases for contact upload."
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [isOpen, chatHistory, loading, interimTranscript]);

  // Speech Recognition Setup
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = false;
        rec.interimResults = true;
        rec.lang = 'en-US';

        rec.onstart = () => {
          setIsListening(true);
          setInterimTranscript('');
          // Stop speaking when user starts talking
          stopSpeaking();
        };

        rec.onresult = (event: any) => {
          let interim = '';
          let final = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              final += event.results[i][0].transcript;
            } else {
              interim += event.results[i][0].transcript;
            }
          }
          setInterimTranscript(final || interim);
        };

        rec.onerror = (event: any) => {
          console.error('Speech recognition error:', event);
          setIsListening(false);
        };

        rec.onend = () => {
          setIsListening(false);
          const text = transcriptRef.current.trim();
          if (text) {
            handleSend(text);
          }
          setInterimTranscript('');
        };

        recognitionRef.current = rec;
      }
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      stopSpeaking();
    };
  }, []);

  if (!activeProject) return null;

  // Toggle Microphone
  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.");
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.error("Failed to start speech recognition:", e);
      }
    }
  };

  // Text to Speech
  const speak = (text: string) => {
    if (!voiceEnabled || typeof window === 'undefined' || !window.speechSynthesis) return;

    stopSpeaking();

    // Clean text: strip markdown code blocks and format properly so TTS reads naturally
    let cleanText = text.replace(/```[\s\S]*?```/g, '\n[I have generated the code artifact for you. Please inspect the code panel in the chat window.]\n');
    cleanText = cleanText
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // link tags
      .replace(/[*_#`~|]/g, '') // markdown style characters
      .replace(/-\s+/g, '') // bullet markers
      .replace(/TC-\d+/g, 'Test case')
      .replace(/BUG-\d+/g, 'Bug')
      .trim();

    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    const voicesList = window.speechSynthesis.getVoices();
    const selectedVoice = voicesList.find(v => v.name === selectedVoiceName);
    
    if (selectedVoice) {
      utterance.voice = selectedVoice;
      // Pace adjustments for a natural voice flow
      if (selectedVoice.lang.startsWith('hi')) {
        utterance.rate = 0.95; // Slower Hindi pacing is more natural
        utterance.pitch = 1.05;
      } else {
        utterance.rate = 1.0;
      }
    } else {
      // Fallback
      let voice = voicesList.find(v => v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Samantha')));
      if (!voice) {
        voice = voicesList.find(v => v.lang.startsWith('en')) || voicesList[0];
      }
      if (voice) {
        utterance.voice = voice;
      }
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  function stopSpeaking() {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }

  async function handleSend(textToSend: string) {
    if (!activeProject) return;
    if (!textToSend.trim() || loading) return;
    
    // Stop ongoing speech when a new query is sent
    stopSpeaking();

    const userMessage = { role: 'user', content: textToSend };
    setChatHistory(prev => [...prev, userMessage]);
    setMessage('');
    setLoading(true);

    try {
      const historyPayload = chatHistory.slice(-10);
      const response = await sendVoiceAssistantMessage(activeProject.id, textToSend, historyPayload);
      
      const botResponse = response || "I couldn't generate a response. Please check your AI studio configuration.";
      setChatHistory(prev => [...prev, { 
        role: 'assistant', 
        content: botResponse
      }]);
      
      // Auto-speak response if enabled
      speak(botResponse);
    } catch (err) {
      setChatHistory(prev => [...prev, { 
        role: 'assistant', 
        content: 'Failed to communicate with the QA Assistant. Verify your API token endpoints.' 
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = (code: string, idx: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const renderMessageContent = (content: string) => {
    const parts = content.split(/(```[\s\S]*?```)/g);
    return parts.map((part, index) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        const match = part.match(/```(\w*)\n([\s\S]*?)```/);
        const language = match ? match[1] : '';
        const code = match ? match[2] : part.slice(3, -3);
        return (
          <div key={index} className="my-2 border border-slate-700/40 rounded-xl overflow-hidden font-mono text-[10px] text-left shadow-md">
            <div className="bg-slate-900 px-3 py-1.5 text-[9px] font-sans text-slate-400 font-bold uppercase tracking-wider flex justify-between items-center border-b border-slate-800">
              <span>{language || 'code'}</span>
              <button 
                onClick={() => handleCopyCode(code, index)}
                className="hover:text-slate-100 transition text-[9px] flex items-center gap-1 text-slate-400"
              >
                {copiedIndex === index ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    Copy
                  </>
                )}
              </button>
            </div>
            <pre className="bg-slate-950 p-3.5 overflow-x-auto text-emerald-400 whitespace-pre">
              <code>{code}</code>
            </pre>
          </div>
        );
      }
      
      const lines = part.split('\n');
      return (
        <div key={index} className="whitespace-pre-wrap leading-relaxed">
          {lines.map((line, lIdx) => {
            if (line.startsWith('### ')) {
              return <h4 key={lIdx} className="font-bold text-xs mt-3 mb-1 text-blue-500">{line.slice(4)}</h4>;
            }
            if (line.startsWith('## ')) {
              return <h3 key={lIdx} className="font-extrabold text-sm mt-4 mb-1 text-blue-500">{line.slice(3)}</h3>;
            }
            if (line.startsWith('- ')) {
              return <li key={lIdx} className="ml-4 list-disc my-0.5">{line.slice(2)}</li>;
            }
            return <p key={lIdx} className="my-1.5">{line}</p>;
          })}
        </div>
      );
    });
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Waveform Keyframes Style Block */}
      <style>{`
        @keyframes voice-wave {
          0%, 100% { transform: scaleY(0.2); }
          50% { transform: scaleY(1.4); }
        }
        .wave-bar-anim {
          animation: voice-wave 1.1s ease-in-out infinite;
          transform-origin: center;
        }
        .wave-bar-anim:nth-child(1) { animation-delay: 0.1s; }
        .wave-bar-anim:nth-child(2) { animation-delay: 0.3s; }
        .wave-bar-anim:nth-child(3) { animation-delay: 0.5s; }
        .wave-bar-anim:nth-child(4) { animation-delay: 0.2s; }
        .wave-bar-anim:nth-child(5) { animation-delay: 0.4s; }
        .wave-bar-anim:nth-child(6) { animation-delay: 0.6s; }
      `}</style>

      {/* Chat Window Panel */}
      {isOpen && (
        <div className={`w-85 sm:w-100 h-[600px] mb-4 border rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300 backdrop-blur-2xl transition-all ${
          theme === 'dark' 
            ? 'bg-slate-950/98 border-slate-800 text-slate-100 shadow-[0_10px_50px_rgba(0,0,0,0.8)]' 
            : 'bg-white/98 border-slate-200 text-slate-800 shadow-[0_10px_40px_rgba(0,0,0,0.15)]'
        }`}>
          {/* Header */}
          <div className={`p-4 border-b flex items-center justify-between transition-colors ${
            theme === 'dark' ? 'border-slate-800 bg-slate-900/40' : 'border-slate-100 bg-slate-50/50'
          }`}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg">
                <Sparkles className="w-4 h-4 text-white animate-pulse" />
              </div>
              <div>
                <h3 className="text-xs font-black tracking-wider uppercase">Genius Voice Assistant</h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`w-2.5 h-2.5 rounded-full ${isListening ? 'bg-emerald-500 animate-ping' : 'bg-blue-500'}`}></span>
                  <span className={`text-[9px] font-mono font-bold tracking-widest ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>
                    {isListening ? 'LISTENING...' : 'SENIOR QA ACTIVE'}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Header controls */}
            <div className="flex items-center gap-2">
              {/* Theme Toggle */}
              <button 
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className={`p-1.5 rounded-lg transition-all ${
                  theme === 'dark' ? 'hover:bg-slate-800 text-amber-400' : 'hover:bg-slate-200 text-slate-600'
                }`}
                title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              >
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>

              {/* TTS Toggle */}
              <button 
                onClick={() => {
                  setVoiceEnabled(!voiceEnabled);
                  if (voiceEnabled) stopSpeaking();
                }}
                className={`p-1.5 rounded-lg transition-all ${
                  voiceEnabled 
                    ? (theme === 'dark' ? 'text-blue-400 hover:bg-slate-800' : 'text-blue-600 hover:bg-slate-200')
                    : 'text-slate-400 hover:bg-slate-800'
                }`}
                title={voiceEnabled ? "Mute Voice Output" : "Enable Voice Output"}
              >
                {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>

              {/* Close Button */}
              <button 
                onClick={() => {
                  setIsOpen(false);
                  stopSpeaking();
                }}
                className={`p-1.5 rounded-lg transition ${
                  theme === 'dark' ? 'text-slate-400 hover:text-slate-100 hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Voice Settings Selector */}
          {voiceEnabled && voices.length > 0 && (
            <div className={`px-4 py-2 border-b flex items-center justify-between text-[10px] gap-2 transition-all ${
              theme === 'dark' ? 'border-slate-800 bg-slate-900/25 text-slate-400' : 'border-slate-150 bg-slate-50/40 text-slate-650'
            }`}>
              <span className="font-bold shrink-0">Voice / Gender:</span>
              <select
                value={selectedVoiceName}
                onChange={(e) => setSelectedVoiceName(e.target.value)}
                className={`flex-1 text-[10px] rounded-lg px-2 py-1.5 border outline-none max-w-[75%] truncate transition focus:ring-1 focus:ring-blue-500/30 ${
                  theme === 'dark' 
                    ? 'bg-slate-900 border-slate-850 text-slate-200 focus:border-blue-500' 
                    : 'bg-white border-slate-250 text-slate-800 focus:border-blue-500'
                }`}
              >
                {voices.map((v) => {
                  let nameLower = v.name.toLowerCase();
                  let gender = nameLower.includes('female') || nameLower.includes('zira') || nameLower.includes('kalpana') || nameLower.includes('samantha') || nameLower.includes('hazel') || nameLower.includes('haruka') ? 'Female 👩' : 'Male 👨';
                  let langName = v.lang.startsWith('hi') ? 'Hindi 🇮🇳' : v.lang.startsWith('en') ? 'English 🇬🇧' : v.lang;
                  // Simplify the voice name display
                  let displayName = v.name.replace("Microsoft", "").replace("Google", "").replace("Natural", "").replace("Desktop", "").trim();
                  return (
                    <option key={v.name} value={v.name}>
                      {displayName} ({langName} - {gender})
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 scrollbar-thin font-sans">
            {chatHistory.map((msg, idx) => {
              const isBot = msg.role === 'assistant';
              return (
                <div 
                  key={idx} 
                  className={`flex gap-3 max-w-[85%] ${isBot ? 'self-start' : 'self-end flex-row-reverse'}`}
                >
                  <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-[10px] shrink-0 shadow-md border ${
                    isBot 
                      ? 'bg-blue-600/10 border-blue-500/35 text-blue-400' 
                      : (theme === 'dark' ? 'bg-slate-805 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-600')
                  }`}>
                    {isBot ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                  </div>
                  <div className={`p-3 rounded-2xl text-[11px] leading-relaxed shadow-sm ${
                    isBot 
                      ? (theme === 'dark' 
                          ? 'bg-slate-900/60 border border-slate-800 text-slate-100 rounded-tl-none' 
                          : 'bg-slate-50 border border-slate-200 text-slate-800 rounded-tl-none')
                      : 'bg-blue-650 text-white rounded-tr-none'
                  }`}>
                    {renderMessageContent(msg.content)}
                  </div>
                </div>
              );
            })}
            
            {/* Live speech transcription display */}
            {isListening && interimTranscript && (
              <div className="flex gap-3 max-w-[85%] self-end flex-row-reverse">
                <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-[10px] shrink-0 bg-emerald-600/10 border border-emerald-500/40 text-emerald-400 shadow-md animate-pulse`}>
                  <User className="w-4 h-4" />
                </div>
                <div className="p-3 bg-emerald-600 text-white rounded-2xl rounded-tr-none text-[11px] leading-relaxed shadow-sm font-medium animate-pulse">
                  <p className="italic">{interimTranscript}...</p>
                </div>
              </div>
            )}

            {/* AI Generating Indicator */}
            {loading && (
              <div className="flex gap-3 max-w-[80%] self-start animate-pulse">
                <div className="w-7 h-7 rounded-xl bg-blue-600/10 border border-blue-500/35 text-blue-400 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
                <div className={`p-3 border rounded-2xl rounded-tl-none flex items-center gap-2 text-[10px] ${
                  theme === 'dark' ? 'bg-slate-900/60 border-slate-800 text-blue-400' : 'bg-slate-50 border-slate-200 text-blue-600'
                }`}>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Thinking...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Waveform / Live Speech control overlay when listening */}
          {isListening && (
            <div className={`p-4 border-t border-b flex flex-col items-center justify-center gap-2 ${
              theme === 'dark' ? 'bg-slate-950/90 border-slate-800' : 'bg-slate-50/95 border-slate-200'
            }`}>
              <div className="flex items-center gap-1.5 h-8 justify-center">
                <div className="w-1.5 bg-blue-550 rounded-full wave-bar-anim h-4"></div>
                <div className="w-1.5 bg-indigo-500 rounded-full wave-bar-anim h-7"></div>
                <div className="w-1.5 bg-blue-500 rounded-full wave-bar-anim h-5"></div>
                <div className="w-1.5 bg-violet-500 rounded-full wave-bar-anim h-8"></div>
                <div className="w-1.5 bg-blue-550 rounded-full wave-bar-anim h-6"></div>
                <div className="w-1.5 bg-indigo-500 rounded-full wave-bar-anim h-4"></div>
              </div>
              <p className="text-[10px] font-semibold text-blue-500 tracking-wider uppercase animate-pulse">
                I am listening to your voice... Speak naturally.
              </p>
            </div>
          )}

          {/* Active Speaking Controller */}
          {isSpeaking && (
            <div className={`px-4 py-2 border-t flex items-center justify-between ${
              theme === 'dark' ? 'bg-slate-900/40 border-slate-850' : 'bg-slate-50/50 border-slate-150'
            }`}>
              <div className="flex items-center gap-2 text-slate-400 text-[10px]">
                <Volume2 className="w-3.5 h-3.5 text-blue-500 animate-bounce" />
                <span>Speaking response aloud...</span>
              </div>
              <button 
                onClick={stopSpeaking}
                className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[9px] font-bold flex items-center gap-1 transition active:scale-95 shadow-md shadow-rose-900/20"
              >
                <Square className="w-2.5 h-2.5 fill-white" />
                Stop Speaking
              </button>
            </div>
          )}

          {/* Suggestion pills */}
          {chatHistory.length === 1 && !loading && (
            <div className={`px-4 py-3 border-t flex flex-wrap gap-1.5 ${
              theme === 'dark' ? 'border-slate-850 bg-slate-900/20' : 'border-slate-150 bg-slate-50/20'
            }`}>
              <span className="text-[9px] font-bold text-slate-400 uppercase w-full mb-1">Try voice commands:</span>
              {suggestionPills.map(pill => (
                <button
                  key={pill}
                  onClick={() => handleSend(pill)}
                  className={`px-2.5 py-1.5 rounded-xl border text-[10px] transition font-medium active:scale-95 text-left truncate max-w-full ${
                    theme === 'dark' 
                      ? 'bg-slate-900 border-slate-850 text-slate-300 hover:border-blue-500/50 hover:bg-slate-850 hover:text-white' 
                      : 'bg-white border-slate-200 text-slate-600 hover:border-blue-500/50 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  {pill}
                </button>
              ))}
            </div>
          )}

          {/* Input Box */}
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleSend(message);
            }}
            className={`p-3 border-t flex gap-2 items-center ${
              theme === 'dark' ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-white'
            }`}
          >
            <input 
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ask QA Assistant or talk to me..."
              className={`flex-1 px-3 py-2 text-xs rounded-xl border outline-none transition focus:ring-2 focus:ring-blue-500/20 ${
                theme === 'dark'
                  ? 'bg-slate-900 border-slate-800 text-white focus:border-blue-500'
                  : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
              }`}
              disabled={loading}
            />
            
            {/* Mic Toggle Button */}
            <button 
              type="button"
              onClick={toggleListening}
              className={`p-2 rounded-xl transition active:scale-95 flex items-center justify-center shrink-0 border ${
                isListening 
                  ? 'bg-rose-600 border-rose-500 text-white shadow-[0_0_15px_rgba(220,38,38,0.5)] animate-pulse' 
                  : (theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700' : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-850 hover:bg-slate-100')
              }`}
              title="Voice input (Speech to Text)"
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            {/* Submit Button */}
            <button 
              type="submit"
              disabled={loading || !message.trim()}
              className="p-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 transition active:scale-95 flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/10"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* Floating Toggle button */}
      <button 
        onClick={() => {
          setIsOpen(!isOpen);
          if (isOpen) stopSpeaking();
        }}
        className="px-5 py-3 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs flex items-center gap-2.5 transition-all duration-300 hover:scale-105 active:scale-95 shadow-[0_10px_25px_rgba(37,99,235,0.45)] group border border-blue-500/30"
      >
        {isOpen ? (
          <>
            <X className="w-4 h-4" />
            Close Assistant
          </>
        ) : (
          <>
            <div className="relative flex items-center justify-center">
              <span className="absolute inline-flex h-2.5 w-2.5 rounded-full bg-sky-300 opacity-75 animate-ping"></span>
              <Mic className="w-4 h-4 relative z-10 group-hover:animate-bounce" />
            </div>
            Ask Genius Voice Assistant
          </>
        )}
      </button>
    </div>
  );
}
