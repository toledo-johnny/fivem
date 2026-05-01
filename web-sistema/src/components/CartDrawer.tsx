import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CreditCard, ExternalLink, Gem, ShoppingBag, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '../context/AuthContext';
import { useShop } from '../context/ShopContext';
import { formatCurrencyFromCents } from '../lib/portal';
import { createPortalOrder } from '../services/api';

export default function CartDrawer({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { cart, removeFromCart, total, clearCart } = useShop();
  const { isAuthenticated, loginWithDiscord, refreshSession } = useAuth();
  const [message, setMessage] = useState('');
  const [checkoutBusy, setCheckoutBusy] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setMessage('');
    }
  }, [isOpen]);

  const canCheckout = cart.length === 1;

  const handleCheckout = async () => {
    if (!isAuthenticated) {
      loginWithDiscord('/dashboard');
      return;
    }

    if (!canCheckout) {
      setMessage('No momento cada pedido gera um checkout por pacote. Deixe apenas um item no carrinho.');
      return;
    }

    const selectedItem = cart[0];
    if (!selectedItem) {
      return;
    }

    setCheckoutBusy(true);
    try {
      const response = await createPortalOrder(selectedItem.id, selectedItem.quantity);
      if (!response.item.providerCheckoutUrl) {
        setMessage('O pedido foi criado, mas o checkout ainda nao ficou disponivel.');
        return;
      }

      window.open(response.item.providerCheckoutUrl, '_blank', 'noopener,noreferrer');
      clearCart();
      await refreshSession();
      if (response.item.metadata?.checkoutReturnEnabled === false) {
        setMessage(
          'Checkout aberto em modo dev. Como o retorno do Mercado Pago nao aceita localhost, volte manualmente ao dashboard depois do pagamento para aguardar a sincronizacao.',
        );
        return;
      }

      setMessage('Pedido criado e checkout aberto em uma nova aba.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Falha ao iniciar a compra.');
    } finally {
      setCheckoutBusy(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
          />

          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            className="fixed top-0 right-0 h-full w-full max-w-md glass-dark border-l border-white/10 z-[70] shadow-2xl flex flex-col"
          >
            <div className="p-6 sm:p-8 border-b border-white/5 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <h2 className="text-2xl font-display font-black tracking-tighter uppercase">Seu Carrinho</h2>
                <p className="text-xs text-white/40 font-bold uppercase tracking-widest mt-1">
                  Pacotes oficiais do portal
                </p>
              </div>

              <Button variant="ghost" size="icon" onClick={onClose} className="h-10 w-10 hover:bg-white/5 shrink-0">
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="flex-grow overflow-y-auto p-6 sm:p-8 space-y-5">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center opacity-60">
                  <ShoppingBag className="w-16 h-16 mb-4" />
                  <p className="text-sm font-bold uppercase tracking-widest">Seu carrinho esta vazio</p>
                  <p className="mt-2 max-w-xs text-xs text-white/40">
                    Adicione um pacote de diamantes para gerar o checkout oficial do portal.
                  </p>
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.id} className="flex gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/5 group">
                    <div className="w-[4.5rem] h-[4.5rem] rounded-2xl overflow-hidden bg-white/5 flex items-center justify-center shrink-0">
                      <Gem className="w-7 h-7 text-neon" />
                    </div>

                    <div className="flex-grow min-w-0">
                      <div className="flex justify-between items-start gap-3">
                        <div className="min-w-0">
                          <h4 className="font-bold text-sm truncate">{item.name}</h4>
                          <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold mt-1">
                            {item.diamondAmount.toLocaleString('pt-BR')} diamantes
                            {item.bonusAmount > 0 ? ` + ${item.bonusAmount.toLocaleString('pt-BR')} bonus` : ''}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeFromCart(item.id)}
                          className="h-8 w-8 text-white/20 hover:text-red-500 hover:bg-red-500/10 shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-3">
                        <div className="text-[10px] text-white/35 uppercase tracking-widest font-bold">
                          {item.quantity}x selecionado
                        </div>
                        <div className="text-neon font-black font-display tracking-widest text-lg">
                          {formatCurrencyFromCents(item.priceCents * item.quantity)}
                        </div>
                      </div>

                      <div className="mt-3 text-[10px] uppercase tracking-[0.18em] text-white/45 font-black">
                        Checkout automatico via pedido interno
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 ? (
              <div className="p-6 sm:p-8 border-t border-white/5 space-y-5 bg-black/40">
                <div className="flex justify-between items-end gap-4">
                  <span className="text-white/40 text-xs font-bold uppercase tracking-widest">Subtotal</span>
                  <div className="text-right">
                    <div className="text-3xl font-display font-black text-white leading-none">
                      {formatCurrencyFromCents(total)}
                    </div>
                    <div className="text-[9px] text-neon font-bold uppercase tracking-tighter mt-1">
                      Total previsto
                    </div>
                  </div>
                </div>

                {message ? (
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-xs text-white/68 leading-relaxed">
                    {message}
                  </div>
                ) : null}

                <div className="grid gap-3">
                  <Button
                    onClick={handleCheckout}
                    disabled={!canCheckout || checkoutBusy}
                    className="w-full h-14 bg-neon text-black disabled:bg-white/10 disabled:text-white/40 font-black uppercase text-xs tracking-[0.2em] rounded-2xl shadow-lg shadow-neon/10 group"
                  >
                    {canCheckout ? <CreditCard className="w-4 h-4 mr-2" /> : <ExternalLink className="w-4 h-4 mr-2" />}
                    {checkoutBusy ? 'Criando pedido...' : canCheckout ? 'Abrir checkout' : 'Um item por compra'}
                  </Button>

                  <Button
                    variant="ghost"
                    onClick={clearCart}
                    className="w-full text-white/30 hover:text-red-500 text-[10px] font-bold uppercase tracking-widest"
                  >
                    Limpar Carrinho
                  </Button>
                </div>
              </div>
            ) : null}
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
