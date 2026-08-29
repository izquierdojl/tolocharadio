import { create } from "zustand";
import type { AuthResponse, User } from "../lib/types.js";
import { api, setAccessToken, refreshSession } from "../lib/api.js";

type AuthStatus = "loading" | "authenticated" | "guest";

interface AuthState {
  user: User | null;
  status: AuthStatus;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  restore: () => Promise<void>;
  setUser: (user: User) => void;
}

function applySession(data: AuthResponse): void {
  setAccessToken(data.accessToken);
  useAuthStore.setState({ user: data.user, status: "authenticated" });
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  status: "loading",

  async login(email, password) {
    applySession(await api.post<AuthResponse>("/auth/login", { email, password }));
  },

  async register(email, password, name) {
    applySession(await api.post<AuthResponse>("/auth/register", { email, password, name }));
  },

  async logout() {
    try {
      await api.post<{ ok: true }>("/auth/logout");
    } catch {
      // revocamos igualmente la sesion local
    }
    setAccessToken(null);
    set({ user: null, status: "guest" });
  },

  async restore() {
    try {
      const me = await api.get<{ user: User }>("/users/me");
      set({ user: me.user, status: "authenticated" });
    } catch {
      const token = await refreshSession();
      if (token) {
        try {
          const me = await api.get<{ user: User }>("/users/me");
          set({ user: me.user, status: "authenticated" });
          return;
        } catch {
          // sesion caducada
        }
      }
      setAccessToken(null);
      set({ user: null, status: "guest" });
    }
  },

  setUser(user) {
    set({ user });
  },
}));