import { ArrowLeft, ArrowRight, CalendarDays, CheckCircle2 } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { usePublicPortal } from '../context/PublicPortalContext';
import { buildNewsSlug, formatDateLong, getNewsImage, splitTextLines } from '../lib/portal';

export default function UpdateDetail() {
  const navigate = useNavigate();
  const { slug } = useParams();
  const { data: portalData } = usePublicPortal();
  const update = (portalData?.news || []).find((item) => buildNewsSlug(item) === slug);
  const lines = splitTextLines(update?.descriptionText);

  if (!update) {
    return (
      <div className="min-h-screen pt-28 pb-20 bg-background">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="glass-dark rounded-[2rem] border-white/6 p-10 text-center">
            <div className="text-[11px] uppercase tracking-[0.2em] text-white/35 font-black mb-4">Update nao encontrado</div>
            <h1 className="text-3xl font-display font-black uppercase tracking-tight mb-4">Nao encontramos esse update.</h1>
            <p className="text-white/60 leading-relaxed mb-8">
              Volte para a listagem principal para abrir um pacote valido de novidades da cidade.
            </p>
            <Button
              onClick={() => navigate('/updates')}
              className="h-12 px-6 bg-neon text-black hover:bg-neon/90 font-black rounded-2xl uppercase tracking-[0.16em]"
            >
              VOLTAR PARA UPDATES
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-28 pb-20 bg-background relative">
      <div className="absolute inset-0 -z-10 bg-dot-pattern opacity-12" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="flex flex-wrap items-center gap-4 text-[11px] uppercase tracking-[0.18em] text-white/38 font-black">
          <Link to="/updates" className="inline-flex items-center gap-2 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Link>
          <span className="text-white/20">/</span>
          <span>{update.category || 'Update'}</span>
        </div>

        <div className="space-y-10">
          <div className="overflow-hidden rounded-[2.4rem] border border-white/8">
            <div className="aspect-[16/7] overflow-hidden">
              <img src={getNewsImage(update)} alt={update.title} className="w-full h-full object-cover object-center" />
            </div>
          </div>

          <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_260px]">
            <article className="space-y-10">
              <div className="space-y-5">
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-white/34 font-black">
                  <CalendarDays className="w-4 h-4 text-neon" />
                  {formatDateLong(update.publishedAt || update.createdAt)}
                </div>
                <h1 className="text-4xl md:text-6xl font-display font-black uppercase tracking-tight">{update.title}</h1>
                <p className="max-w-4xl text-lg text-white/68 leading-relaxed">{update.descriptionText}</p>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {lines.slice(0, 3).map((highlight) => (
                  <div key={highlight} className="border-l border-white/12 pl-5">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-white/28 font-black mb-3">Destaque</div>
                    <p className="text-sm text-white/70 leading-relaxed">{highlight}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-8">
                {(lines.length > 0 ? lines : [update.descriptionText]).map((line, index) => (
                  <section key={`${update.id}-${index}`} className="border-t border-white/10 pt-8">
                    <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
                      <div>
                        <div className="text-[10px] uppercase tracking-[0.22em] text-white/30 font-black mb-3">
                          Bloco {index + 1}
                        </div>
                        <h2 className="text-2xl md:text-3xl font-display font-black uppercase tracking-tight">
                          {index === 0 ? 'Comunicado principal' : `Complemento ${index}`}
                        </h2>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-start gap-3 text-sm text-white/66 leading-relaxed">
                          <CheckCircle2 className="w-4 h-4 text-neon mt-0.5 shrink-0" />
                          <span>{line}</span>
                        </div>
                      </div>
                    </div>
                  </section>
                ))}
              </div>
            </article>

            <aside className="space-y-5 xl:sticky xl:top-28 self-start">
              <div className="border border-white/10 rounded-[1.75rem] p-6">
                <div className="text-[10px] uppercase tracking-[0.24em] text-white/30 font-black mb-4">Pacote atual</div>
                <div className="space-y-4">
                  <div className="pb-4 border-b border-white/8">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-white/30 font-black">Categoria</div>
                    <div className="mt-2 text-sm font-bold text-white">{update.category || 'Comunicado'}</div>
                  </div>
                  <div className="pb-4 border-b border-white/8">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-white/30 font-black">Blocos incluidos</div>
                    <div className="mt-2 text-sm font-bold text-white">{Math.max(lines.length, 1)} secoes</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.2em] text-white/30 font-black">Leitura sugerida</div>
                    <div className="mt-2 text-sm font-bold text-white">Principal + ajustes complementares</div>
                  </div>
                </div>
              </div>

              <div className="border border-white/10 rounded-[1.75rem] p-6">
                <div className="text-[10px] uppercase tracking-[0.24em] text-white/30 font-black mb-4">Proximo passo</div>
                <p className="text-sm text-white/62 leading-relaxed mb-5">
                  Leia as regras atualizadas e acesse o login para acompanhar a cidade no painel.
                </p>
                <Button
                  onClick={() => navigate('/login')}
                  className="w-full h-12 bg-neon text-black hover:bg-neon/90 font-black rounded-2xl uppercase tracking-[0.16em]"
                >
                  ACESSAR LOGIN
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
