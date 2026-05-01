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
import { getPublicPortalData } from '../services/api';
import type { PublicPortalData, RemoteState } from '../types';

interface PublicPortalContextType extends RemoteState<PublicPortalData> {
  reload: () => Promise<void>;
}

const PublicPortalContext = createContext<PublicPortalContextType | undefined>(undefined);

const INITIAL_STATE: RemoteState<PublicPortalData> = {
  data: null,
  error: '',
  status: 'loading',
};

export function PublicPortalProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<RemoteState<PublicPortalData>>(INITIAL_STATE);

  const load = useCallback(async (isRefresh = false) => {
    startTransition(() => {
      setState((current) => ({
        data: current.data,
        error: '',
        status: current.data && isRefresh ? 'refreshing' : 'loading',
      }));
    });

    try {
      const data = await getPublicPortalData();
      startTransition(() => {
        setState({
          data,
          error: '',
          status: 'ready',
        });
      });
    } catch (error) {
      startTransition(() => {
        setState((current) => ({
          data: current.data,
          error: error instanceof Error ? error.message : 'Falha ao carregar o portal.',
          status: current.data ? 'ready' : 'error',
        }));
      });
    }
  }, []);

  useEffect(() => {
    load(false);
    const intervalId = window.setInterval(() => {
      void load(true);
    }, 30_000);

    return () => window.clearInterval(intervalId);
  }, [load]);

  const value = useMemo<PublicPortalContextType>(
    () => ({
      ...state,
      reload: async () => {
        await load(true);
      },
    }),
    [load, state],
  );

  return <PublicPortalContext.Provider value={value}>{children}</PublicPortalContext.Provider>;
}

export function usePublicPortal() {
  const context = useContext(PublicPortalContext);

  if (!context) {
    throw new Error('usePublicPortal must be used within a PublicPortalProvider');
  }

  return context;
}
