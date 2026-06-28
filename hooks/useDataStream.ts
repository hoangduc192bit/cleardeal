"use client";

import { useCallback, useEffect, useState } from "react";

export function useDataStream<T>(type: string) {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<string>();
  const refresh = useCallback(async () => {
    try {
      const response = await fetch(`/api/stream/${type}`);
      if (!response.ok) throw new Error("Stream unavailable");
      setData(await response.json());
      setError(undefined);
    } catch (err) { setError(err instanceof Error ? err.message : "Stream unavailable"); }
  }, [type]);
  useEffect(() => { refresh(); const timer = setInterval(refresh, 5000); return () => clearInterval(timer); }, [refresh]);
  return { data, error, refresh };
}
