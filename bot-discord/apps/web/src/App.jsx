import { Routes, Route, Navigate } from 'react-router-dom';
import { usePortal } from './context/PortalContext';
import { PublicLayout, AppLayout, ProtectedRoute, AdminRoute } from './components/Layouts';
import { LandingPage, LoginPage } from './pages/public';
import {
  AccessPage,
  AdminCitiesPage,
  AdminDiamondsPage,
  AdminFinancePage,
  AdminLogsPage,
  AdminNewsPage,
  AdminOverviewPage,
  AdminPlayersPage,
  AdminSettingsPage,
  AdminStaffPage,
  AdminTicketsPage,
  AdminWhitelistPage,
  DiamondsPage,
  PlayerHomePage,
  ProfilePage,
  SupportPage
} from './pages/app';

const PLAYER_GROUPS = [
  {
    label: 'Minha Conta',
    items: [
      { to: '/app', label: 'Inicio', icon: 'IN' },
      { to: '/app/acessos', label: 'Meus Acessos', icon: 'AC' },
      { to: '/app/diamantes', label: 'Diamantes', icon: 'DI' },
      { to: '/app/suporte', label: 'Suporte', icon: 'SU' },
      { to: '/app/perfil', label: 'Perfil', icon: 'PF' }
    ]
  }
];

const ADMIN_GROUP = {
  label: 'Administracao',
  items: [
    { to: '/app/admin', label: 'Overview', icon: 'OV' },
    { to: '/app/admin/players', label: 'Players', icon: 'PL' },
    { to: '/app/admin/whitelist', label: 'Whitelist', icon: 'WL' },
    { to: '/app/admin/tickets', label: 'Tickets', icon: 'TK' },
    { to: '/app/admin/financeiro', label: 'Financeiro', icon: 'FN' },
    { to: '/app/admin/diamantes', label: 'Diamantes', icon: 'DM' },
    { to: '/app/admin/noticias', label: 'Noticias', icon: 'NT' },
    { to: '/app/admin/cidades', label: 'Cidades', icon: 'CT' },
    { to: '/app/admin/staff', label: 'Staff', icon: 'SF' },
    { to: '/app/admin/logs', label: 'Logs', icon: 'LG' },
    { to: '/app/admin/configuracoes', label: 'Configuracoes', icon: 'CF' }
  ]
};

export default function App() {
  const { authState } = usePortal();
  const menuGroups = authState.data?.access?.isAdmin
    ? [...PLAYER_GROUPS, ADMIN_GROUP]
    : PLAYER_GROUPS;

  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout menuGroups={menuGroups} />}>
          <Route path="/app" element={<PlayerHomePage />} />
          <Route path="/app/acessos" element={<AccessPage />} />
          <Route path="/app/diamantes" element={<DiamondsPage />} />
          <Route path="/app/suporte" element={<SupportPage />} />
          <Route path="/app/perfil" element={<ProfilePage />} />

          <Route element={<AdminRoute />}>
            <Route path="/app/admin" element={<AdminOverviewPage />} />
            <Route path="/app/admin/players" element={<AdminPlayersPage />} />
            <Route path="/app/admin/whitelist" element={<AdminWhitelistPage />} />
            <Route path="/app/admin/tickets" element={<AdminTicketsPage />} />
            <Route path="/app/admin/financeiro" element={<AdminFinancePage />} />
            <Route path="/app/admin/diamantes" element={<AdminDiamondsPage />} />
            <Route path="/app/admin/noticias" element={<AdminNewsPage />} />
            <Route path="/app/admin/cidades" element={<AdminCitiesPage />} />
            <Route path="/app/admin/staff" element={<AdminStaffPage />} />
            <Route path="/app/admin/logs" element={<AdminLogsPage />} />
            <Route path="/app/admin/configuracoes" element={<AdminSettingsPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
