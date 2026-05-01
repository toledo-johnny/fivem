import {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { ApiError, getLoginUrl, getPortalSession, logoutRequest } from '../services/api';
import type { PortalSessionPayload, RemoteState } from '../types';

interface AuthContextType {
  sessionData: PortalSessionPayload | null;
  session: PortalSessionPayload['session'] | null;
  isStaff: boolean;
  isAdmin: boolean;
  isOwner: boolean;
  canAccessAdmin: boolean;
  isAuthenticated: boolean;
  isReady: boolean;
  isLoading: boolean;
  authError: string;
  loginWithDiscord: (redirectTo?: string) => void;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const INITIAL_STATE: RemoteState<PortalSessionPayload> = {
  data: null,
  error: '',
  status: 'loading',
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<RemoteState<PortalSessionPayload>>(INITIAL_STATE);

  const loadSession = useCallback(async (isRefresh = false) => {
    startTransition(() => {
      setState((current) => ({
        data: current.data,
        error: '',
        status: current.data && isRefresh ? 'refreshing' : 'loading',
      }));
    });

    try {
      const data = await getPortalSession();
      startTransition(() => {
        setState({
          data,
          error: '',
          status: 'ready',
        });
      });
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 401) {
        startTransition(() => {
          setState({
            data: null,
            error: '',
            status: 'ready',
          });
        });
        return;
      }

      startTransition(() => {
        setState((current) => ({
          data: current.data,
          error: error instanceof Error ? error.message : 'Falha ao validar a sessao.',
          status: current.data ? 'ready' : 'error',
        }));
      });
    }
  }, []);

  useEffect(() => {
    loadSession(false);
    const intervalId = window.setInterval(() => {
      void loadSession(true);
    }, 30_000);

    return () => window.clearInterval(intervalId);
  }, [loadSession]);

  const value = useMemo<AuthContextType>(
    () => ({
      sessionData: state.data,
      session: state.data?.session || null,
      isStaff: Boolean(state.data?.access.isStaff),
      isAdmin: Boolean(state.data?.access.isAdmin),
      isOwner: Boolean(state.data?.access.isOwner),
      canAccessAdmin: Boolean(state.data?.capabilities.adminArea),
      isAuthenticated: Boolean(state.data?.session?.userId),
      isReady: state.status !== 'loading',
      isLoading: state.status === 'loading' || state.status === 'refreshing',
      authError: state.error,
      loginWithDiscord: (redirectTo) => {
        window.location.assign(getLoginUrl(redirectTo));
      },
      logout: async () => {
        try {
          await logoutRequest();
        } finally {
          startTransition(() => {
            setState({
              data: null,
              error: '',
              status: 'ready',
            });
          });
        }
      },
      refreshSession: async () => {
        await loadSession(true);
      },
    }),
    [loadSession, state],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
