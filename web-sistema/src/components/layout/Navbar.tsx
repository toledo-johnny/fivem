import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Link, useLocation } from 'react-router-dom';
import { LogIn, Menu, ShieldCheck, ShoppingCart, Sparkles, User, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '../../context/AuthContext';
import { usePublicPortal } from '../../context/PublicPortalContext';
import { useShop } from '../../context/ShopContext';
import CartDrawer from '../CartDrawer';

const navLinks = [
  { name: 'Inicio', to: '/' },
  { name: 'Updates', to: '/updates' },
  { name: 'Regras', to: '/rules' },
  { name: 'Loja', to: '/#shop' },
];

export default function Navbar() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const { canAccessAdmin, isAuthenticated, loginWithDiscord, session } = useAuth();
  const { data: portalData } = usePublicPortal();
  const { itemCount } = useShop();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  const portalName = portalData?.settings.shortName || portalData?.settings.serverName || 'BASEFIVEM';
  const loginEnabled = portalData?.features.loginEnabled ?? true;

  const actionButtons = isAuthenticated ? (
    <div className="flex items-center gap-2 lg:gap-3">
      {canAccessAdmin ? (
        <Link to="/admin">
          <Button
            variant="ghost"
            className="h-10 text-[10px] font-black uppercase tracking-widest text-white/46 hover:text-white hover:bg-white/5 rounded-xl px-3"
          >
            <ShieldCheck className="w-4 h-4 mr-2 text-neon" />
            Admin
          </Button>
        </Link>
      ) : null}
      <Link to="/dashboard">
        <Button className="h-10 bg-white/5 hover:bg-white/10 text-white font-black text-[10px] uppercase tracking-widest border border-white/8 rounded-xl transition-colors px-4">
          <User className="w-4 h-4 mr-2" />
          {session?.globalName || session?.username || 'Area Player'}
        </Button>
      </Link>
    </div>
  ) : (
    <Button
      disabled={!loginEnabled}
      onClick={() => loginWithDiscord('/dashboard')}
      className="h-11 bg-neon text-black hover:bg-neon/90 disabled:bg-white/10 disabled:text-white/40 font-black px-6 lg:px-8 text-[10px] uppercase tracking-[0.2em] rounded-xl shadow-[0_0_18px_rgba(226,232,240,0.1)] transition-colors"
    >
      <LogIn className="w-4 h-4 mr-2" />
      {loginEnabled ? 'Entrar' : 'Login offline'}
    </Button>
  );

  return (
    <nav
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-500',
        isScrolled ? 'py-3' : 'py-5 md:py-7',
      )}
    >
      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div
          className={cn(
            'flex items-center justify-between gap-3 transition-all duration-500 px-4 sm:px-5 lg:px-6 min-h-16 rounded-[1.75rem] overflow-hidden',
            isScrolled ? 'glass-dark border border-white/8 shadow-xl backdrop-blur-2xl' : 'bg-transparent',
          )}
        >
          <Link to="/" className="min-w-0 flex items-center gap-3">
            <div className="w-10 h-10 bg-neon rounded-xl flex items-center justify-center shadow-[0_0_16px_rgba(226,232,240,0.1)] shrink-0">
              <Sparkles className="text-black w-6 h-6" />
            </div>
            <span className="truncate text-base sm:text-lg lg:text-xl font-display font-black tracking-tighter uppercase leading-none">
              {portalName}
            </span>
          </Link>

          <div className="hidden lg:flex items-center gap-6 xl:gap-8 min-w-0">
            <div className="flex items-center gap-5 xl:gap-7 min-w-0">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.to}
                  className="text-[10px] font-black uppercase tracking-[0.2em] text-white/52 hover:text-white transition-colors whitespace-nowrap"
                >
                  {link.name}
                </Link>
              ))}
            </div>

            <div className="h-4 w-px bg-white/10" />

            <Button
              variant="ghost"
              size="icon"
              className="relative text-white/46 hover:text-white hover:bg-white/5 rounded-xl h-11 w-11 shrink-0"
              onClick={() => setIsCartOpen((current) => !current)}
            >
              <ShoppingCart className="w-5 h-5" />
              {itemCount > 0 ? (
                <span className="absolute -top-1 -right-1 bg-neon text-black text-[9px] font-black min-w-4 h-4 px-1 rounded-full flex items-center justify-center">
                  {itemCount}
                </span>
              ) : null}
            </Button>

            {actionButtons}
          </div>

          <div className="flex lg:hidden items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="relative text-white/46 hover:text-white hover:bg-white/5 rounded-xl h-10 w-10"
              onClick={() => setIsCartOpen(true)}
            >
              <ShoppingCart className="w-4 h-4" />
              {itemCount > 0 ? (
                <span className="absolute -top-1 -right-1 bg-neon text-black text-[9px] font-black min-w-4 h-4 px-1 rounded-full flex items-center justify-center">
                  {itemCount}
                </span>
              ) : null}
            </Button>

            <button
              onClick={() => setIsOpen((current) => !current)}
              className="p-3 text-white/46 hover:text-white bg-white/5 rounded-xl border border-white/8 transition-all"
            >
              {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isOpen ? (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="lg:hidden mt-3 px-3 sm:px-6 fixed inset-x-0"
          >
            <div className="glass-dark border border-white/8 p-6 rounded-[2rem] shadow-2xl backdrop-blur-2xl">
              <div className="flex flex-col gap-4">
                {navLinks.map((link) => (
                  <Link
                    key={link.name}
                    to={link.to}
                    onClick={() => setIsOpen(false)}
                    className="text-xs font-black uppercase tracking-[0.3em] text-white/52 hover:text-white py-2"
                  >
                    {link.name}
                  </Link>
                ))}

                <div className="pt-5 border-t border-white/10 space-y-3">
                  {isAuthenticated ? (
                    <>
                      <Link
                        to="/dashboard"
                        onClick={() => setIsOpen(false)}
                        className="flex items-center justify-center w-full h-14 bg-white/5 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl border border-white/8"
                      >
                        <User className="w-4 h-4 mr-2" />
                        Area Player
                      </Link>
                      {canAccessAdmin ? (
                        <Link
                          to="/admin"
                          onClick={() => setIsOpen(false)}
                          className="flex items-center justify-center w-full h-14 bg-neon text-black font-black text-xs uppercase tracking-[0.2em] rounded-2xl"
                        >
                          <ShieldCheck className="w-4 h-4 mr-2" />
                          Painel Admin
                        </Link>
                      ) : null}
                    </>
                  ) : (
                    <Button
                      disabled={!loginEnabled}
                      onClick={() => {
                        setIsOpen(false);
                        loginWithDiscord('/dashboard');
                      }}
                      className="w-full h-14 bg-neon text-black disabled:bg-white/10 disabled:text-white/40 font-black text-xs uppercase tracking-[0.2em] rounded-2xl"
                    >
                      <LogIn className="w-4 h-4 mr-2" />
                      Entrar com Discord
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </nav>
  );
}
