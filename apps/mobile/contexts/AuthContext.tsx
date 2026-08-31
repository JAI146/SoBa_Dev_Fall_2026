import {
  ApiErrorCode,
  ClientType,
  type AuthResponse,
  type ForgotPasswordInput,
  type LoginInput,
  type MessageResponse,
  type RegisterInput,
  type RegisterPendingResponse,
  type ResendVerificationInput,
  type ResetPasswordInput,
  type UserPublic,
  type VerifyEmailInput,
} from "@purposemint/contracts";
import { useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  apiRequest,
  ApiClientError,
  configureAuthBridge,
  refreshAuthSession,
} from "@/lib/api/client";
import {
  getStoredRefreshToken,
  removeStoredRefreshToken,
  storeRefreshToken,
} from "@/lib/auth/token-storage";

export type AuthSession = {
  expiresAt: number;
  user: UserPublic;
};

type AuthContextValue = {
  forgotPassword: (input: ForgotPasswordInput) => Promise<MessageResponse>;
  isAuthenticated: boolean;
  isBootstrapping: boolean;
  login: (input: LoginInput) => Promise<AuthResponse | RegisterPendingResponse>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  register: (input: RegisterInput) => Promise<RegisterPendingResponse>;
  resendVerification: (
    input: ResendVerificationInput,
  ) => Promise<MessageResponse>;
  resetPassword: (input: ResetPasswordInput) => Promise<MessageResponse>;
  session: AuthSession | null;
  updateSessionUser: (user: UserPublic) => void;
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
          "We could not finish opening your session. Please try again.",
          0,
          ApiErrorCode.SERVICE_UNAVAILABLE,
        );
      }

      try {
        await storeRefreshToken(nextSession.refreshToken);
      } catch {
        await clearSession();
        throw new ApiClientError(
          "We could not securely save your session on this device. Please try again.",
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
      queryClient.setQueryData(["users", "me"], nextSession.user);
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
      const result = await apiRequest<
        AuthResponse | RegisterPendingResponse,
        LoginInput
      >("/auth/login", {
        body: { ...input, clientType: ClientType.MOBILE },
        method: "POST",
      });
      if ("accessToken" in result) {
        await applySession(result);
      }
      return result;
    },
    [applySession],
  );

  const register = useCallback(
    (input: RegisterInput) =>
      apiRequest<RegisterPendingResponse, RegisterInput>("/auth/register", {
        body: { ...input, clientType: ClientType.MOBILE },
        method: "POST",
      }),
    [],
  );

  const verifyEmail = useCallback(
    async (input: VerifyEmailInput) => {
      const nextSession = await apiRequest<AuthResponse, VerifyEmailInput>(
        "/auth/verify-email",
        {
          body: { ...input, clientType: ClientType.MOBILE },
          method: "POST",
        },
      );
      await applySession(nextSession);
      return nextSession;
    },
    [applySession],
  );

  const resendVerification = useCallback(
    (input: ResendVerificationInput) =>
      apiRequest<MessageResponse, ResendVerificationInput>(
        "/auth/resend-verification",
        {
          body: input,
          method: "POST",
        },
      ),
    [],
  );

  const forgotPassword = useCallback(
    (input: ForgotPasswordInput) =>
      apiRequest<MessageResponse, ForgotPasswordInput>(
        "/auth/forgot-password",
        {
          body: input,
          method: "POST",
        },
      ),
    [],
  );

  const resetPassword = useCallback(
    (input: ResetPasswordInput) =>
      apiRequest<MessageResponse, ResetPasswordInput>("/auth/reset-password", {
        body: input,
        method: "POST",
      }),
    [],
  );

  const logout = useCallback(async () => {
    try {
      await apiRequest<MessageResponse>("/auth/logout", {
        authenticated: true,
        method: "POST",
      });
    } finally {
      await clearSession();
    }
  }, [clearSession]);

  const logoutAll = useCallback(async () => {
    await apiRequest<MessageResponse>("/auth/logout-all", {
      authenticated: true,
      method: "POST",
    });
    await clearSession();
  }, [clearSession]);

  const updateSessionUser = useCallback(
    (user: UserPublic) => {
      setSession((current) => (current ? { ...current, user } : current));
      queryClient.setQueryData(["users", "me"], user);
    },
    [queryClient],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      forgotPassword,
      isAuthenticated: Boolean(session && accessTokenRef.current),
      isBootstrapping,
      login,
      logout,
      logoutAll,
      register,
      resendVerification,
      resetPassword,
      session,
      updateSessionUser,
      verifyEmail,
    }),
    [
      forgotPassword,
      isBootstrapping,
      login,
      logout,
      logoutAll,
      register,
      resendVerification,
      resetPassword,
      session,
      updateSessionUser,
      verifyEmail,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return context;
}
