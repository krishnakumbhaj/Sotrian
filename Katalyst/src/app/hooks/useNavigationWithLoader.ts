// hooks/useNavigationWithLoader.ts
import { useRouter } from 'next/navigation';
import { useLoading } from '@/app/context/LoadingContext';

export const useNavigationWithLoader = () => {
  const router = useRouter();
  const { setLoading } = useLoading();

  const navigate = async (url: string) => {
    setLoading(true);
    await router.push(url);
    setLoading(false);
  };

  return { navigate };
};
