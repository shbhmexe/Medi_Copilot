import React, { useState } from 'react';
import { 
  HelpCircle, MessageSquare, Mail, PlayCircle, AlertCircle, 
  ChevronRight, Search, Sparkles, Send, Phone, MessageCircle,
  FileText, ShieldCheck, LifeBuoy
} from 'lucide-react';
import { Card, Button, Badge, Modal } from '@/src/components/ui/Base';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/src/lib/utils';

export const HelpCenter = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [isAiHelpOpen, setIsAiHelpOpen] = useState(false);

  const faqs = [
    {
      q: "How accurate is the AI diagnosis?",
      a: "Our AI provides preliminary insights based on clinical data, but it is not a replacement for professional medical advice. Always consult with a qualified healthcare provider for diagnosis and treatment."
    },
    {
      q: "How do I upload my lab reports?",
      a: "You can upload reports by clicking the 'Upload' button on the Dashboard or in the Medical Records section. We support PDF and image formats (JPG, PNG)."
    },
    {
      q: "Is my health data secure?",
      a: "Yes, we use industry-standard encryption and follow strict HIPAA-compliant protocols to ensure your data is protected and private."
    },
    {
      q: "Can I book appointments with specialists?",
      a: "Absolutely. Use the 'Book Visit' feature on the Dashboard to find and schedule appointments with a wide range of specialists."
    }
  ];

  const tutorials = [
    { title: "Getting Started", duration: "2 min", icon: PlayCircle },
    { title: "Understanding AI Insights", duration: "3 min", icon: Sparkles },
    { title: "Managing Medications", duration: "1.5 min", icon: FileText },
  ];

  return (
    <div className="pb-24 pt-6 px-5 lg:px-10 space-y-8 max-w-screen-2xl mx-auto">
      <header className="space-y-4">
        <div>
          <h1 className="text-2xl font-headline font-extrabold">Help Center</h1>
          <p className="text-sm text-on-surface-variant">Find answers, tutorials, and support</p>
        </div>
        
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40" size={20} />
          <input 
            type="text" 
            placeholder="Search for help, articles, or FAQs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-14 pl-12 pr-6 bg-surface-lowest border border-outline-variant/30 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all whisper-shadow"
          />
        </div>
      </header>

      {/* AI Help Assistant Card */}
      <Card className="bg-linear-to-br from-primary to-primary-container text-white p-6 relative overflow-hidden group">
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
        {/* FAQ Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-3 px-1">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <HelpCircle size={18} />
            </div>
            <h2 className="text-sm font-bold text-on-surface uppercase tracking-widest">Common Questions</h2>
          </div>
          
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <Card 
                key={i} 
                className="p-0 border border-outline-variant/20 overflow-hidden cursor-pointer"
                onClick={() => setActiveFaq(activeFaq === i ? null : i)}
              >
                <div className="p-4 flex items-center justify-between">
                  <p className="text-sm font-bold text-on-surface pr-4">{faq.q}</p>
                  <ChevronRight 
                    size={18} 
                    className={cn("text-on-surface-variant/40 transition-transform", activeFaq === i && "rotate-90")} 
                  />
                </div>
                <AnimatePresence>
                  {activeFaq === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="px-4 pb-4"
                    >
                      <p className="text-xs text-on-surface-variant/80 leading-relaxed pt-2 border-t border-outline-variant/10">
                        {faq.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            ))}
          </div>
        </section>

        {/* Tutorials & Support */}
        <div className="space-y-8">
          <section className="space-y-4">
            <div className="flex items-center gap-3 px-1">
              <div className="p-2 rounded-xl bg-tertiary/10 text-tertiary">
                <PlayCircle size={18} />
              </div>
              <h2 className="text-sm font-bold text-on-surface uppercase tracking-widest">Tutorials</h2>
            </div>
            <div className="space-y-3">
              {tutorials.map((tut, i) => {
                const Icon = tut.icon;
                return (
                  <div key={i} className="flex items-center justify-between p-4 bg-surface-lowest border border-outline-variant/20 rounded-2xl hover:bg-surface-low transition-colors cursor-pointer group">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-surface-low rounded-xl text-on-surface-variant group-hover:text-primary transition-colors">
                        <Icon size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-on-surface">{tut.title}</p>
                        <p className="text-[10px] text-on-surface-variant/60 uppercase font-bold tracking-widest">{tut.duration}</p>
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
                <MessageCircle size={24} className="text-primary" />
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

      {/* Report Issue & Disclaimer */}
      <div className="space-y-6 pt-4">
        <Button variant="ghost" className="w-full text-xs font-bold text-on-surface-variant/60 hover:text-primary">
          Report an Issue or Feedback
        </Button>
        
        <Card className="bg-surface-low border-none p-6 rounded-3xl space-y-4">
          <div className="flex items-center gap-3 text-on-surface-variant/40">
            <ShieldCheck size={20} />
            <h4 className="text-xs font-bold uppercase tracking-widest">Medical Disclaimer</h4>
          </div>
          <p className="text-xs text-on-surface-variant/60 leading-relaxed italic">
            Vitalis AI is an assistive health platform designed to provide insights and improve health management. 
            The information provided, including AI diagnosis and lab analysis, is for informational purposes only 
            and does NOT constitute professional medical advice, diagnosis, or treatment. 
            Always seek the advice of your physician or other qualified health provider with any questions you 
            may have regarding a medical condition.
          </p>
        </Card>
      </div>

      {/* AI Help Modal */}
      <Modal 
        isOpen={isAiHelpOpen} 
        onClose={() => setIsAiHelpOpen(false)}
        title="AI Help Assistant"
      >
        <div className="space-y-6">
          <div className="bg-surface-low p-4 rounded-2xl space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white shrink-0">
                <Sparkles size={16} />
              </div>
              <div className="bg-white p-3 rounded-2xl rounded-tl-none shadow-sm">
                <p className="text-sm text-on-surface">Hello! I'm your Vitalis AI support assistant. How can I help you navigate the app today?</p>
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-widest px-1">Suggested Topics</p>
            <div className="flex flex-wrap gap-2">
              {["How to book a doctor?", "Syncing my Apple Watch", "Exporting my data"].map(topic => (
                <button key={topic} className="px-3 py-1.5 bg-surface-low hover:bg-primary/10 hover:text-primary rounded-full text-xs font-medium transition-colors border border-outline-variant/10">
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
            <button className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-primary text-white rounded-lg active:scale-90 transition-transform">
              <Send size={16} />
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
