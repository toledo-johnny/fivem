import { createContext, useContext, useEffect, useState } from 'react';
import {
  getPortalSession,
  getPublicPortalData,
  getLoginUrl,
  logout
} from '../lib/api';

const PortalContext = createContext(null);
const DEFAULT_THEME = {
  primaryColor: '#0f1117',
  accentColor: '#c6ff3f'
};

function normalizeHex(value, fallback) {
  const color = String(value || '').trim();
  if (/^#[0-9a-fA-F]{6}$/.test(color)) {
    return color.toLowerCase();
  }

  if (/^#[0-9a-fA-F]{3}$/.test(color)) {
    return `#${color
      .slice(1)
      .split('')
      .map((char) => char + char)
      .join('')}`.toLowerCase();
  }

  return fallback;
}

function hexToRgbTriplet(hex) {
  const normalized = normalizeHex(hex, '#000000').slice(1);
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}

function applyPortalTheme(settings) {
  if (typeof document === 'undefined') {
    return;
  }

  const primary = normalizeHex(settings?.primaryColor, DEFAULT_THEME.primaryColor);
  const accent = normalizeHex(settings?.accentColor, DEFAULT_THEME.accentColor);
  const root = document.documentElement;

  root.style.setProperty('--portal-primary', primary);
  root.style.setProperty('--portal-primary-rgb', hexToRgbTriplet(primary));
  root.style.setProperty('--portal-accent', accent);
  root.style.setProperty('--portal-accent-rgb', hexToRgbTriplet(accent));
}

export function PortalProvider({ children }) {
  const [authState, setAuthState] = useState({
    status: 'loading',
    data: null,
    error: ''
  });
  const [publicState, setPublicState] = useState({
    status: 'loading',
    data: null,
    error: ''
  });

  async function refreshPublicData() {
    setPublicState((current) => ({
      status: current.data ? 'refreshing' : 'loading',
      data: current.data,
      error: ''
    }));

    try {
      const data = await getPublicPortalData();
      setPublicState({
        status: 'ready',
        data,
        error: ''
      });
      return data;
    } catch (error) {
      setPublicState({
        status: 'error',
        data: null,
        error: error.message
      });
      throw error;
    }
  }

  async function refreshSession() {
    setAuthState((current) => ({
      status: current.data ? 'refreshing' : 'loading',
      data: current.data,
      error: ''
    }));

    try {
      const data = await getPortalSession();
      setAuthState({
        status: 'authenticated',
        data,
        error: ''
      });
      return data;
    } catch (error) {
      if (error.statusCode === 401 || error.statusCode === 403) {
        setAuthState({
          status: 'guest',
          data: null,
          error: error.message
        });
        return null;
      }

      setAuthState({
        status: 'error',
        data: null,
        error: error.message
      });
      throw error;
    }
  }

  async function logoutUser() {
    await logout();
    setAuthState({
      status: 'guest',
      data: null,
      error: ''
    });
  }

  useEffect(() => {
    refreshPublicData().catch(() => null);
    refreshSession().catch(() => null);
  }, []);

  useEffect(() => {
    const settings = authState.data?.settings || publicState.data?.settings || null;
    applyPortalTheme(settings);

    if (typeof document !== 'undefined' && settings?.serverName) {
      document.title = `${settings.serverName} | Portal`;
    }
  }, [authState.data, publicState.data]);

  const value = {
    authState,
    publicState,
    refreshPublicData,
    refreshSession,
    logoutUser,
    getLoginUrl
  };

  return <PortalContext.Provider value={value}>{children}</PortalContext.Provider>;
}

export function usePortal() {
  const value = useContext(PortalContext);
  if (!value) {
    throw new Error('usePortal precisa ser usado dentro de PortalProvider.');
  }

  return value;
}
