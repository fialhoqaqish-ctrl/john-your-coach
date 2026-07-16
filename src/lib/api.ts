const TOKEN_KEY = "john.token";
const BASE_KEY = "john.base";

export function getAuth() {
  if (typeof window === "undefined") return { token: "", base: "" };
  return {
    token: localStorage.getItem(TOKEN_KEY) ?? "",
    base: localStorage.getItem(BASE_KEY) ?? "",
  };
}

export function setAuth(base: string, token: string) {
  localStorage.setItem(BASE_KEY, base.replace(/\/$/, ""));
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  // keep base URL prefilled next time
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function apiFetch<T = unknown>(
  path: string,
  init: RequestInit = {},
  overrides?: { base?: string; token?: string },
): Promise<T> {
  const { base, token } = { ...getAuth(), ...overrides };
  if (!base || !token) throw new ApiError(401, "Not connected");
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init.headers || {}),
    },
  });
  if (res.status === 401) {
    clearAuth();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new ApiError(401, "Unauthorized");
  }
  if (!res.ok) throw new ApiError(res.status, `Request failed: ${res.status}`);
  if (res.status === 202) return { status: "processing" } as T;
  const text = await res.text();
  return text ? (JSON.parse(text) as T) : ({} as T);
}