import { useState, type ChangeEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, ChevronRight, FileText, Send, ShieldCheck, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export default function WhitelistStepper() {
  const [step, setStep] = useState(1);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    experience: '',
  });

  const nextStep = () => setStep(prev => prev + 1);
  const prevStep = () => setStep(prev => prev - 1);

  const updateField =
    (field: 'name' | 'age' | 'experience') =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setFormData(prev => ({ ...prev, [field]: event.target.value }));
    };

  const canContinueStepOne = formData.name.trim().length >= 3 && Number(formData.age) >= 16;
  const canContinueStepTwo = formData.experience.trim().length >= 20;
  const protocolCode = `WL-${(formData.name.trim().slice(0, 2) || 'BF').toUpperCase()}-${formData.age || '00'}`;

  return (
    <Card className="glass-dark border-white/5 rounded-[2rem] overflow-hidden">
      <CardHeader className="p-10 border-b border-white/5">
        <div className="flex justify-between items-center mb-6">
          <CardTitle className="text-2xl font-display font-black tracking-tighter flex items-center gap-3 uppercase italic">
            SOLICITACAO DE <span className="text-neon">WHITELIST</span>
            <ShieldCheck className="w-6 h-6 text-neon" />
          </CardTitle>
          <Badge className="bg-neon text-black font-black uppercase text-[10px] tracking-widest px-3">PASSO {step} DE 3</Badge>
        </div>

        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-neon shadow-[0_0_20px_rgba(226,232,240,0.22)]"
            initial={{ width: '33%' }}
            animate={{ width: `${(step / 3) * 100}%` }}
            transition={{ type: 'spring', stiffness: 100, damping: 20 }}
          />
        </div>
      </CardHeader>

      <CardContent className="p-10 space-y-8">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-neon/10 flex items-center justify-center text-neon">
                  <User className="w-4 h-4" />
                </div>
                <h3 className="font-display font-black text-sm uppercase tracking-widest italic">Dados do Cidadao</h3>
              </div>

              <div className="grid gap-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-1">Nome Completo (OOC)</label>
                  <Input
                    value={formData.name}
                    onChange={updateField('name')}
                    placeholder="Seu nome real"
                    className="h-14 bg-white/5 border-white/5 rounded-xl focus:ring-1 focus:ring-neon/30 text-sm placeholder:text-white/10"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-1">Idade</label>
                  <Input
                    type="number"
                    value={formData.age}
                    onChange={updateField('age')}
                    placeholder="Sua idade"
                    className="h-14 bg-white/5 border-white/5 rounded-xl focus:ring-1 focus:ring-neon/30 text-sm placeholder:text-white/10"
                  />
                </div>
              </div>

              <Button
                onClick={nextStep}
                disabled={!canContinueStepOne}
                className="w-full h-14 bg-neon text-black font-black rounded-xl mt-6 group disabled:bg-white/10 disabled:text-white/40"
              >
                PROXIMO PASSO
                <ChevronRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-neon/10 flex items-center justify-center text-neon">
                  <FileText className="w-4 h-4" />
                </div>
                <h3 className="font-display font-black text-sm uppercase tracking-widest italic">Experiencia no Roleplay</h3>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-1">Ja jogou em outros servidores?</label>
                <textarea
                  value={formData.experience}
                  onChange={updateField('experience')}
                  className="w-full min-h-[160px] bg-white/5 border border-white/5 rounded-2xl p-6 text-sm focus:ring-1 focus:ring-neon/30 text-white outline-none placeholder:text-white/10 transition-all"
                  placeholder="Liste os servidores, o tempo de jogo e um resumo da sua experiencia."
                />
              </div>

              <div className="flex gap-4">
                <Button variant="outline" onClick={prevStep} className="flex-1 h-14 border-white/5 hover:bg-white/5 text-xs font-black uppercase rounded-xl">
                  VOLTAR
                </Button>
                <Button
                  onClick={nextStep}
                  disabled={!canContinueStepTwo}
                  className="flex-2 h-14 bg-neon text-black font-black uppercase rounded-xl disabled:bg-white/10 disabled:text-white/40"
                >
                  PROXIMO PASSO
                </Button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="space-y-8"
            >
              {isSubmitted ? (
                <div className="p-10 rounded-[2.5rem] bg-green-500/5 border border-green-500/20 flex flex-col items-center text-center relative overflow-hidden">
                  <div className="relative z-10">
                    <div className="w-20 h-20 rounded-3xl bg-green-500 text-black flex items-center justify-center mb-8 mx-auto shadow-[0_0_30px_rgba(34,197,94,0.3)]">
                      <Check className="w-10 h-10" />
                    </div>
                    <h4 className="text-2xl font-display font-black uppercase tracking-tighter mb-4 italic">Cadastro Enviado</h4>
                    <p className="text-xs text-white/40 leading-relaxed max-w-xs mx-auto font-bold mb-4">
                      Sua solicitacao local foi registrada com sucesso. Codigo de acompanhamento:
                    </p>
                    <Badge variant="outline" className="border-green-500/30 text-green-500 text-[8px] uppercase tracking-[0.3em]">
                      {protocolCode}
                    </Badge>
                  </div>
                </div>
              ) : (
                <div className="p-10 rounded-[2.5rem] bg-neon/5 border border-neon/10 flex flex-col items-center text-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-neon/5 animate-pulse" />
                  <div className="relative z-10">
                    <div className="w-20 h-20 rounded-3xl bg-neon text-black flex items-center justify-center mb-8 mx-auto rotate-3 shadow-[0_0_30px_rgba(226,232,240,0.18)]">
                      <Send className="w-10 h-10" />
                    </div>
                    <h4 className="text-2xl font-display font-black uppercase tracking-tighter mb-4 italic">Quase um Cidadao!</h4>
                    <p className="text-xs text-white/40 leading-relaxed max-w-xs mx-auto font-bold mb-4">
                      Ao enviar, sua solicitacao entra em modo demonstracao local para manter o fluxo completo do site.
                    </p>
                    <Badge variant="outline" className="border-neon/20 text-neon/60 text-[8px] uppercase tracking-[0.3em]">RESIDENCIA EM ANALISE</Badge>
                  </div>
                </div>
              )}

              <div className="flex gap-4">
                <Button variant="ghost" onClick={prevStep} className="flex-1 h-14 hover:bg-white/5 text-xs font-black uppercase rounded-xl">
                  REVISAR DADOS
                </Button>
                <Button
                  onClick={() => setIsSubmitted(true)}
                  className="flex-2 h-14 bg-neon text-black font-black uppercase rounded-xl shadow-[0_0_24px_rgba(226,232,240,0.14)] transition-colors"
                >
                  {isSubmitted ? 'SOLICITACAO ENVIADA' : 'FINALIZAR SOLICITACAO'}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
