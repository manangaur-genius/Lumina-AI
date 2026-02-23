import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageSquare, 
  GraduationCap, 
  Gamepad2, 
  Book, 
  Mic, 
  Send, 
  Volume2, 
  VolumeX, 
  ArrowLeft, 
  Plus, 
  Trash2, 
  History,
  Sparkles,
  Search,
  X,
  RotateCcw
} from 'lucide-react';
import Markdown from 'react-markdown';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { getChat, generateImage, connectLive } from './services/geminiService';
import { Games } from './components/Games';

// --- Utility for Tailwind classes ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Constants ---
const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'Hindi' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'ja', name: 'Japanese' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ru', name: 'Russian' },
  { code: 'ar', name: 'Arabic' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'it', name: 'Italian' },
  { code: 'ko', name: 'Korean' },
];

const WOLF_LOGO_URL = "https://cdn1.vectorstock.com/i/1000x1000/06/64/wolf-howling-at-the-moon-logo-vector-42730664.jpg";

// --- Components ---

const WolfLogo = ({ className }: { className?: string }) => (
  <div className={cn("relative overflow-hidden rounded-full bg-sky-500/10 p-1", className)}>
    <img 
      src={WOLF_LOGO_URL} 
      alt="Lumina Wolf" 
      className="w-full h-full object-contain mix-blend-screen brightness-125"
      referrerPolicy="no-referrer"
    />
  </div>
);

const TypewriterText = ({ text, onComplete }: { text: string; onComplete?: () => void }) => {
  const [displayed, setDisplayed] = useState('');
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (index < text.length) {
      const timeout = setTimeout(() => {
        setDisplayed(prev => prev + text[index]);
        setIndex(prev => prev + 1);
      }, 15);
      return () => clearTimeout(timeout);
    } else if (onComplete) {
      onComplete();
    }
  }, [index, text]);

  return (
    <div className="inline">
      {displayed}
      {index < text.length && (
        <motion.span
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 0.8, repeat: Infinity }}
          className="inline-block w-2 h-4 ml-1 bg-sky-400 align-middle"
        />
      )}
    </div>
  );
};

// --- Main App Component ---

export default function App() {
  const [language, setLanguage] = useState<string | null>(() => localStorage.getItem('lumina_lang'));
  const [mode, setMode] = useState<'home' | 'chat' | 'learn' | 'games' | 'dictionary' | 'live'>('home');
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [chats, setChats] = useState<any[]>(() => {
    const saved = localStorage.getItem('lumina_chats');
    return saved ? JSON.parse(saved) : [];
  });
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Live Voice State
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [isLuminaSpeaking, setIsLuminaSpeaking] = useState(false);
  const [isLuminaThinking, setIsLuminaThinking] = useState(false);
  const [liveVisualizerData, setLiveVisualizerData] = useState<number[]>(new Array(20).fill(0));
  const [luminaVisualizerData, setLuminaVisualizerData] = useState<number[]>(new Array(20).fill(0));
  const liveSessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const currentAudioSourceRef = useRef<AudioBufferSourceNode | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  useEffect(() => {
    localStorage.setItem('lumina_chats', JSON.stringify(chats));
  }, [chats]);

  const handleLanguageSelect = (code: string) => {
    setLanguage(code);
    localStorage.setItem('lumina_lang', code);
  };

  const startNewChat = (initialMode: any = 'chat') => {
    const newChat = {
      id: Date.now().toString(),
      title: 'New Conversation',
      mode: initialMode,
      messages: [],
      timestamp: new Date(),
    };
    setChats([newChat, ...chats]);
    setActiveChatId(newChat.id);
    setMessages([]);
    setMode(initialMode);
    setIsSidebarOpen(false);
  };

  const deleteChat = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextChats = chats.filter(c => c.id !== id);
    setChats(nextChats);
    if (activeChatId === id) {
      setActiveChatId(null);
      setMessages([]);
      setMode('home');
    }
  };

  const handleSendMessage = async (overrideInput?: string) => {
    const text = overrideInput || input;
    if (!text.trim() || !activeChatId) return;

    const userMsg = { id: Date.now().toString(), role: 'user', content: text, timestamp: new Date() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);

    try {
      const chat = getChat(language!, mode);
      const response = await chat.sendMessage({ message: text });
      
      const assistantMsg = { 
        id: (Date.now() + 1).toString(), 
        role: 'assistant', 
        content: response.text, 
        timestamp: new Date() 
      };

      // Update chat title if it's the first message
      if (updatedMessages.length === 1) {
        setChats(prev => prev.map(c => c.id === activeChatId ? { ...c, title: text.slice(0, 30) + (text.length > 30 ? '...' : '') } : c));
      }

      setMessages([...updatedMessages, assistantMsg]);
      
      // Update chat history
      setChats(prev => prev.map(c => c.id === activeChatId ? { ...c, messages: [...updatedMessages, assistantMsg] } : c));

      // Handle image generation if requested
      if (text.toLowerCase().includes('generate') || text.toLowerCase().includes('draw') || text.toLowerCase().includes('show me')) {
        const imageUrl = await generateImage(text);
        if (imageUrl) {
          const imageMsg = { 
            id: (Date.now() + 2).toString(), 
            role: 'assistant', 
            content: "I've generated this image for you:", 
            imageUrl, 
            timestamp: new Date() 
          };
          setMessages(prev => [...prev, imageMsg]);
          setChats(prev => prev.map(c => c.id === activeChatId ? { ...c, messages: [...c.messages, imageMsg] } : c));
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Live Voice Logic ---

  const stopLiveVoice = async () => {
    if (liveSessionRef.current) {
      await liveSessionRef.current.close();
      liveSessionRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      await audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (currentAudioSourceRef.current) {
      currentAudioSourceRef.current.stop();
      currentAudioSourceRef.current = null;
    }
    setIsLiveActive(false);
    setIsLuminaSpeaking(false);
    setIsLuminaThinking(false);
  };

  const startLiveVoice = async () => {
    try {
      setIsLiveActive(true);
      setIsLuminaThinking(true);

      const audioContext = new AudioContext({ sampleRate: 24000 });
      audioContextRef.current = audioContext;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);

      const outputAnalyser = audioContext.createAnalyser();
      outputAnalyser.fftSize = 64;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const outputDataArray = new Uint8Array(outputAnalyser.frequencyBinCount);

      const updateVisualizers = () => {
        if (audioContext.state === 'closed') return;
        
        analyser.getByteFrequencyData(dataArray);
        const normalizedUserData = Array.from(dataArray).slice(0, 20).map(v => v / 255);
        setLiveVisualizerData(normalizedUserData);

        outputAnalyser.getByteFrequencyData(outputDataArray);
        const normalizedLuminaData = Array.from(outputDataArray).slice(0, 20).map(v => v / 255);
        setLuminaVisualizerData(normalizedLuminaData);

        requestAnimationFrame(updateVisualizers);
      };
      requestAnimationFrame(updateVisualizers);

      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      source.connect(processor);
      processor.connect(audioContext.destination);

      const session = await connectLive({
        onopen: () => {
          setIsLuminaThinking(false);
          console.log("Live session opened");
        },
        onmessage: async (message: any) => {
          if (message.serverContent?.modelTurn) {
            setIsLuminaSpeaking(true);
            setIsLuminaThinking(false);
            const base64Audio = message.serverContent.modelTurn.parts[0]?.inlineData?.data;
            if (base64Audio) {
              const audioData = Uint8Array.from(atob(base64Audio), c => c.charCodeAt(0)).buffer;
              const audioBuffer = await audioContext.decodeAudioData(audioData);
              const source = audioContext.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outputAnalyser);
              source.connect(audioContext.destination);
              
              if (currentAudioSourceRef.current) {
                currentAudioSourceRef.current.stop();
              }
              currentAudioSourceRef.current = source;
              
              source.onended = () => {
                if (currentAudioSourceRef.current === source) {
                  setIsLuminaSpeaking(false);
                  currentAudioSourceRef.current = null;
                }
              };
              source.start();
            }
          }
          if (message.serverContent?.interrupted) {
            if (currentAudioSourceRef.current) {
              currentAudioSourceRef.current.stop();
              currentAudioSourceRef.current = null;
            }
            setIsLuminaSpeaking(false);
          }
        }
      }, language!);

      liveSessionRef.current = session;

      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        const pcmData = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          pcmData[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
        }
        const base64Data = btoa(String.fromCharCode(...new Uint8Array(pcmData.buffer)));
        session.sendRealtimeInput({
          media: { data: base64Data, mimeType: 'audio/pcm;rate=24000' }
        });
      };

    } catch (err) {
      console.error(err);
      stopLiveVoice();
    }
  };

  // --- Renderers ---

  if (!language) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute inset-0 atmosphere opacity-40" />
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 w-full max-w-2xl glass-panel p-8 rounded-3xl text-center"
        >
          <WolfLogo className="w-24 h-24 mx-auto mb-6" />
          <h1 className="text-4xl font-medium tracking-tight mb-2">Welcome to Lumina</h1>
          <p className="text-white/60 mb-8">Choose your preferred language to begin</p>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {LANGUAGES.map(lang => (
              <button
                key={lang.code}
                onClick={() => handleLanguageSelect(lang.name)}
                className="p-4 rounded-xl border border-white/10 hover:bg-sky-500/20 hover:border-sky-500/50 transition-all text-sm font-medium"
              >
                {lang.name}
              </button>
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col relative overflow-hidden font-sans">
      <div className="absolute inset-0 atmosphere opacity-30 pointer-events-none" />
      
      {/* Header */}
      <header className="relative z-20 h-16 border-bottom border-white/5 flex items-center justify-between px-4 sm:px-6 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors lg:hidden"
          >
            <History className="w-5 h-5 text-white/60" />
          </button>
          <button onClick={() => setMode('home')} className="flex items-center gap-3 group">
            <WolfLogo className="w-10 h-10 group-hover:scale-110 transition-transform" />
            <span className="text-xl font-medium tracking-tight hidden sm:inline">Lumina</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsSoundEnabled(!isSoundEnabled)}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            {isSoundEnabled ? <Volume2 className="w-5 h-5 text-sky-400" /> : <VolumeX className="w-5 h-5 text-white/40" />}
          </button>
          <div className="h-6 w-px bg-white/10 mx-2" />
          <div className="flex flex-col items-end">
            <span className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Owner</span>
            <span className="text-xs font-medium text-sky-400">Manan Gaur</span>
          </div>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden relative z-10">
        {/* Sidebar */}
        <AnimatePresence>
          {(isSidebarOpen || window.innerWidth >= 1024) && (
            <motion.aside
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              className={cn(
                "absolute lg:relative z-30 w-72 h-full glass-panel border-r border-white/5 flex flex-col",
                !isSidebarOpen && "hidden lg:flex"
              )}
            >
              <div className="p-4">
                <button 
                  onClick={() => startNewChat()}
                  className="w-full flex items-center justify-center gap-2 p-3 bg-sky-500 hover:bg-sky-400 rounded-xl font-medium transition-colors"
                >
                  <Plus className="w-5 h-5" /> New Chat
                </button>
              </div>
              <div className="flex-1 overflow-auto p-2 space-y-1">
                {chats.map(chat => (
                  <button
                    key={chat.id}
                    onClick={() => {
                      setActiveChatId(chat.id);
                      setMessages(chat.messages);
                      setMode(chat.mode);
                      setIsSidebarOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center justify-between p-3 rounded-xl transition-all text-left group",
                      activeChatId === chat.id ? "bg-white/10 text-sky-400" : "hover:bg-white/5 text-white/60"
                    )}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <MessageSquare className="w-4 h-4 shrink-0" />
                      <span className="truncate text-sm">{chat.title}</span>
                    </div>
                    <button 
                      onClick={(e) => deleteChat(chat.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:text-rose-400 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </button>
                ))}
              </div>
              <div className="p-4 border-t border-white/5">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
                  <div className="w-8 h-8 rounded-full bg-sky-500/20 flex items-center justify-center text-sky-400 text-xs font-bold">
                    {language.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white/40 uppercase tracking-tighter">Language</p>
                    <p className="text-sm font-medium truncate">{language}</p>
                  </div>
                  <button onClick={() => setLanguage(null)} className="text-white/20 hover:text-white transition-colors">
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Content Area */}
        <div className="flex-1 flex flex-col min-w-0 relative">
          <AnimatePresence mode="wait">
            {mode === 'home' ? (
              <motion.div 
                key="home"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex-1 flex flex-col items-center justify-center p-6 text-center"
              >
                <div className="relative mb-8">
                  <div className="absolute inset-0 bg-sky-500 blur-3xl opacity-20 animate-pulse" />
                  <WolfLogo className="w-32 h-32 relative z-10" />
                </div>
                <h2 className="text-3xl sm:text-4xl font-medium tracking-tight mb-4">
                  Talk with Lumina, learn a specific thing<br />or just play intellectual games!
                </h2>
                <p className="text-white/40 max-w-md mb-12">
                  Your sophisticated AI companion optimized for {language}
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 w-full max-w-5xl">
                  {[
                    { id: 'chat', name: 'Just Chat', icon: <MessageSquare />, color: 'bg-sky-500' },
                    { id: 'learn', name: 'Learn', icon: <GraduationCap />, color: 'bg-indigo-500' },
                    { id: 'games', name: 'Games', icon: <Gamepad2 />, color: 'bg-emerald-500' },
                    { id: 'dictionary', name: 'Dictionary', icon: <Book />, color: 'bg-amber-500' },
                    { id: 'live', name: 'Live Voice', icon: <Mic />, color: 'bg-rose-500' },
                  ].map(opt => (
                    <motion.button
                      key={opt.id}
                      whileHover={{ y: -5, scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => opt.id === 'live' ? startLiveVoice() : startNewChat(opt.id)}
                      className="glass-panel p-6 flex flex-col items-center gap-4 hover:bg-white/5 transition-colors"
                    >
                      <div className={cn("p-4 rounded-2xl text-white shadow-lg", opt.color)}>
                        {opt.icon}
                      </div>
                      <span className="font-medium">{opt.name}</span>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            ) : mode === 'games' ? (
              <motion.div key="games" className="flex-1 overflow-hidden">
                <Games language={language} onBack={() => setMode('home')} />
              </motion.div>
            ) : (
              <motion.div 
                key="chat"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex-1 flex flex-col h-full"
              >
                {/* Chat Messages */}
                <div ref={scrollRef} className="flex-1 overflow-auto p-4 sm:p-6 space-y-6">
                  {messages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                      <WolfLogo className="w-16 h-16 mb-4 grayscale" />
                      <p>Start a conversation in {mode} mode</p>
                    </div>
                  )}
                  {messages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "flex gap-4 max-w-3xl",
                        msg.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
                      )}
                    >
                      <div className={cn(
                        "w-9 h-9 rounded-full flex items-center justify-center shrink-0 overflow-hidden",
                        msg.role === 'user' ? "bg-sky-500 text-white" : "bg-white"
                      )}>
                        {msg.role === 'user' ? 'U' : <WolfLogo className="w-7 h-7" />}
                      </div>
                      <div className={cn(
                        "p-4 rounded-2xl text-sm leading-relaxed",
                        msg.role === 'user' ? "bg-sky-500/20 text-sky-100 rounded-tr-none" : "glass-panel rounded-tl-none"
                      )}>
                        {msg.imageUrl && (
                          <div className="mb-3 rounded-lg overflow-hidden border border-white/10">
                            <img src={msg.imageUrl} alt="Generated" className="w-full h-auto" referrerPolicy="no-referrer" />
                          </div>
                        )}
                        <div className="markdown-body">
                          {msg.role === 'assistant' ? (
                            <TypewriterText text={msg.content} />
                          ) : (
                            <Markdown>{msg.content}</Markdown>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  {isLoading && (
                    <div className="flex gap-4">
                      <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center shrink-0 overflow-hidden">
                        <WolfLogo className="w-7 h-7 animate-pulse" />
                      </div>
                      <div className="p-4 rounded-2xl glass-panel rounded-tl-none flex gap-1.5 items-center">
                        <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-1.5 bg-sky-400 rounded-full" />
                        <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 bg-sky-400 rounded-full" />
                        <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 bg-sky-400 rounded-full" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Input Area */}
                <div className="p-4 sm:p-6 border-t border-white/5 backdrop-blur-xl">
                  <div className="max-w-4xl mx-auto relative">
                    <textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendMessage())}
                      placeholder={mode === 'dictionary' ? "Search for a word..." : "Talk to Lumina..."}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-4 pr-24 focus:outline-none focus:border-sky-500/50 transition-all resize-none text-base"
                      rows={1}
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      <button 
                        onClick={() => startLiveVoice()}
                        className="p-2.5 hover:bg-white/10 rounded-xl text-white/40 hover:text-sky-400 transition-all"
                      >
                        <Mic className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => handleSendMessage()}
                        disabled={!input.trim() || isLoading}
                        className="p-2.5 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 disabled:hover:bg-sky-500 rounded-xl text-white transition-all shadow-lg shadow-sky-500/20"
                      >
                        <Send className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Live Voice Overlay */}
      <AnimatePresence>
        {isLiveActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-center p-6"
          >
            <div className="absolute inset-0 atmosphere opacity-40" />
            
            <div className="relative z-10 flex flex-col items-center gap-12 w-full max-w-md">
              <div className="relative">
                <motion.div
                  animate={{ 
                    scale: isLuminaSpeaking ? [1, 1.1, 1] : 1,
                    boxShadow: isLuminaSpeaking ? ["0 0 0px rgba(56,189,248,0)", "0 0 40px rgba(56,189,248,0.3)", "0 0 0px rgba(56,189,248,0)"] : "none"
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-48 h-48 rounded-full glass-panel flex items-center justify-center relative overflow-hidden"
                >
                  <WolfLogo className="w-32 h-32" />
                </motion.div>
                {isLuminaThinking && (
                  <div className="absolute -inset-4 border-2 border-sky-500/20 border-t-sky-500 rounded-full animate-spin" />
                )}
              </div>

              <div className="text-center space-y-2">
                <h2 className="text-2xl font-medium tracking-tight">
                  {isLuminaSpeaking ? "Lumina is speaking..." : isLuminaThinking ? "Thinking..." : "Listening..."}
                </h2>
                <p className="text-white/40 text-sm">Lumina understands {language}</p>
              </div>

              {/* Dual Visualizers */}
              <div className="w-full flex flex-col items-center gap-8">
                {/* User Input Visualizer */}
                <div className="flex items-end gap-1 h-12">
                  {liveVisualizerData.map((val, i) => (
                    <motion.div
                      key={i}
                      animate={{ height: `${Math.max(10, val * 100)}%` }}
                      className="w-1.5 bg-sky-400/40 rounded-full"
                    />
                  ))}
                </div>
                
                {/* Lumina Output Visualizer */}
                <div className="flex items-end gap-1 h-24">
                  {luminaVisualizerData.map((val, i) => (
                    <motion.div
                      key={i}
                      animate={{ 
                        height: `${Math.max(10, val * 100)}%`,
                        backgroundColor: isLuminaSpeaking ? 'rgba(56, 189, 248, 0.8)' : 'rgba(56, 189, 248, 0.2)'
                      }}
                      className="w-3 rounded-full shadow-lg shadow-sky-500/20"
                    />
                  ))}
                </div>
              </div>

              <button
                onClick={stopLiveVoice}
                className="mt-8 px-12 py-4 bg-rose-500 hover:bg-rose-400 rounded-full font-bold tracking-wide transition-all shadow-xl shadow-rose-500/20"
              >
                End Session
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
