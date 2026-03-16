import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000, // 30초
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
