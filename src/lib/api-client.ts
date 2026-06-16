type RequestOptions = {
  params?: Record<string, string | number | undefined>;
};

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  options?: RequestOptions
): Promise<T> {
  let url = path;

  if (options?.params) {
    const searchParams = new URLSearchParams();
    Object.entries(options.params).forEach(([key, value]) => {
      if (value !== undefined) searchParams.set(key, String(value));
    });
    const qs = searchParams.toString();
    if (qs) url += `?${qs}`;
  }

  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    credentials: "include",
  });

  const json = await res.json();

  if (!res.ok) {
    // Suppress 401 console noise — auth guard handles this gracefully
    if (res.status !== 401) {
      console.error(`API error ${res.status}: ${path}`);
    }
    const message = json?.error?.message || `Request failed (${res.status})`;
    const error = new Error(message) as Error & { status: number; details: unknown };
    error.status = res.status;
    error.details = json?.error?.details;
    throw error;
  }

  return json.data as T;
}

export const api = {
  get: <T>(path: string, params?: RequestOptions["params"]) =>
    request<T>("GET", path, undefined, { params }),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, body),
  del: <T>(path: string) => request<T>("DELETE", path),
};
