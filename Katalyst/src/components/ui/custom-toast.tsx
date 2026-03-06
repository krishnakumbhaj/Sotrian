// components/ui/custom-toast.tsx
'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

// Toast Types
type ToastVariant = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: number;
  title: string;
  description: string;
  variant: ToastVariant;
}

interface ToastContextType {
  toast: (props: Omit<Toast, 'id'>) => void;
}

// Create Context
const ToastContext = createContext<ToastContextType | undefined>(undefined);

// Gradient Card Toast Component
const GradientCardToast: React.FC<Toast & { onClose: () => void }> = ({
  title,
  description,
  variant,
  onClose,
}) => {
  const variants = {
    success: {
      gradient: 'bg-gradient-to-r from-emerald-600 to-teal-600',
      icon: <CheckCircle className="h-5 w-5 text-white" />,
      iconBg: 'bg-emerald-500',
    },
    error: {
      gradient: 'bg-gradient-to-r from-red-600 to-pink-600',
      icon: <XCircle className="h-5 w-5 text-white" />,
      iconBg: 'bg-red-500',
    },
    warning: {
      gradient: 'bg-gradient-to-r from-amber-600 to-orange-600',
      icon: <AlertCircle className="h-5 w-5 text-white" />,
      iconBg: 'bg-amber-500',
    },
    info: {
      gradient: 'bg-gradient-to-r from-blue-600 to-cyan-600',
      icon: <Info className="h-5 w-5 text-white" />,
      iconBg: 'bg-blue-500',
    },
  };

  const currentVariant = variants[variant];

  return (
    <div className="bg-zinc-900 rounded-xl sm:rounded-2xl p-[2px] shadow-2xl w-[calc(100vw-2rem)] sm:min-w-[340px] sm:max-w-md animate-slideIn">
      <div className={`${currentVariant.gradient} rounded-xl sm:rounded-2xl p-[2px]`}>
        <div className="bg-zinc-900 rounded-xl sm:rounded-2xl p-3 sm:p-4">
          <div className="flex items-start gap-2 sm:gap-3">
            <div className={`p-2 sm:p-2.5 rounded-full ${currentVariant.iconBg} flex-shrink-0`}>
              {currentVariant.icon}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-bold text-sm sm:text-base mb-0.5 sm:mb-1">{title}</h3>
              <p className="text-zinc-400 text-xs sm:text-sm leading-snug">{description}</p>
            </div>
            <button
              onClick={onClose}
              className="text-zinc-600 hover:text-white transition flex-shrink-0"
            >
              <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Toast Provider Component
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((props: Omit<Toast, 'id'>) => {
    const id = Date.now();
    const newToast = { ...props, id };
    
    setToasts((prev) => [...prev, newToast]);

    // Auto remove after 5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      
      {/* Toast Container */}
      <div className="fixed top-4 right-4 sm:top-6 sm:right-6 z-50 flex flex-col gap-2 sm:gap-3 max-w-[calc(100vw-2rem)]">
        {toasts.map((t) => (
          <GradientCardToast
            key={t.id}
            {...t}
            onClose={() => removeToast(t.id)}
          />
        ))}
      </div>

      {/* Animation Styles */}
      <style jsx global>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slideIn {
          animation: slideIn 0.3s ease-out;
        }
      `}</style>
    </ToastContext.Provider>
  );
};

// Custom Hook
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};