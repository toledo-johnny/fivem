import { Link } from 'react-router-dom';
import { Instagram, MessageSquare, Sparkles, Twitch, Youtube } from 'lucide-react';
import { usePublicPortal } from '../../context/PublicPortalContext';

const institutionalLinks = [
  { label: 'Inicio', href: '/' },
  { label: 'Updates', href: '/updates' },
  { label: 'Regras', href: '/rules' },
  { label: 'Loja de Diamantes', href: '/#shop' },
];

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const { data: portalData } = usePublicPortal();
  const settings = portalData?.settings;
  const socialLinks = [
    { icon: Instagram, href: settings?.socialLinks.instagram },
    { icon: Youtube, href: settings?.socialLinks.youtube },
    { icon: Twitch, href: settings?.socialLinks.twitch },
    { icon: MessageSquare, href: settings?.discordUrl || settings?.socialLinks.discord },
  ].filter((item) => item.href);

  return (
    <footer className="bg-black border-t border-white/6 pt-20 md:pt-24 pb-12 md:pb-16 relative overflow-hidden">
      <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-neon/4 blur-[120px] rounded-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-[1.25fr_0.75fr] gap-12 lg:gap-16 mb-16 md:mb-20">
          <div className="space-y-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-neon rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(226,232,240,0.12)]">
                <Sparkles className="text-black w-7 h-7" />
              </div>
              <span className="text-2xl font-display font-black tracking-tighter uppercase leading-none">
                {settings?.shortName || settings?.serverName || 'BASEFIVEM'}
              </span>
            </div>

            <p className="text-white/50 max-w-xl leading-relaxed text-sm font-bold italic">
              {settings?.heroSubtitle ||
                'Uma cidade unica para quem busca longevidade, organizacao e profundidade no roleplay, com acesso oficial via Discord e suporte centralizado.'}
            </p>

            {socialLinks.length > 0 ? (
              <div className="flex flex-wrap gap-3">
                {socialLinks.map(({ icon: Icon, href }) => (
                  <a
                    key={href}
                    href={href || '#'}
                    target="_blank"
                    rel="noreferrer"
                    className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/6 flex items-center justify-center hover:bg-white/10 hover:text-white transition-colors duration-300 group"
                  >
                    <Icon className="w-5 h-5 opacity-60 group-hover:opacity-100" />
                  </a>
                ))}
              </div>
            ) : null}
          </div>

          <div>
            <h4 className="text-white font-black mb-6 uppercase tracking-[0.3em] text-[10px] italic">Navegacao</h4>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              {institutionalLinks.map((item) => (
                <li key={item.label}>
                  <Link
                    to={item.href}
                    className="text-white/40 hover:text-white transition-all text-xs font-bold uppercase tracking-widest flex items-center group"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-white/10 mr-3 group-hover:bg-white/60 group-hover:w-3 transition-all shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="pt-10 md:pt-14 border-t border-white/6 flex flex-col lg:flex-row justify-between items-center gap-6">
          <p className="text-white/16 text-[10px] font-black uppercase tracking-[0.35em] text-center lg:text-left">
              {settings?.footerText || `Copyright ${currentYear} ${settings?.serverName || 'Base FiveM'} | Todos os direitos reservados.`}
          </p>

          <div className="flex flex-wrap justify-center gap-6 md:gap-10">
            <Link
              to="/rules"
              className="text-white/18 hover:text-white text-[10px] font-black uppercase tracking-[0.3em] transition-colors"
            >
              Politicas
            </Link>
            <Link
              to="/rules"
              className="text-white/18 hover:text-white text-[10px] font-black uppercase tracking-[0.3em] transition-colors"
            >
              Diretrizes DC
            </Link>
            <Link
              to="/updates"
              className="text-white/18 hover:text-white text-[10px] font-black uppercase tracking-[0.3em] transition-colors"
            >
              Updates
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
