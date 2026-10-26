import { createContext, useContext, useMemo, useState } from "react";

const AuthContext = createContext(null);

function normalizeStoredToken(value) {
  if (value == null) return null;
  return String(value)
    .trim()
    .replace(/^["']|["']$/g, "");
}

function readStoredJson(key) {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    try {
      return normalizeStoredToken(localStorage.getItem("token"));
    } catch {
      return null;
    }
  });
  const [user, setUser] = useState(() => readStoredJson("user"));

  const login = (nextToken, nextUser) => {
    const cleanToken = normalizeStoredToken(nextToken);
    try {
      localStorage.setItem("token", cleanToken);
      localStorage.setItem("user", JSON.stringify(nextUser));
    } catch {
      // Safari private mode can throw; keep an in-memory session.
    }
    setToken(cleanToken);
    setUser(nextUser);
  };

  const logout = () => {
    try {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    } catch {
      // ignore storage failures
    }
    setToken(null);
    setUser(null);
  };

  const value = useMemo(
    () => ({
      token,
      user,
      login,
      logout,
    }),
    [token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
