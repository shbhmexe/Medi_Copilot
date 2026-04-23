import React, { useState } from 'react';
import { Stethoscope, ChevronDown, ArrowRight, Shield, FileText, Zap, BarChart3, Menu, X } from 'lucide-react';
import { Button } from '@/src/components/ui/Base';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/src/lib/utils';

interface NavbarProps {
  onGetStarted: () => void;
}

export const Navbar = ({ onGetStarted }: NavbarProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-[100] bg-surface/80 backdrop-blur-md border-b border-outline-variant/10">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3 cursor-pointer group">
          <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white shadow-lg shadow-primary/20 transition-transform group-hover:scale-110">
            <Stethoscope size={22} />
          </div>
          <div>
            <h1 className="text-xl font-headline font-extrabold text-on-surface tracking-tight leading-none">MedCoPilot</h1>
            <p className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] mt-0.5">Intelligence</p>
          </div>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center gap-10">
          {['THE ENGINE', 'WORKFLOW', 'COMPLIANCE', 'ACCESS'].map((item) => (
            <button 
              key={item}
              className="text-[11px] font-bold text-on-surface-variant/60 hover:text-on-surface transition-colors tracking-[0.15em]"
            >
              {item}
            </button>
          ))}
        </div>

        {/* Desktop Actions */}
        <div className="hidden lg:flex items-center gap-4">
          <Button 
            size="md" 
            className="rounded-xl px-8 shadow-lg shadow-primary/20 text-[11px] font-bold tracking-widest uppercase h-12"
            onClick={onGetStarted}
          >
            Go to Dashboard
          </Button>
        </div>

        {/* Mobile Menu Toggle */}
        <button 
          className="lg:hidden p-2 text-on-surface-variant"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Navigation Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-surface border-t border-outline-variant/20 overflow-hidden"
          >
            <div className="p-6 space-y-6">
              <div className="space-y-4">
                {['THE ENGINE', 'WORKFLOW', 'COMPLIANCE', 'ACCESS'].map((item) => (
                  <button key={item} className="block w-full text-left text-sm font-bold text-on-surface tracking-widest">{item}</button>
                ))}
              </div>
              <div className="pt-6 border-t border-outline-variant/20">
                <Button className="w-full rounded-xl h-14" onClick={onGetStarted}>Go to Dashboard</Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};
