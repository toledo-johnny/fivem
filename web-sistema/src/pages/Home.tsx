import { motion } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowRight, MessageSquare, RadioTower, ShoppingBag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useShop } from '../context/ShopContext';
import { usePublicPortal } from '../context/PublicPortalContext';
import { cn } from '@/lib/utils';
import { formatCurrencyFromCents, getConnectLabel, getPackageImage } from '../lib/portal';

export default function Home() {
  const navigate = useNavigate();
  const { addToCart } = useShop();
  const { data: portalData, error, status } = usePublicPortal();
  const settings = portalData?.settings;
  const packages = portalData?.packages || [];
  const fivemStatus = portalData?.fivemStatus;
  const brandPrimary = settings?.shortName || 'BASE';
  const brandSecondary = settings?.shortName ? settings.serverName : 'FIVEM';

  return (
    <div className="flex flex-col min-h-screen bg-background relative overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-dot-pattern opacity-20" />
      <div className="absolute top-[-12%] right-[-8%] w-[28rem] h-[28rem] bg-neon/8 blur-[140px] rounded-full -z-10" />
      <div className="absolute bottom-[8%] left-[-10%] w-[24rem] h-[24rem] bg-neon/5 blur-[120px] rounded-full -z-10" />

      <section id="home" className="relative min-h-screen flex items-center justify-center pt-24 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src={
              settings?.heroImageUrl ||
              'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=1974&auto=format&fit=crop'
            }
            alt="City Background"
            className="w-full h-full object-cover opacity-28 scale-105 cinematic-mask"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/35 via-background/52 to-background" />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="max-w-5xl mx-auto text-center"
          >
            <div className="text-[11px] md:text-xs font-black uppercase tracking-[0.28em] text-white/42 mb-6">
              {settings?.landingSections?.heroTag || 'Dashboard'}
            </div>

            <h1 className="text-5xl sm:text-6xl md:text-8xl lg:text-[8.75rem] font-display font-black leading-[0.88] tracking-tight uppercase mb-8 break-words">
              Base FiveM
              <br />
              {/* <span className="text-neon">{brandSecondary}</span> */}
            </h1>

            <p className="text-base sm:text-lg md:text-2xl text-white/78 max-w-3xl mx-auto mb-10 md:mb-12 leading-relaxed font-medium">
              {settings?.heroSubtitle ||
                'Uma cidade unica com acesso mais direto, leitura limpa e uma experiencia pensada para ficar clara do primeiro clique ate a conexao.'}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-5">
              <Button
                onClick={() => navigate('/login')}
                className="w-full sm:w-auto h-14 px-8 md:px-10 bg-neon text-black hover:bg-neon/90 font-black text-base rounded-2xl shadow-[0_0_26px_rgba(226,232,240,0.16)] transition-all hover:scale-[1.02] uppercase tracking-[0.16em]"
              >
                JOGAR AGORA
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/updates')}
                className="w-full sm:w-auto h-14 px-8 md:px-10 border-white/10 bg-white/5 backdrop-blur-md text-white hover:bg-white/10 font-bold text-base rounded-2xl transition-all uppercase tracking-[0.16em]"
              >
                <MessageSquare className="mr-2 w-5 h-5 text-neon" />
                VER UPDATES
              </Button>
            </div>

            {/* <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl mx-auto">
              <div className="rounded-[1.75rem] border border-white/6 bg-black/24 backdrop-blur-xl px-5 py-4 text-left">
                <div className="text-[10px] uppercase tracking-[0.22em] text-white/32 font-black mb-2">
                  Status FiveM
                </div>
                <div className={cn('text-lg font-display font-black uppercase', fivemStatus?.online ? 'text-neon' : 'text-white')}>
                  {fivemStatus?.online ? 'Online' : 'Offline'}
                </div>
                <div className="text-xs text-white/54 mt-1">
                  {fivemStatus ? `${fivemStatus.playersOnline}/${fivemStatus.playerLimit} players` : 'Aguardando status'}
                </div>
              </div>

              <div className="rounded-[1.75rem] border border-white/6 bg-black/24 backdrop-blur-xl px-5 py-4 text-left">
                <div className="text-[10px] uppercase tracking-[0.22em] text-white/32 font-black mb-2">
                  Entrada
                </div>
                <div className="text-lg font-display font-black uppercase">
                  {portalData?.servers[0]?.permissionRequired || 'Acesso aberto'}
                </div>
                <div className="text-xs text-white/54 mt-1">
                  {getConnectLabel(settings?.connectUrl || fivemStatus?.connectUrl)}
                </div>
              </div>

              <div className="rounded-[1.75rem] border border-white/6 bg-black/24 backdrop-blur-xl px-5 py-4 text-left">
                <div className="text-[10px] uppercase tracking-[0.22em] text-white/32 font-black mb-2">
                  Pacotes ativos
                </div>
                <div className="text-lg font-display font-black uppercase">{packages.length}</div>
                <div className="text-xs text-white/54 mt-1">
                  {portalData?.news.length || 0} atualizacoes publicadas
                </div>
              </div>
            </div> */}

            {status === 'error' && !portalData ? (
              <div className="mt-8 rounded-[1.75rem] border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-50/80 max-w-2xl mx-auto">
                {error}
              </div>
            ) : null}
          </motion.div>
        </div>
      </section>

      <section id="shop" className="py-20 md:py-24 relative">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="text-center max-w-3xl mx-auto mb-14 md:mb-16 px-4">
            <h2 className="text-4xl md:text-6xl font-display font-black tracking-tight uppercase mb-5">
              {settings?.landingSections?.packagesTitle || 'LOJA DE '}
              {/* <span className="text-neon">DIAMANTES</span> */}
            </h2>
            <p className="text-white/56 text-sm md:text-base leading-relaxed font-medium">
              Pacotes oficiais sincronizados com o bot e com o dashboard do servidor.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 items-stretch">
            {packages.map((item, index) => (
              <motion.div
                key={item.id}
                whileHover={{ y: -4 }}
                className={cn('relative overflow-hidden group', index === 1 || index === 4 ? 'xl:-translate-y-3' : '')}
              >
                <Card
                  className={cn(
                    'relative glass-dark border-white/6 rounded-[2.25rem] p-6 md:p-8 h-full flex flex-col justify-between overflow-hidden group-hover:border-white/10 transition-colors',
                    index === 1 || index === 4 ? 'shadow-[0_0_30px_rgba(226,232,240,0.08)]' : '',
                  )}
                >
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <img
                      src={getPackageImage(item)}
                      alt={item.name}
                      className="w-full h-full object-cover opacity-[0.08]"
                    />
                  </div>

                  <div className="relative">
                    <div className="flex items-start justify-between gap-4 mb-8">
                      <div className="text-[10px] font-black uppercase tracking-[0.28em] text-white/24">
                        {item.highlightLabel || `Pacote ${index + 1}`}
                      </div>
                      <div className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/54">
                        {item.bonusAmount > 0 ? `+${item.bonusAmount} bonus` : 'Ativo'}
                      </div>
                    </div>

                    <h3 className="text-3xl md:text-4xl font-display font-black uppercase tracking-tight mb-3">
                      {item.name}
                    </h3>
                    <p className="text-sm text-white/58 leading-relaxed mb-6">{item.descriptionText}</p>
                    <div className="text-5xl font-display font-black text-white mb-3">
                      {formatCurrencyFromCents(item.priceCents)}
                    </div>
                    <div className="text-[11px] font-black uppercase tracking-[0.18em] text-white/38 mb-8">
                      {item.diamondAmount.toLocaleString('pt-BR')} diamantes
                    </div>
                  </div>

                  <div className="relative grid gap-3">
                    <Button
                      onClick={() => addToCart(item)}
                      className="w-full h-14 bg-white/[0.04] hover:bg-neon hover:text-black font-black text-sm rounded-2xl border border-white/6 hover:border-transparent transition-all uppercase tracking-[0.16em]"
                    >
                      <ShoppingBag className="mr-2 w-4 h-4" />
                      ADICIONAR AO CARRINHO
                    </Button>
                    {/* <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-white/36 font-black">
                      <RadioTower className="w-3.5 h-3.5 text-neon" />
                      Checkout via pedido interno do portal
                    </div> */}
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>

          {packages.length === 0 && status === 'ready' ? (
            <div className="mt-8 rounded-[2rem] border border-white/6 bg-black/24 backdrop-blur-xl p-8 text-center text-white/60">
              Nenhum pacote ativo foi publicado no portal ainda.
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
