import { useEffect, useState } from 'react';
import { useUserStore } from '@/modules/auth/stores/useUserStore';
import { getAccessToken, clearAccessToken } from '@/lib/api';

export const useAuth = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { userProfile, fetchUserProfile, reset } = useUserStore();

  useEffect(() => {
    const initializeAuth = async () => {
      const token = getAccessToken();
      try {
        if (!token) {
          setIsAuthenticated(false);
          reset();
          return;
        }

        await fetchUserProfile();
        setIsAuthenticated(true);
      } catch {
        // Token/cookie might be invalid, clear local auth state.
        clearAccessToken();
        setIsAuthenticated(false);
        reset();
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, [fetchUserProfile, reset]);

  // Update authentication status when userProfile changes
  useEffect(() => {
    setIsAuthenticated(!!userProfile);
  }, [userProfile]);

  return {
    isLoading,
    isAuthenticated,
    userProfile,
  };
};
