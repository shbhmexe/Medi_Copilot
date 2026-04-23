"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bot, Send, Sparkles, User, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

function generateReply(input: string) {
  const value = input.toLowerCase();

  if (value.includes("bp") || value.includes("blood pressure")) {
    return "Keep tracking your blood pressure at the same time each day. If readings stay high for several days, schedule a follow-up with your doctor.";
  }

  if (value.includes("appointment") || value.includes("doctor")) {
    return "You can book or reschedule appointments from the Appointments tab. Try choosing a specialist and the earliest available slot.";
  }

  if (value.includes("report") || value.includes("lab")) {
    return "Upload your report from the dashboard and review the summary in Medical Records. Bring the original report to your next visit as well.";
  }

  return "I can help with reports, appointments, medications, and general health tracking. For medical decisions, please confirm with your doctor.";
}

export function ChatAssistant({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "Hello. I am your Vitalis AI assistant. How can I help you with your health today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const currentInput = input.trim();
    const userMessage: Message = { id: Date.now().toString(), role: "user", content: currentInput };
    setMessages((previous) => [...previous, userMessage]);
    setInput("");
    setIsLoading(true);

    await new Promise((resolve) => setTimeout(resolve, 700));

    setMessages((previous) => [
      ...previous,
      {
        id: `${Date.now()}-assistant`,
        role: "assistant",
        content: generateReply(currentInput),
      },
    ]);
    setIsLoading(false);
  };

  return (
    <AnimatePresence>
      {isOpen ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-on-surface/20 backdrop-blur-sm z-[60]"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-surface-lowest rounded-t-[32px] shadow-2xl z-[70] flex flex-col h-[80vh] overflow-hidden"
          >
            <div className="p-6 border-b border-outline-variant/30 flex items-center justify-between bg-primary text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h2 className="font-headline font-bold">Vitalis AI</h2>
                  <p className="text-[10px] opacity-80 font-bold uppercase tracking-widest">
                    Online Assistant
                  </p>
                </div>
              </div>
              <button type="button" onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn("flex items-end gap-2", message.role === "user" ? "flex-row-reverse" : "flex-row")}
                >
                  <div
                    className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                      message.role === "user" ? "bg-primary/10 text-primary" : "bg-tertiary/10 text-tertiary"
                    )}
                  >
                    {message.role === "user" ? <User size={16} /> : <Bot size={16} />}
                  </div>
                  <div
                    className={cn(
                      "max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed",
                      message.role === "user"
                        ? "bg-primary text-white rounded-br-none"
                        : "bg-surface-low text-on-surface rounded-bl-none"
                    )}
                  >
                    {message.content}
                  </div>
                </div>
              ))}
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-tertiary/10 text-tertiary rounded-lg flex items-center justify-center">
                    <Bot size={16} />
                  </div>
                  <div className="bg-surface-low p-4 rounded-2xl rounded-bl-none text-sm text-on-surface-variant">
                    Thinking...
                  </div>
                </div>
              ) : null}
            </div>

            <div className="p-6 bg-surface-low border-t border-outline-variant/30">
              <div className="relative flex items-center gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void handleSend();
                    }
                  }}
                  placeholder="Ask anything about your health..."
                  className="flex-1 h-14 bg-surface-lowest rounded-2xl px-5 pr-14 text-sm font-medium border border-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => void handleSend()}
                  disabled={!input.trim() || isLoading}
                  className="absolute right-2 w-10 h-10 bg-primary text-white rounded-xl flex items-center justify-center disabled:opacity-50 active:scale-90 transition-transform"
                >
                  <Send size={18} />
                </button>
              </div>
              <p className="text-[10px] text-center text-on-surface-variant/40 mt-3 font-bold uppercase tracking-widest">
                AI may provide inaccurate info. Consult a professional.
              </p>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
