import React, { useEffect } from 'react';
import { cn } from '@/src/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'low' | 'high';
}

export const Card: React.FC<CardProps> = ({ className, variant = 'default', children, ...props }) => {
  const variants = {
    default: 'bg-surface-lowest whisper-shadow',
    low: 'bg-surface-low',
    high: 'bg-surface-high',
  };

  return (
    <div
      className={cn(
        'rounded-xl p-4 transition-all',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'tertiary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({
  className,
  variant = 'primary',
  size = 'md',
  children,
  ...props
}) => {
  const variants = {
    primary: 'bg-linear-to-br from-primary to-primary-container text-white active:scale-95',
    secondary: 'bg-surface-high text-on-surface active:scale-95',
    tertiary: 'text-primary hover:bg-primary/5',
    ghost: 'hover:bg-on-surface/5 text-on-surface-variant',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm font-semibold',
    lg: 'px-6 py-3 text-base font-bold',
  };

  return (
    <button
      className={cn(
        'rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50',
        variant === 'secondary' ? 'neumorph-btn' : '',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};

export const Badge = ({
  children,
  status,
  className,
}: {
  children: React.ReactNode;
  status: 'Normal' | 'Attention' | 'Urgent' | 'Success' | 'Info';
  className?: string;
}) => {
  const styles = {
    Normal: 'bg-tertiary-container text-tertiary',
    Attention: 'bg-yellow-100 text-yellow-700',
    Urgent: 'bg-error-container text-error',
    Success: 'bg-tertiary-container text-tertiary',
    Info: 'bg-primary/10 text-primary',
  };

  return (
    <span className={cn('vitality-chip', styles[status], className)}>
      {children}
    </span>
  );
};

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | '6xl' | 'full';
  hideHeader?: boolean;
}

export const Modal: React.FC<ModalProps> = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  className,
  maxWidth = 'lg',
  hideHeader = false
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const maxWidthClasses = {
    sm: 'max-w-[calc(100vw-2rem)] lg:max-w-sm',
    md: 'max-w-[calc(100vw-2rem)] lg:max-w-md',
    lg: 'max-w-[calc(100vw-2rem)] lg:max-w-lg',
    xl: 'max-w-[calc(100vw-2rem)] lg:max-w-xl',
    '2xl': 'max-w-[calc(100vw-2rem)] lg:max-w-2xl',
    '4xl': 'max-w-[calc(100vw-3rem)] lg:max-w-4xl',
    '6xl': 'max-w-[calc(100vw-4rem)] lg:max-w-6xl',
    full: 'max-w-[95vw]',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 lg:p-8">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-on-surface/40 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className={cn(
              "relative w-full bg-surface-lowest shadow-2xl z-[201] flex flex-col",
              "rounded-[2.5rem] overflow-hidden border border-outline-variant/10",
              "max-h-[90vh]",
              maxWidthClasses[maxWidth],
              className
            )}
          >
            {/* Modal Header */}
            {!hideHeader && (
              <div className="flex justify-between items-center p-6 lg:px-10 lg:py-7 border-b border-outline-variant/5 shrink-0 bg-surface-lowest/90 backdrop-blur-md sticky top-0 z-10">
                {title && <h3 className="text-xl font-headline font-extrabold text-on-surface tracking-tight leading-none">{title}</h3>}
                <button 
                  onClick={onClose}
                  className="p-2 hover:bg-surface-low rounded-full transition-all active:scale-90 ml-auto group"
                  aria-label="Close modal"
                >
                  <X size={22} className="text-on-surface-variant group-hover:text-primary transition-colors" />
                </button>
              </div>
            )}

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 lg:px-12 lg:py-10 custom-scrollbar scroll-smooth scrollbar-gutter-stable">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
