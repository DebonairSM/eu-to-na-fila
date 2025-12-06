import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export function ContactPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#071124] via-[#0b1a33] to-[#0e1f3d] text-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16 space-y-10">
        <header className="space-y-3 text-center">
          <p className="text-sm uppercase tracking-[0.25em] text-[#D4AF37]">Contato</p>
          <h1 className="text-3xl sm:text-4xl font-semibold">Fale com a equipe EuToNaFila</h1>
          <p className="text-white/75 max-w-3xl mx-auto">
            Conte sobre sua operação e como podemos ajudar com filas virtuais, presença e painéis em tempo real.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 bg-white/5 border-white/10">
            <CardContent className="p-6 space-y-4">
              <h2 className="text-xl font-semibold">Envie uma mensagem</h2>
              <form className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm text-white/70" htmlFor="name">Nome</label>
                    <input
                      id="name"
                      type="text"
                      className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/60"
                      placeholder="Seu nome"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-white/70" htmlFor="email">Email</label>
                    <input
                      id="email"
                      type="email"
                      className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/60"
                      placeholder="voce@empresa.com"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-white/70" htmlFor="company">Empresa</label>
                  <input
                    id="company"
                    type="text"
                    className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/60"
                    placeholder="Nome da operação"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-white/70" htmlFor="message">Mensagem</label>
                  <textarea
                    id="message"
                    rows={4}
                    className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/60"
                    placeholder="Conte sua necessidade ou fluxo atual"
                  />
                </div>
                <Button type="button" className="bg-[#D4AF37] text-[#0a0a0a] hover:bg-[#e2c25a]">
                  Enviar
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-5 space-y-2">
                <p className="text-sm text-[#D4AF37] uppercase tracking-[0.15em]">Fale agora</p>
                <h3 className="text-lg font-semibold">Comercial</h3>
                <p className="text-white/70 text-sm">Atendimento para redes e pilotos.</p>
                <p className="text-white">comercial@eutonafila.com</p>
              </CardContent>
            </Card>
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-5 space-y-2">
                <p className="text-sm text-[#8ad6b0] uppercase tracking-[0.15em]">Suporte</p>
                <h3 className="text-lg font-semibold">Equipe técnica</h3>
                <p className="text-white/70 text-sm">Acesso, integrações e monitoramento.</p>
                <p className="text-white">suporte@eutonafila.com</p>
              </CardContent>
            </Card>
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-5 space-y-2">
                <p className="text-sm text-white/60 uppercase tracking-[0.15em]">Base</p>
                <h3 className="text-lg font-semibold">Florianópolis, SC</h3>
                <p className="text-white/70 text-sm">Operamos remotamente com presença local para implantações.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

