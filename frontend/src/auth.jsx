import { createContext, useContext, useEffect, useState } from "react";
import { api, getToken, setToken } from "./api";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(getToken()));

  // Restore the session from a saved token.
  useEffect(() => {
    if (!getToken()) return;
    api
      .me()
      .then(setUser)
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, []);

  const start = ({ token, user }) => {
    setToken(token);
    setUser(user);
    return user;
  };

  const value = {
    user,
    loading,
    login: async (credentials) => start(await api.login(credentials)),
    register: async (details) => start(await api.register(details)),
    logout: () => {
      setToken(null);
      setUser(null);
    },
    setUser,
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
