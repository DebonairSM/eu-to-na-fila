import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export function CompanyHomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a0a] via-[#0f0f0f] to-[#121212] text-white">
      <header className="border-b border-white/10 bg-black/40 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#E8C547] flex items-center justify-center text-[#0a0a0a] font-extrabold text-lg">
              E
            </div>
            <div>
              <p className="text-sm text-white/70">EuToNaFila</p>
              <p className="text-lg font-semibold">Virtual Line Software</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/join">
              <Button variant="outline" className="border-white/20 text-white hover:border-[#D4AF37] hover:text-[#D4AF37]">
                Área Mineiro
              </Button>
            </Link>
            <Link to="/mineiro/home">
              <Button className="bg-[#D4AF37] text-[#0a0a0a] hover:bg-[#E8C547]">
                Barbearia Mineiro
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <section className="text-center space-y-6 sm:space-y-8">
          <p className="text-sm uppercase tracking-[0.3em] text-[#D4AF37]">Florianópolis, SC</p>
          <h1 className="text-3xl sm:text-5xl font-semibold leading-tight">
            Filas virtuais de alto padrão
            <br className="hidden sm:block" /> acessíveis para qualquer operação
          </h1>
          <p className="text-lg text-white/70 max-w-2xl mx-auto">
            A EuToNaFila cria experiências premium de espera e atendimento. Software completo,
            pronto para marcas que precisam de controle, personalização e rapidez sem abrir mão da
            hospitalidade.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <Link to="/mineiro/home">
              <Button size="lg" className="bg-[#D4AF37] text-[#0a0a0a] hover:bg-[#E8C547]">
                Ver caso real: Barbearia Mineiro
              </Button>
            </Link>
            <Link to="/join">
              <Button size="lg" variant="outline" className="border-white/20 text-white hover:border-[#D4AF37] hover:text-[#D4AF37]">
                Experimente a fila agora
              </Button>
            </Link>
          </div>
        </section>

        <section className="mt-14 sm:mt-16 grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {[
            {
              title: 'Luxo acessível',
              desc: 'Interface premium, custo previsível e implantação rápida para negócios que não podem parar.',
            },
            {
              title: 'Operação em tempo real',
              desc: 'Fila, presença e atendimento com atualizações instantâneas para equipe e clientes.',
            },
            {
              title: 'Sob medida',
              desc: 'Branding, horários, serviços e métricas configuráveis para cada unidade.',
            },
          ].map((item) => (
            <Card key={item.title} className="bg-white/5 border-white/10">
              <CardContent className="p-6 space-y-2">
                <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                <p className="text-sm text-white/70">{item.desc}</p>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="mt-14 sm:mt-16 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] border-white/10">
            <CardContent className="p-6 space-y-3">
              <p className="text-[#D4AF37] text-sm font-semibold uppercase tracking-widest">Para sua rede</p>
              <h3 className="text-2xl font-semibold">Tecnologia que acompanha a marca</h3>
              <p className="text-white/70 text-sm">
                Suporte a múltiplas unidades, funções por perfil (owner, staff, cliente) e métricas de operação.
                Infra segura, pronta para picos de tráfego e com monitoramento contínuo.
              </p>
              <div className="flex flex-wrap gap-2 text-sm text-white/80">
                <span className="px-3 py-1 rounded-full bg-white/10">Multi-loja</span>
                <span className="px-3 py-1 rounded-full bg-white/10">Fila com presença</span>
                <span className="px-3 py-1 rounded-full bg-white/10">Notificações</span>
                <span className="px-3 py-1 rounded-full bg-white/10">Painel em tempo real</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-white">Pronto para atender</h3>
                <span className="text-sm text-[#D4AF37] font-semibold">Go-live rápido</span>
              </div>
              <ul className="space-y-3 text-sm text-white/75">
                <li>• Onboarding acompanhado pela equipe em Florianópolis</li>
                <li>• Templates de marca e operação para começar em dias</li>
                <li>• APIs e WebSocket já integrados para dashboards</li>
                <li>• Suporte a tablets, totem e mobile sem instalação</li>
              </ul>
              <div className="flex gap-3">
                <Link to="/login">
                  <Button className="bg-[#D4AF37] text-[#0a0a0a] hover:bg-[#E8C547]">Entrar como staff</Button>
                </Link>
                <Link to="/mineiro/home">
                  <Button variant="outline" className="border-white/20 text-white hover:border-[#D4AF37] hover:text-[#D4AF37]">
                    Conhecer fluxo do cliente
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}

