import {
  ApiErrorCode,
  ClientType,
  type AuthResponse,
  type ForgotPasswordInput,
  type LoginInput,
  type MessageResponse,
  type RegisterInput,
  type ResendVerificationInput,
  type ResetPasswordInput,
  type UserPublic,
  type VerifyEmailInput,
} from '@purposemint/contracts';
import { useQueryClient } from '@tanstack/react-query';
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  apiRequest,
  ApiClientError,
  configureAuthBridge,
  refreshAuthSession,
} from '@/lib/api/client';
import {
  getStoredRefreshToken,
  removeStoredRefreshToken,
  storeRefreshToken,
} from '@/lib/auth/token-storage';

export type AuthSession = {
  expiresAt: number;
  user: UserPublic;
};

type AuthContextValue = {
  forgotPassword: (input: ForgotPasswordInput) => Promise<MessageResponse>;
  isAuthenticated: boolean;
  isBootstrapping: boolean;
  login: (input: LoginInput) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  register: (input: RegisterInput) => Promise<AuthResponse>;
  resendVerification: (input: ResendVerificationInput) => Promise<MessageResponse>;
  resetPassword: (input: ResetPasswordInput) => Promise<MessageResponse>;
  session: AuthSession | null;
  verifyEmail: (input: VerifyEmailInput) => Promise<AuthResponse>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const accessTokenRef = useRef<string | null>(null);
  const refreshTokenRef = useRef<string | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  const clearSession = useCallback(async () => {
    accessTokenRef.current = null;
    refreshTokenRef.current = null;
    setSession(null);
    queryClient.clear();

    try {
      await removeStoredRefreshToken();
    } catch {
      // The in-memory session is still cleared even if the device keychain is unavailable.
    }
  }, [queryClient]);

  const applySession = useCallback(
    async (nextSession: AuthResponse) => {
      if (!nextSession.refreshToken) {
        await clearSession();
        throw new ApiClientError(
          'We could not finish opening your session. Please try again.',
          0,
          ApiErrorCode.SERVICE_UNAVAILABLE,
        );
      }

      try {
        await storeRefreshToken(nextSession.refreshToken);
      } catch {
        await clearSession();
        throw new ApiClientError(
          'We could not securely save your session on this device. Please try again.',
          0,
          ApiErrorCode.SERVICE_UNAVAILABLE,
        );
      }

      refreshTokenRef.current = nextSession.refreshToken;
      accessTokenRef.current = nextSession.accessToken;
      setSession({
        expiresAt: Date.now() + nextSession.expiresIn * 1_000,
        user: nextSession.user,
      });
      queryClient.setQueryData(['users', 'me'], nextSession.user);
    },
    [clearSession, queryClient],
  );

  useEffect(() => {
    configureAuthBridge({
      applySession,
      clearSession,
      getAccessToken: () => accessTokenRef.current,
      getRefreshToken: () => refreshTokenRef.current,
    });

    const bootstrap = async () => {
      try {
        refreshTokenRef.current = await getStoredRefreshToken();
        if (refreshTokenRef.current) {
          await refreshAuthSession();
        }
      } catch {
        accessTokenRef.current = null;
        setSession(null);
      } finally {
        setIsBootstrapping(false);
      }
    };

    void bootstrap();

    return () => configureAuthBridge(null);
  }, [applySession, clearSession]);

  const login = useCallback(
    async (input: LoginInput) => {
      const nextSession = await apiRequest<AuthResponse, LoginInput>('/auth/login', {
        body: { ...input, clientType: ClientType.MOBILE },
        method: 'POST',
      });
      await applySession(nextSession);
      return nextSession;
    },
    [applySession],
  );

  const register = useCallback(
    async (input: RegisterInput) => {
      const nextSession = await apiRequest<AuthResponse, RegisterInput>('/auth/register', {
        body: { ...input, clientType: ClientType.MOBILE },
        method: 'POST',
      });
      await applySession(nextSession);
      return nextSession;
    },
    [applySession],
  );

  const verifyEmail = useCallback(
    async (input: VerifyEmailInput) => {
      const nextSession = await apiRequest<AuthResponse, VerifyEmailInput>('/auth/verify-email', {
        body: { ...input, clientType: ClientType.MOBILE },
        method: 'POST',
      });
      await applySession(nextSession);
      return nextSession;
    },
    [applySession],
  );

  const resendVerification = useCallback(
    (input: ResendVerificationInput) =>
      apiRequest<MessageResponse, ResendVerificationInput>('/auth/resend-verification', {
        body: input,
        method: 'POST',
      }),
    [],
  );

  const forgotPassword = useCallback(
    (input: ForgotPasswordInput) =>
      apiRequest<MessageResponse, ForgotPasswordInput>('/auth/forgot-password', {
        body: input,
        method: 'POST',
      }),
    [],
  );

  const resetPassword = useCallback(
    (input: ResetPasswordInput) =>
      apiRequest<MessageResponse, ResetPasswordInput>('/auth/reset-password', {
        body: input,
        method: 'POST',
      }),
    [],
  );

  const logout = useCallback(async () => {
    try {
      await apiRequest<MessageResponse>('/auth/logout', {
        authenticated: true,
        method: 'POST',
      });
    } finally {
      await clearSession();
    }
  }, [clearSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      forgotPassword,
      isAuthenticated: Boolean(session && accessTokenRef.current),
      isBootstrapping,
      login,
      logout,
      register,
      resendVerification,
      resetPassword,
      session,
      verifyEmail,
    }),
    [
      forgotPassword,
      isBootstrapping,
      login,
      logout,
      register,
      resendVerification,
      resetPassword,
      session,
      verifyEmail,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider.');
  }

  return context;
}
