"use client";

import { useState } from "react";
import {
  ChevronRight,
  HelpCircle,
  LifeBuoy,
  Mail,
  PlayCircle,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Button, Card, Modal } from "@/components/patient-portal/ui/base";
import { cn } from "@/lib/utils";

const FAQS = [
  {
    q: "How accurate is the AI diagnosis?",
    a: "Our AI provides preliminary insights based on clinical data, but it is not a replacement for professional medical advice. Always consult a qualified healthcare provider for diagnosis and treatment.",
  },
  {
    q: "How do I upload my lab reports?",
    a: "You can upload reports from the dashboard using the Upload Report action. We currently support PDF and common image formats.",
  },
  {
    q: "Is my health data secure?",
    a: "Yes, we use industry-standard encryption and follow strict HIPAA-aligned privacy practices to protect your data.",
  },
  {
    q: "Can I book appointments with specialists?",
    a: "Absolutely. Use the Book Visit feature on the dashboard or the Appointments tab to schedule with specialists.",
  },
];

const TUTORIALS = [
  { title: "Getting Started", duration: "2 min", icon: PlayCircle },
  { title: "Understanding AI Insights", duration: "3 min", icon: Sparkles },
  { title: "Managing Medications", duration: "1.5 min", icon: PlayCircle },
];

export function HelpCenterScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [isAiHelpOpen, setIsAiHelpOpen] = useState(false);

  return (
    <div className="pb-24 pt-6 px-5 lg:px-10 space-y-8 max-w-screen-2xl mx-auto">
      <header className="space-y-4">
        <div>
          <h1 className="text-2xl font-headline font-extrabold">Help Center</h1>
          <p className="text-sm text-on-surface-variant">Find answers, tutorials, and support</p>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40" size={20} />
          <input
            type="text"
            placeholder="Search for help, articles, or FAQs..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="w-full h-14 pl-12 pr-6 bg-surface-lowest border border-outline-variant/30 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all whisper-shadow"
          />
        </div>
      </header>

      <Card className="bg-gradient-to-br from-primary to-primary-container text-white p-6 relative overflow-hidden group">
        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 backdrop-blur-md rounded-xl">
              <Sparkles size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold">Smart AI Help Assistant</h3>
              <p className="text-xs text-white/70">Instant answers to your app-related queries</p>
            </div>
          </div>
          <Button
            variant="secondary"
            className="bg-white text-primary rounded-xl px-6 py-2.5 text-sm font-extrabold w-full sm:w-auto"
            onClick={() => setIsAiHelpOpen(true)}
          >
            Ask AI Assistant
          </Button>
        </div>
        <div className="absolute -right-10 -top-10 w-48 h-48 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-colors" />
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <section className="space-y-4">
          <div className="flex items-center gap-3 px-1">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <HelpCircle size={18} />
            </div>
            <h2 className="text-sm font-bold text-on-surface uppercase tracking-widest">Common Questions</h2>
          </div>

          <div className="space-y-3">
            {FAQS.map((faq, index) => (
              <Card
                key={faq.q}
                className="p-0 border border-outline-variant/20 overflow-hidden cursor-pointer"
                onClick={() => setActiveFaq(activeFaq === index ? null : index)}
              >
                <div className="p-4 flex items-center justify-between">
                  <p className="text-sm font-bold text-on-surface pr-4">{faq.q}</p>
                  <ChevronRight
                    size={18}
                    className={cn("text-on-surface-variant/40 transition-transform", activeFaq === index ? "rotate-90" : "")}
                  />
                </div>
                <AnimatePresence>
                  {activeFaq === index ? (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="px-4 pb-4"
                    >
                      <p className="text-xs text-on-surface-variant/80 leading-relaxed pt-2 border-t border-outline-variant/10">
                        {faq.a}
                      </p>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </Card>
            ))}
          </div>
        </section>

        <div className="space-y-8">
          <section className="space-y-4">
            <div className="flex items-center gap-3 px-1">
              <div className="p-2 rounded-xl bg-tertiary/10 text-tertiary">
                <PlayCircle size={18} />
              </div>
              <h2 className="text-sm font-bold text-on-surface uppercase tracking-widest">Tutorials</h2>
            </div>
            <div className="space-y-3">
              {TUTORIALS.map((tutorial) => {
                const Icon = tutorial.icon;
                return (
                  <div
                    key={tutorial.title}
                    className="flex items-center justify-between p-4 bg-surface-lowest border border-outline-variant/20 rounded-2xl hover:bg-surface-low transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-surface-low rounded-xl text-on-surface-variant group-hover:text-primary transition-colors">
                        <Icon size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-on-surface">{tutorial.title}</p>
                        <p className="text-[10px] text-on-surface-variant/60 uppercase font-bold tracking-widest">
                          {tutorial.duration}
                        </p>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-on-surface-variant/20" />
                  </div>
                );
              })}
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-3 px-1">
              <div className="p-2 rounded-xl bg-orange-500/10 text-orange-500">
                <LifeBuoy size={18} />
              </div>
              <h2 className="text-sm font-bold text-on-surface uppercase tracking-widest">Contact Support</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="secondary" className="flex-col gap-2 h-24 rounded-2xl border border-outline-variant/30">
                <Sparkles size={24} className="text-primary" />
                <span className="text-xs font-bold">Live Chat</span>
              </Button>
              <Button variant="secondary" className="flex-col gap-2 h-24 rounded-2xl border border-outline-variant/30">
                <Mail size={24} className="text-primary" />
                <span className="text-xs font-bold">Email Us</span>
              </Button>
            </div>
          </section>
        </div>
      </div>

      <Card className="bg-surface-low border-none p-6 rounded-3xl space-y-4">
        <div className="flex items-center gap-3 text-on-surface-variant/40">
          <ShieldCheck size={20} />
          <h4 className="text-xs font-bold uppercase tracking-widest">Medical Disclaimer</h4>
        </div>
        <p className="text-xs text-on-surface-variant/60 leading-relaxed italic">
          Vitalis AI is an assistive health platform designed to provide insights and improve
          health management. Information provided here does not replace professional medical
          advice, diagnosis, or treatment.
        </p>
      </Card>

      <Modal isOpen={isAiHelpOpen} onClose={() => setIsAiHelpOpen(false)} title="AI Help Assistant">
        <div className="space-y-6">
          <div className="bg-surface-low p-4 rounded-2xl space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white shrink-0">
                <Sparkles size={16} />
              </div>
              <div className="bg-white p-3 rounded-2xl rounded-tl-none shadow-sm">
                <p className="text-sm text-on-surface">
                  Hello. I&apos;m your Vitalis AI support assistant. How can I help you navigate the
                  app today?
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-widest px-1">
              Suggested Topics
            </p>
            <div className="flex flex-wrap gap-2">
              {["How to book a doctor?", "Syncing my Apple Watch", "Exporting my data"].map((topic) => (
                <button
                  key={topic}
                  type="button"
                  className="px-3 py-1.5 bg-surface-low hover:bg-primary/10 hover:text-primary rounded-full text-xs font-medium transition-colors border border-outline-variant/10"
                >
                  {topic}
                </button>
              ))}
            </div>
          </div>

          <div className="relative">
            <input
              type="text"
              placeholder="Type your question..."
              className="w-full h-12 pl-4 pr-12 bg-surface-low border border-outline-variant/20 rounded-xl text-sm focus:outline-none"
            />
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-primary text-white rounded-lg active:scale-90 transition-transform"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
