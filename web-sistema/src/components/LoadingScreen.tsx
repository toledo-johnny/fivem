interface LoadingScreenProps {
  message?: string;
}

export default function LoadingScreen({ message = 'Carregando cidade' }: LoadingScreenProps) {
  return (
    <div className="fixed inset-0 bg-background z-[100] flex flex-col items-center justify-center">
      <div className="w-24 h-24 bg-neon rounded-[2rem] flex items-center justify-center shadow-[0_0_24px_rgba(226,232,240,0.12)]">
        <span className="text-black font-display font-black text-5xl leading-none">B</span>
      </div>

      <div className="mt-10 text-center">
        <div className="text-2xl font-display font-black tracking-tighter uppercase mb-2">
          BASE<span className="text-neon">FIVEM</span>
        </div>
        <div className="text-[11px] font-black text-white/34 tracking-[0.28em] uppercase">
          {message}
        </div>
        <div className="mt-5 h-px w-28 mx-auto bg-gradient-to-r from-transparent via-white/25 to-transparent" />
      </div>
    </div>
  );
}
