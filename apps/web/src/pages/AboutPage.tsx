import { Card, CardContent } from '@/components/ui/card';
import { CompanyNav } from '@/components/CompanyNav';

const values = [
  { title: 'Hospitalidade', desc: 'Fila sem fricção' },
  { title: 'Confiabilidade', desc: 'Infra monitorada, tempo real' },
  { title: 'Personalização', desc: 'Ajustado por unidade' },
];

const milestones = [
  { year: '2024', label: 'Piloto', detail: 'Rollout com Barbearia Mineiro' },
  { year: '2025', label: 'Expansão', detail: 'Múltiplas unidades' },
];

export function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#071124] via-[#0b1a33] to-[#0e1f3d] text-white">
      <CompanyNav />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16 space-y-10">
        <header className="space-y-3">
          <p className="text-sm uppercase tracking-[0.25em] text-[#D4AF37]">Sobre nós</p>
          <h1 className="text-3xl sm:text-4xl font-semibold">EuToNaFila</h1>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {values.map((v) => (
            <Card key={v.title} className="bg-white/5 border-white/10">
              <CardContent className="p-5 space-y-2">
                <h3 className="text-lg font-semibold text-white">{v.title}</h3>
                <p className="text-sm text-white/70">{v.desc}</p>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Linha do tempo</h2>
          <div className="space-y-3">
            {milestones.map((m) => (
              <div key={m.year} className="flex items-start gap-3 border border-white/10 bg-white/5 rounded-lg p-4">
                <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-[#D4AF37] to-[#0f3d2e] flex items-center justify-center text-[#0a0a0a] font-bold">
                  {m.year}
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-white/60 uppercase tracking-[0.1em]">{m.label}</p>
                  <p className="text-white">{m.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold">Equipe central</h2>
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-5 space-y-2">
                <p className="text-sm text-white/70">Time em Florianópolis, próximo das operações.</p>
              </CardContent>
            </Card>
        </section>
      </div>
    </div>
  );
}

