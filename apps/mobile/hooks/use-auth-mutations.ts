import {
  type AuthResponse,
  type ForgotPasswordInput,
  type LoginInput,
  type MessageResponse,
  type RegisterInput,
  type RegisterPendingResponse,
  type ResendVerificationInput,
  type ResetPasswordInput,
  type VerifyEmailInput,
} from '@purposemint/contracts';
import { useMutation } from '@tanstack/react-query';

import { useAuth } from '@/contexts/AuthContext';
import { type ApiClientError } from '@/lib/api/client';

export function useLoginMutation() {
  const { login } = useAuth();
  return useMutation<AuthResponse | RegisterPendingResponse, ApiClientError, LoginInput>({
    mutationFn: login,
  });
}

export function useRegisterMutation() {
  const { register } = useAuth();
  return useMutation<RegisterPendingResponse, ApiClientError, RegisterInput>({
    mutationFn: register,
  });
}

export function useVerifyEmailMutation() {
  const { verifyEmail } = useAuth();
  return useMutation<AuthResponse, ApiClientError, VerifyEmailInput>({ mutationFn: verifyEmail });
}

export function useResendVerificationMutation() {
  const { resendVerification } = useAuth();
  return useMutation<MessageResponse, ApiClientError, ResendVerificationInput>({
    mutationFn: resendVerification,
  });
}

export function useForgotPasswordMutation() {
  const { forgotPassword } = useAuth();
  return useMutation<MessageResponse, ApiClientError, ForgotPasswordInput>({
    mutationFn: forgotPassword,
  });
}

export function useResetPasswordMutation() {
  const { resetPassword } = useAuth();
  return useMutation<MessageResponse, ApiClientError, ResetPasswordInput>({
    mutationFn: resetPassword,
  });
}
