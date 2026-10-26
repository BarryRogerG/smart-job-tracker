import axios from "axios";

function isLocalHostName(hostname) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

function isPrivateLanHost(hostname) {
  return /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(hostname);
}

function isLocalAbsoluteUrl(value) {
  if (!/^https?:\/\//i.test(String(value || ""))) return false;
  try {
    return isLocalHostName(new URL(value).hostname);
  } catch {
    return false;
  }
}

// Same-origin `/api` works on phones (LAN IP / deployed host). A baked-in
// localhost URL would otherwise post to the phone itself and login would fail.
function resolveApiBase() {
  const configured = import.meta.env.VITE_API_URL;
  const pageHost =
    typeof window !== "undefined" ? window.location.hostname : "localhost";

  // Only rewrite localhost → same-origin /api on a LAN phone/dev host.
  // On Vercel/Netlify, /api is the static host and login would hang.
  if (isPrivateLanHost(pageHost) && (!configured || isLocalAbsoluteUrl(configured))) {
    return "/api";
  }

  return configured || "/api";
}

const apiClient = axios.create({
  baseURL: resolveApiBase(),
  timeout: 15_000,
});

function readStoredToken() {
  try {
    const raw = localStorage.getItem("token");
    if (raw == null) return null;
    return String(raw)
      .trim()
      .replace(/^["']|["']$/g, "");
  } catch {
    return null;
  }
}

apiClient.interceptors.request.use((config) => {
  const token = readStoredToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const reqUrl = String(error.config?.url || "");
    const isAuthEndpoint =
      reqUrl.includes("/auth/login") || reqUrl.includes("/auth/register");

    if (status === 401 && !isAuthEndpoint) {
      try {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      } catch {
        // ignore storage failures
      }
      const path = window.location.pathname;
      if (path !== "/login") {
        window.location.assign("/login");
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
