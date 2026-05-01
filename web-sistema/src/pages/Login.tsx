import { startTransition, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, MessageSquare, RefreshCcw, Shield } from 'lucide-react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import LoadingScreen from '../components/LoadingScreen';
import { useAuth } from '../context/AuthContext';
import { usePublicPortal } from '../context/PublicPortalContext';

function getErrorMessage(code: string) {
  switch (code) {
    case 'oauth_state_invalid':
      return 'A validacao do Discord expirou antes do retorno. Tente iniciar o login novamente.';
    case 'dashboard_access_denied':
      return 'Sua conta foi autenticada, mas o bot nao conseguiu validar o acesso ao servidor principal.';
    default:
      return '';
  }
}

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { authError, isAuthenticated, isLoading, isReady, loginWithDiscord, session } = useAuth();
  const { data: portalData } = usePublicPortal();

  const redirectTarget = useMemo(() => {
    const state = location.state as { from?: string } | null;
    return state?.from || '/dashboard';
  }, [location.state]);

  const queryError = getErrorMessage(searchParams.get('error') || '');
  const errorMessage = authError || queryError;

  useEffect(() => {
    if (!isReady || !isAuthenticated) {
      return;
    }

    startTransition(() => {
      navigate(redirectTarget, { replace: true });
    });
  }, [isAuthenticated, isReady, navigate, redirectTarget]);

  if (isLoading && !session) {
    return <LoadingScreen message="Validando sessao" />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-background px-4 py-24">
      <div className="absolute inset-0 z-0">
        <img
          src={
            portalData?.settings.heroImageUrl ||
            'https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?q=80&w=2070&auto=format&fit=crop'
          }
          alt="Login Background"
          className="w-full h-full object-cover opacity-14 scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/86 to-transparent" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="w-full max-w-lg relative z-10"
      >
        <Card className="glass-dark border-white/10 shadow-2xl overflow-hidden rounded-[2rem]">
          <CardHeader className="text-center pt-10 md:pt-12 pb-8">
            <div className="w-20 h-20 lg:w-24 lg:h-24 bg-neon rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-[0_0_24px_rgba(226,232,240,0.18)]">
              <span className="text-black font-display font-black text-4xl">B</span>
            </div>

            <CardTitle className="text-4xl font-display font-black tracking-tighter uppercase">
              {portalData?.settings.shortName || 'BASE'}<span className="text-neon">FIVEM</span>
            </CardTitle>

            <CardDescription className="text-white/60 text-sm mt-2 uppercase tracking-[0.2em] font-bold">
              Autenticacao oficial via Discord
            </CardDescription>
          </CardHeader>

          <CardContent className="px-6 md:px-10 pb-10 md:pb-12">
            <div className="space-y-6">
              {/* <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/5 flex items-start gap-4">
                <Shield className="w-5 h-5 text-neon shrink-0 mt-1" />
                <div className="space-y-2">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-white/50">Acesso validado no bot</p>
                  <p className="text-sm text-white/72 leading-relaxed">
                    O login agora passa pelo backend do bot, grava sessao por cookie e valida Discord, servidor principal e permissao administrativa em um fluxo unico.
                  </p>
                </div>
              </div> */}

              {errorMessage ? (
                <div className="p-5 rounded-2xl bg-red-500/8 border border-red-500/20 flex items-start gap-4">
                  <AlertTriangle className="w-5 h-5 text-red-300 shrink-0 mt-1" />
                  <div className="space-y-3">
                    <p className="text-sm text-red-50/85 leading-relaxed">{errorMessage}</p>
                    {portalData?.settings.discordUrl ? (
                      <a
                        href={portalData.settings.discordUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex text-[11px] uppercase tracking-[0.18em] font-black text-red-100 hover:text-white transition-colors"
                      >
                        Entrar no Discord oficial
                      </a>
                    ) : null}
                  </div>
                </div>
              ) : null}

              <Button
                onClick={() => loginWithDiscord(redirectTarget)}
                disabled={!portalData?.features.loginEnabled}
                className="w-full h-16 bg-[#5865F2] hover:bg-[#4752C4] disabled:bg-white/10 disabled:text-white/40 text-white font-black text-lg rounded-2xl transition-colors flex items-center justify-center gap-4 shadow-xl"
              >
                <MessageSquare className="w-6 h-6 fill-white" />
                ENTRAR COM DISCORD
              </Button>

              {/* <div className="rounded-2xl border border-white/6 px-5 py-4 text-sm text-white/58 leading-relaxed">
                O bot libera sua area player assim que a conta for validada e, se o cargo permitir, ja abre o acesso do painel administrativo.
              </div> */}

              {/* <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/6 bg-white/[0.02] px-4 py-4">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-white/30 font-black mb-2">Servidor principal</div>
                  <div className="text-sm font-bold text-white">
                    {portalData?.settings.serverName || 'Nao informado'}
                  </div>
                </div>
                <div className="rounded-2xl border border-white/6 bg-white/[0.02] px-4 py-4">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-white/30 font-black mb-2">Sem sessao local</div>
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    <RefreshCcw className="w-4 h-4 text-neon" />
                    Backend centralizado
                  </div>
                </div>
              </div> */}
            </div>
          </CardContent>
        </Card>

        <p className="text-center mt-8 text-sm text-white/42 leading-relaxed max-w-md mx-auto">
          Ao continuar, voce confirma que leu as{' '}
          <a href="/rules" className="text-white/70 hover:text-neon underline underline-offset-4">
            regras da cidade
          </a>{' '}
          e aceita o fluxo oficial do servidor.
        </p>
      </motion.div>
    </div>
  );
}
