/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState } from 'react';
import { Terminal as TerminalIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function LiveLogsTerminal() {
  const [logs, setLogs] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const logTypes = [
    { prefix: '[SUCCESS]', color: 'text-green-500' },
    { prefix: '[WARNING]', color: 'text-yellow-500' },
    { prefix: '[ERROR]', color: 'text-red-500' },
    { prefix: '[SYSTEM]', color: 'text-neon' },
    { prefix: '[AUTH]', color: 'text-blue-500' },
  ];

  const logMessages = [
    'Sincronizacao de inventario concluida para #842',
    'Nova conexao estabelecida: 187.42.11.90',
    'Tentativa de login bloqueada: SteamID invalido',
    'Backup automatico da database concluido em 24ms',
    'Admin_Rodrigo baniu jogador #129 por VDM',
    'Processando transacao de diamantes: Pedido #9042',
    'Player #552 mentalizou o passaporte #3211',
    'Limpeza de entidades globais executada com sucesso',
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      const type = logTypes[Math.floor(Math.random() * logTypes.length)];
      const message = logMessages[Math.floor(Math.random() * logMessages.length)];
      const timestamp = new Date().toLocaleTimeString();

      setLogs(prev => [...prev.slice(-50), `${timestamp} ${type.prefix} ${message}`]);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="flex flex-col h-[400px] glass-dark border border-white/5 rounded-[2rem] overflow-hidden">
      <div className="bg-black/60 border-b border-white/5 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <TerminalIcon className="w-4 h-4 text-neon" />
          <h3 className="text-xs font-black uppercase tracking-widest">Live Auditor Activity</h3>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[9px] font-bold text-white/40 uppercase">Streaming</span>
        </div>
      </div>

      <div ref={scrollRef} className="flex-grow overflow-y-auto p-6 font-mono text-[10px] space-y-1.5 scrollbar-hide">
        {logs.map((log, index) => {
          const type = logTypes.find(entry => log.includes(entry.prefix));

          return (
            <div key={index} className="flex gap-3 leading-relaxed group">
              <span className="text-white/20 shrink-0 select-none">[{index + 1024}]</span>
              <span className={cn(type?.color || 'text-white/60')}>{log}</span>
            </div>
          );
        })}

        {logs.length === 0 && (
          <div className="text-white/20 uppercase tracking-widest text-center mt-20 animate-pulse">
            Iniciando streaming de logs...
          </div>
        )}
      </div>
    </div>
  );
}
