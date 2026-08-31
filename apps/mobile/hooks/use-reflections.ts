import type {
  CreateMoodEntryInput,
  CreateReflectionInput,
  DeleteReflectionResponse,
  ReflectionPublic,
  ReflectionsListResponse,
  UpdateReflectionInput,
} from '@purposemint/contracts';
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { apiRequest } from '@/lib/api/client';
import { dashboardQueryKey } from '@/hooks/use-dashboard';

export const reflectionsQueryKey = ['reflections'] as const;
export function useReflectionHistory() {
  return useInfiniteQuery({
    queryKey: reflectionsQueryKey,
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      apiRequest<ReflectionsListResponse>(
        `/reflections?page=${pageParam}&limit=20`,
        { authenticated: true },
      ),
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.page + 1 : undefined,
  });
}
export function useReflectionMutations() {
  const client = useQueryClient();
  const refresh = () => {
    void client.invalidateQueries({ queryKey: reflectionsQueryKey });
    void client.invalidateQueries({ queryKey: dashboardQueryKey });
  };
  const create = useMutation({
    mutationFn: (input: CreateReflectionInput) =>
      apiRequest<ReflectionPublic, CreateReflectionInput>('/reflections', {
        authenticated: true,
        method: 'POST',
        body: input,
      }),
    onSuccess: refresh,
  });
  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateReflectionInput }) =>
      apiRequest<ReflectionPublic, UpdateReflectionInput>(
        `/reflections/${id}`,
        { authenticated: true, method: 'PATCH', body: input },
      ),
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: (id: string) =>
      apiRequest<DeleteReflectionResponse>(`/reflections/${id}`, {
        authenticated: true,
        method: 'DELETE',
      }),
    onSuccess: refresh,
  });
  const mood = useMutation({
    mutationFn: (input: CreateMoodEntryInput) =>
      apiRequest<ReflectionPublic, CreateMoodEntryInput>('/reflections/mood', {
        authenticated: true,
        method: 'POST',
        body: input,
      }),
    onSuccess: refresh,
  });
  return {
    create: create.mutateAsync,
    update: update.mutateAsync,
    remove: remove.mutateAsync,
    saveMood: mood.mutateAsync,
  };
}
