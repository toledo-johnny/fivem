import { Button } from '@/components/ui/button';
import { AlertTriangle, ArrowRight, Ban, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePublicPortal } from '../context/PublicPortalContext';
import { getContentSummary, splitParagraphs } from '../lib/portal';

const sectionOrder = ['rules', 'faq', 'help_center', 'changelog'];
const sectionLabels: Record<string, string> = {
  rules: 'Regras',
  faq: 'FAQ',
  help_center: 'Central de ajuda',
  changelog: 'Changelog',
};

export default function Rules() {
  const navigate = useNavigate();
  const { data: portalData } = usePublicPortal();
  const blocks = portalData?.contentBlocks || {};
  const sections = sectionOrder
    .map((key) => blocks[key])
    .filter(Boolean)
    .map((block) => ({
      id: block.contentKey,
      nav: sectionLabels[block.contentKey] || block.title,
      title: block.title,
      paragraphs: splitParagraphs(block.bodyText),
      points: getContentSummary(block),
    }));

  return (
    <div className="min-h-screen pt-24 pb-20 bg-background">
      <div className="border-b border-white/6 bg-black/20 backdrop-blur-xl">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-[11px] uppercase tracking-[0.2em] text-white/36 font-black mb-3">Documentacao oficial</div>
          <h1 className="text-4xl md:text-6xl font-display font-black tracking-tight uppercase">Regras da Cidade</h1>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid xl:grid-cols-[240px_minmax(0,1fr)_220px] gap-8 xl:gap-10">
          <aside className="hidden xl:block py-10">
            <div className="sticky top-28 rounded-[1.75rem] border border-white/6 bg-black/24 backdrop-blur-xl p-5">
              <div className="text-[10px] uppercase tracking-[0.24em] text-white/30 font-black mb-4">Guia da cidade</div>
              <nav className="space-y-2">
                {sections.map((section) => (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    className="flex items-center justify-between rounded-2xl px-4 py-3 text-sm text-white/56 hover:text-white hover:bg-white/[0.04] transition-colors"
                  >
                    <span>{section.nav}</span>
                    <span className="text-white/20">›</span>
                  </a>
                ))}
              </nav>
            </div>
          </aside>

          <article className="py-10 space-y-8 max-w-4xl">
            <div className="rounded-[2rem] border border-white/6 bg-black/24 backdrop-blur-xl overflow-hidden">
              <div className="p-8 md:p-10">
                <div className="text-[11px] uppercase tracking-[0.18em] text-white/34 font-black mb-4">Base sincronizada</div>
                <p className="text-base md:text-lg text-white/68 leading-relaxed max-w-3xl">
                  Esta pagina reaproveita os blocos oficiais do bot para centralizar regras, ajuda, FAQ e changelog dentro do mesmo padrao visual do portal.
                </p>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              {[
                { icon: AlertTriangle, title: 'Advertencia', text: 'Falhas leves, ruido de cena e reincidencia baixa.' },
                { icon: ShieldCheck, title: 'Kick', text: 'Quebra clara de fluxo, abandono de acao ou falta operacional.' },
                { icon: Ban, title: 'Banimento', text: 'Abuso grave, exploit, conta duplicada ou dano recorrente.' },
              ].map((item) => (
                <div key={item.title} className="rounded-[1.75rem] border border-white/6 bg-black/24 backdrop-blur-xl p-6">
                  <item.icon className="w-5 h-5 text-neon mb-4" />
                  <h2 className="text-2xl font-display font-black uppercase tracking-tight mb-3">{item.title}</h2>
                  <p className="text-sm text-white/58 leading-relaxed">{item.text}</p>
                </div>
              ))}
            </div>

            <div className="rounded-[1.75rem] border border-amber-500/20 bg-amber-500/8 px-6 py-5 text-sm text-amber-50/82 leading-relaxed">
              O conteudo abaixo vem do bot e pode ser ajustado pela equipe administrativa. Use esta pagina como referencia oficial para entrada, suporte e revisao de conduta.
            </div>

            {sections.map((section) => (
              <section key={section.id} id={section.id} className="scroll-mt-32 rounded-[2rem] border border-white/6 bg-black/24 backdrop-blur-xl p-7 md:p-9 space-y-6">
                <div className="space-y-3">
                  <div className="text-[10px] uppercase tracking-[0.22em] text-white/30 font-black">{section.nav}</div>
                  <h2 className="text-3xl md:text-4xl font-display font-black uppercase tracking-tight">{section.title}</h2>
                </div>

                <div className="space-y-4">
                  {(section.paragraphs.length > 0 ? section.paragraphs : [section.points[0]]).map((paragraph) => (
                    <p key={paragraph} className="text-white/68 leading-relaxed text-base">
                      {paragraph}
                    </p>
                  ))}
                </div>

                <div className="space-y-3">
                  {section.points.map((point) => (
                    <div key={point} className="flex items-start gap-3 text-sm text-white/66 leading-relaxed">
                      <ShieldCheck className="w-4 h-4 text-neon mt-0.5 shrink-0" />
                      <span>{point}</span>
                    </div>
                  ))}
                </div>
              </section>
            ))}

            <div className="rounded-[2rem] border border-white/6 bg-black/24 backdrop-blur-xl p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <h2 className="text-2xl font-display font-black uppercase tracking-tight mb-2">Pronto para seguir?</h2>
                <p className="text-white/56 text-sm leading-relaxed">
                  Revise a documentacao, confirme o acesso no Discord e siga para o login da cidade.
                </p>
              </div>

              <Button
                onClick={() => navigate('/login')}
                className="h-14 px-8 bg-neon text-black hover:bg-neon/90 font-black rounded-2xl uppercase tracking-[0.16em]"
              >
                IR PARA LOGIN
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
          </article>

          <aside className="hidden xl:block py-10">
            <div className="sticky top-28 rounded-[1.75rem] border border-white/6 bg-black/24 backdrop-blur-xl p-5">
              <div className="text-[10px] uppercase tracking-[0.24em] text-white/30 font-black mb-4">Nesta pagina</div>
              <div className="space-y-3">
                {sections.map((section) => (
                  <a key={section.id} href={`#${section.id}`} className="block text-sm text-white/56 hover:text-white transition-colors">
                    {section.title}
                  </a>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
