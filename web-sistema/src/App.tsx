/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import RouteScrollManager from './components/RouteScrollManager';
import { AuthProvider } from './context/AuthContext';
import { PublicPortalProvider } from './context/PublicPortalContext';
import { ShopProvider } from './context/ShopContext';
import Home from './pages/Home';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Admin from './pages/Admin';
import Rules from './pages/Rules';
import Updates from './pages/Updates';
import UpdateDetail from './pages/UpdateDetail';

export default function App() {
  return (
    <ShopProvider>
      <PublicPortalProvider>
        <AuthProvider>
          <Router>
            <div className="min-h-screen flex flex-col">
              <RouteScrollManager />
              <Navbar />
              <main className="flex-grow">
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/rules" element={<Rules />} />
                  <Route path="/updates" element={<Updates />} />
                  <Route path="/updates/:slug" element={<UpdateDetail />} />
                  <Route path="/login" element={<Login />} />
                  <Route
                    path="/dashboard"
                    element={(
                      <ProtectedRoute>
                        <Dashboard />
                      </ProtectedRoute>
                    )}
                  />
                  <Route
                    path="/admin"
                    element={(
                      <ProtectedRoute requireAdmin>
                        <Admin />
                      </ProtectedRoute>
                    )}
                  />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </main>
              <Footer />
            </div>
          </Router>
        </AuthProvider>
      </PublicPortalProvider>
    </ShopProvider>
  );
}
