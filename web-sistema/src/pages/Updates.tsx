import { ArrowRight, CalendarDays } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { usePublicPortal } from '../context/PublicPortalContext';
import { buildNewsSlug, formatDateShort, getNewsImage, splitTextLines } from '../lib/portal';

export default function Updates() {
  const navigate = useNavigate();
  const { data: portalData } = usePublicPortal();
  const news = portalData?.news || [];
  const [featured, ...secondary] = news;

  if (!featured) {
    return (
      <div className="min-h-screen pt-28 pb-20 bg-background relative">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="glass-dark rounded-[2rem] border-white/6 p-8 md:p-10 text-center">
            <h1 className="text-3xl font-display font-black uppercase tracking-tight mb-4">Nenhum update publicado</h1>
            <p className="text-white/60 leading-relaxed mb-8">
              Assim que a equipe publicar noticias no bot, elas aparecem automaticamente aqui no portal.
            </p>
            <Button
              onClick={() => navigate('/login')}
              className="h-12 px-6 bg-neon text-black hover:bg-neon/90 font-black rounded-2xl uppercase tracking-[0.16em]"
            >
              ACESSAR PORTAL
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-28 pb-20 bg-background relative">
      <div className="absolute inset-0 -z-10 bg-dot-pattern opacity-15" />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="max-w-3xl">
          <h1 className="text-4xl md:text-6xl font-display font-black tracking-tight uppercase mb-5">
            ULTIMOS <span className="text-neon">UPDATES</span>
          </h1>
          <p className="text-white/64 text-base md:text-lg leading-relaxed">
            Noticias e comunicados oficiais publicados pelo bot e reaproveitados no dashboard da cidade.
          </p>
        </div>

        <Link to={`/updates/${buildNewsSlug(featured)}`} className="block">
          <Card className="glass-dark rounded-[2rem] border-white/6 overflow-hidden group">
            <div className="grid lg:grid-cols-[1.05fr_0.95fr]">
              <div className="aspect-[16/8] overflow-hidden">
                <img
                  src={getNewsImage(featured)}
                  alt={featured.title}
                  className="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
                />
              </div>

              <div className="p-6 md:p-10 flex flex-col justify-between gap-8">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.18em] text-neon font-black mb-4">
                    {featured.category || 'Update principal'}
                  </div>
                  <h2 className="text-3xl md:text-4xl font-display font-black uppercase tracking-tight mb-4">
                    {featured.title}
                  </h2>
                  <p className="text-white/62 leading-relaxed mb-6">{featured.descriptionText}</p>
                  <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-white/34 font-black">
                    <CalendarDays className="w-4 h-4 text-neon" />
                    {formatDateShort(featured.publishedAt || featured.createdAt)}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-white/34 font-black">
                    {splitTextLines(featured.descriptionText).length || 1} pontos neste pacote
                  </div>
                  <span className="inline-flex items-center text-[11px] uppercase tracking-[0.18em] text-neon font-black">
                    Abrir update
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {secondary.map((item) => (
            <Link key={item.id} to={`/updates/${buildNewsSlug(item)}`} className="block">
              <Card className="glass-dark rounded-[2rem] border-white/6 overflow-hidden h-full group">
                <div className="aspect-[5/4] overflow-hidden">
                  <img
                    src={getNewsImage(item)}
                    alt={item.title}
                    className="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
                  />
                </div>

                <div className="p-7">
                  <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-white/34 font-black mb-4">
                    <CalendarDays className="w-4 h-4 text-neon" />
                    {formatDateShort(item.publishedAt || item.createdAt)}
                  </div>

                  <h2 className="text-2xl font-display font-black uppercase tracking-tight mb-4">{item.title}</h2>
                  <p className="text-sm text-white/58 leading-relaxed mb-6">{item.descriptionText}</p>

                  <div className="flex items-center justify-between gap-4">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-white/34 font-black">
                      {item.category || 'Comunicado'}
                    </div>
                    <div className="text-[11px] uppercase tracking-[0.18em] text-neon font-black">
                      Abrir update
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>

        <div className="glass-dark rounded-[2rem] border-white/6 p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <h2 className="text-2xl font-display font-black uppercase tracking-tight mb-2">Quer acompanhar tudo de perto?</h2>
            <p className="text-white/56 text-sm leading-relaxed">
              Acesse o login, valide sua conta no Discord e acompanhe a cidade pelo fluxo oficial.
            </p>
          </div>

          <Button
            onClick={() => navigate('/login')}
            className="h-14 px-8 bg-neon text-black hover:bg-neon/90 font-black rounded-2xl uppercase tracking-[0.16em]"
          >
            ACESSAR
            <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
