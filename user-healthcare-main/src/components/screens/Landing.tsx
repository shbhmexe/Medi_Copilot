import React from 'react';
import { ArrowRight, Sparkles, Shield, Activity, FileText, Zap, BarChart3, ChevronRight, PlayCircle } from 'lucide-react';
import { Card, Button } from '@/src/components/ui/Base';
import { Navbar } from '@/src/components/layout/Navbar';
import { motion } from 'motion/react';
import { cn } from '@/src/lib/utils';

export const Landing = ({ onGetStarted }: { onGetStarted: () => void }) => {
  return (
    <div className="min-h-screen bg-surface overflow-x-hidden">
      <Navbar onGetStarted={onGetStarted} />
      
      {/* Hero Section */}
      <section className="relative pt-40 pb-32 px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-10"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/5 border border-primary/10">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-[10px] font-bold text-primary uppercase tracking-[0.2em]">V2.4 Precision Engine Live</span>
            </div>

            <h1 className="text-6xl md:text-8xl font-serif text-on-surface leading-[0.95] tracking-tight">
              The <span className="text-primary italic">Digital Surgeon</span> For Every Clinic.
            </h1>

            <p className="text-xl text-on-surface-variant max-w-lg leading-relaxed font-medium">
              Empowering 500,000+ doctors across Tier-2/3 India with instant AI diagnostics and seamless clinical automation.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-6">
              <Button 
                size="lg" 
                className="w-full sm:w-auto h-16 px-12 rounded-2xl shadow-2xl shadow-primary/30 text-xs font-bold tracking-widest uppercase"
                onClick={onGetStarted}
              >
                Initiate Portal <ArrowRight size={20} className="ml-2" />
              </Button>
            </div>
          </motion.div>

          {/* Product Preview - Styled like the image */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, x: 30 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            transition={{ duration: 1 }}
            className="relative"
          >
            <div className="relative z-10 bg-[#1e293b] rounded-[2.5rem] p-8 shadow-[0_40px_80px_-15px_rgba(0,0,0,0.3)] border border-white/5 overflow-hidden">
              {/* Mock UI Header */}
              <div className="flex items-center justify-between mb-12">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
                </div>
                <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <span className="text-[8px] font-bold text-white/40 uppercase tracking-widest">Logic Layer L4</span>
                </div>
              </div>

              {/* Mock UI Content */}
              <div className="space-y-8">
                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Differential DX</p>
                    <p className="text-[10px] font-bold text-white/40">92.4%</p>
                  </div>
                  <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-4">
                    <h3 className="text-2xl font-serif text-white">Myocardial Infarction</h3>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: '92%' }}
                        transition={{ duration: 1.5, delay: 0.5 }}
                        className="h-full bg-primary shadow-[0_0_20px_rgba(0,168,89,0.5)]" 
                      />
                    </div>
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-primary/5 border border-primary/20 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
                    <Shield size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Safety Engine</p>
                    <p className="text-xs text-white/60 font-medium">No Drug Interactions Detected</p>
                  </div>
                </div>
              </div>

              {/* Decorative background glow */}
              <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-primary/20 rounded-full blur-[100px]" />
            </div>

            {/* Floating Elements */}
            <motion.div
              animate={{ y: [0, -15, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -left-12 top-1/3 z-20"
            >
              <div className="w-20 h-20 bg-white rounded-3xl shadow-2xl flex items-center justify-center text-primary border border-surface-high">
                <Activity size={32} />
              </div>
            </motion.div>

            <motion.div
              animate={{ y: [0, 15, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute -right-8 -bottom-8 z-20"
            >
              <div className="bg-white p-6 rounded-3xl shadow-2xl border border-surface-high text-center">
                <p className="text-4xl font-serif text-on-surface">97%</p>
                <p className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-widest">Recall</p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

const Badge = ({ children, status, className }: { children: React.ReactNode, status: string, className?: string }) => {
  return (
    <span className={cn(
      "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
      status === "Info" ? "bg-primary/10 text-primary" : "bg-surface-low text-on-surface-variant",
      className
    )}>
      {children}
    </span>
  );
};
