import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "./api";
import type { Dashboard } from "./types";

export function useDashboard() {
  return useQuery<Dashboard>({
    queryKey: ["dashboard"],
    queryFn: () => apiFetch<Dashboard>("/api/dashboard"),
    staleTime: 30_000,
  });
}