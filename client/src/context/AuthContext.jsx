import { createContext, useContext, useMemo, useState } from "react";

const AuthContext = createContext(null);

function normalizeStoredToken(value) {
  if (value == null) return null;
  return String(value)
    .trim()
    .replace(/^["']|["']$/g, "");
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() =>
    normalizeStoredToken(localStorage.getItem("token"))
  );
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("user");
    return stored ? JSON.parse(stored) : null;
  });

  const login = (nextToken, nextUser) => {
    const cleanToken = normalizeStoredToken(nextToken);
    localStorage.setItem("token", cleanToken);
    localStorage.setItem("user", JSON.stringify(nextUser));
    setToken(cleanToken);
    setUser(nextUser);
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
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
