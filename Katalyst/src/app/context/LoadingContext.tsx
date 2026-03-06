// context/LoadingContext.tsx
'use client';

import React, { createContext, useContext, useState } from 'react';
import GlobalLoader from '@/components/GlobalLoader';

interface LoadingContextType {
  loading: boolean;
  setLoading: (loading: boolean) => void;
  loadingMessage: string;
  setLoadingMessage: (message: string) => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (!context) throw new Error("useLoading must be used within LoadingProvider");
  return context;
};

export const LoadingProvider = ({ children }: { children: React.ReactNode }) => {
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Loading...');

  return (
    <LoadingContext.Provider value={{ loading, setLoading, loadingMessage, setLoadingMessage }}>
      {loading && <GlobalLoader message={loadingMessage} />}
      {children}
    </LoadingContext.Provider>
  );
};
