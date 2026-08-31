"use client";

import { useCallback, useEffect, useState } from "react";
import { apiRequest, type ResponseSchema } from "@/lib/api-client";
import { getToken } from "@/lib/auth";

export function useAdminQuery<T>(path: string, schema: ResponseSchema<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiRequest<T>(
        path,
        { method: "GET" },
        getToken(),
        schema,
      );
      setData(response);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The requested admin data could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }, [path, schema]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, error, loading, reload };
}
