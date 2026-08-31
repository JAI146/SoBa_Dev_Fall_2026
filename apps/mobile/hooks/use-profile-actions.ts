import {
  type ChangePasswordInput,
  type DeletionRequestResponse,
  type MessageResponse,
  type UpdateNotificationPreferencesInput,
  type UpdateProfileInput,
  type UserPublic,
} from "@purposemint/contracts";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/contexts/AuthContext";
import { dashboardQueryKey } from "@/hooks/use-dashboard";
import { currentUserQueryKey } from "@/hooks/use-current-user";
import { apiRequest } from "@/lib/api/client";

export function useProfileActions() {
  const queryClient = useQueryClient();
  const { updateSessionUser } = useAuth();

  const applyUser = (user: UserPublic) => {
    updateSessionUser(user);
    queryClient.setQueryData(currentUserQueryKey, user);
  };

  const applyDeletionState = (deleteAccountRequestedAt: string | null) => {
    const current = queryClient.getQueryData<UserPublic>(currentUserQueryKey);
    if (!current) return;
    applyUser({ ...current, deleteAccountRequestedAt });
  };

  const updateProfile = useMutation({
    mutationFn: (input: UpdateProfileInput) =>
      apiRequest<UserPublic, UpdateProfileInput>("/users/me", {
        authenticated: true,
        body: input,
        method: "PATCH",
      }),
    onSuccess: (user, input) => {
      applyUser(user);
      if (input.displayName !== undefined) {
        void queryClient.invalidateQueries({ queryKey: dashboardQueryKey });
      }
    },
  });

  const updateTimeZone = useMutation({
    mutationFn: (input: UpdateProfileInput) =>
      apiRequest<UserPublic, UpdateProfileInput>("/users/me", {
        authenticated: true,
        body: input,
        method: "PATCH",
      }),
    onSuccess: applyUser,
  });

  const updateNotifications = useMutation({
    mutationFn: (input: UpdateNotificationPreferencesInput) =>
      apiRequest<UserPublic, UpdateNotificationPreferencesInput>(
        "/users/me/notification-preferences",
        {
          authenticated: true,
          body: input,
          method: "PATCH",
        },
      ),
    onSuccess: applyUser,
  });

  const changePassword = useMutation({
    mutationFn: (input: ChangePasswordInput) =>
      apiRequest<MessageResponse, ChangePasswordInput>(
        "/auth/change-password",
        {
          authenticated: true,
          body: input,
          method: "POST",
        },
      ),
  });

  const requestDeletion = useMutation({
    mutationFn: () =>
      apiRequest<DeletionRequestResponse>("/users/me/deletion-request", {
        authenticated: true,
        method: "POST",
      }),
    onSuccess: (response) =>
      applyDeletionState(response.deleteAccountRequestedAt),
  });

  const cancelDeletion = useMutation({
    mutationFn: () =>
      apiRequest<DeletionRequestResponse>("/users/me/deletion-request", {
        authenticated: true,
        method: "DELETE",
      }),
    onSuccess: (response) =>
      applyDeletionState(response.deleteAccountRequestedAt),
  });

  return {
    cancelDeletion,
    changePassword,
    requestDeletion,
    updateNotifications,
    updateProfile,
    updateTimeZone,
  };
}
