'use client';

import React from 'react';
import Image from 'next/image';
import Logo from '@/app/images/chat-logo.png';

interface GlobalLoaderProps {
  message?: string;
}

const GlobalLoader: React.FC<GlobalLoaderProps> = ({ message = 'Loading...' }) => {
  return (
    <div className="fixed inset-0 bg-[#262624] flex items-center justify-center z-50">
      <div className="flex flex-col items-center gap-6">
        {/* Animated Logo */}
        <div className="relative">
          <Image
            src={Logo}
            alt="Loading"
            width={80}
            height={80}
            className="rounded-full global-loader-spin"
            priority
          />
          {/* Pulsing ring effect */}
          <div className="absolute inset-0 rounded-full border-4 border-[#0f403b] animate-ping opacity-20" />
        </div>
        
        {/* Loading Message */}
        <div className="flex flex-col items-center gap-2">
          <p className="text-white text-lg font-medium">{message}</p>
          <div className="flex gap-1.5">
            <span className="w-2 h-2 bg-[#0f403b] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-2 h-2 bg-[#0f403b] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-2 h-2 bg-[#0f403b] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>

      <style jsx>{`
        .global-loader-spin {
          animation: globalSpin 2s cubic-bezier(0.68, -0.55, 0.265, 1.55) infinite;
        }

        @keyframes globalSpin {
          0% {
            transform: rotate(0deg) scale(1);
          }
          50% {
            transform: rotate(180deg) scale(1.1);
          }
          100% {
            transform: rotate(360deg) scale(1);
          }
        }
      `}</style>
    </div>
  );
};

export default GlobalLoader;
