// components/AppWrapper.tsx
'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useLoading } from '@/app/context/LoadingContext';

const AppWrapper = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const { setLoading, setLoadingMessage } = useLoading();

  useEffect(() => {
    // Route change started
    setLoading(true);
    setLoadingMessage('Loading...');

    // Route change completed
    const timer = setTimeout(() => {
      setLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [pathname, setLoading, setLoadingMessage]);

  return <>{children}</>;
};

export default AppWrapper;
