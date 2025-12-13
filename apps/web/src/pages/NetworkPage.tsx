import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CompanyNav } from '@/components/CompanyNav';

const shops = [
  {
    name: 'Barbearia Mineiro',
    city: 'Sangão, SC',
    description: 'Fila virtual em produção com presença, painéis e totem.',
    clientLink: '/home',
    staffLink: '/login',
  },
];

export function NetworkPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#071124] via-[#0b1a33] to-[#0e1f3d] text-white">
      <CompanyNav />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16 space-y-10">
        <header className="space-y-3">
          <p className="text-sm uppercase tracking-[0.25em] text-[#D4AF37]">Rede EuToNaFila</p>
          <h1 className="text-3xl sm:text-4xl font-semibold">Barbearias conectadas</h1>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {shops.map((shop) => (
            <Card key={shop.name} className="bg-white/5 border-white/10">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white/70">{shop.city}</p>
                    <h3 className="text-xl font-semibold text-white">{shop.name}</h3>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#D4AF37] to-[#0f3d2e] flex items-center justify-center text-[#0a0a0a] font-bold">
                    {shop.name.charAt(0)}
                  </div>
                </div>
                <p className="text-sm text-white/70">{shop.description}</p>
                <div className="flex gap-2 flex-wrap">
                  <Link to={shop.clientLink}>
                    <Button className="bg-[#D4AF37] text-[#0a0a0a] hover:bg-[#e2c25a]">Cliente</Button>
                  </Link>
                  <Link to={shop.staffLink}>
                    <Button variant="outline" className="border-white/20 text-white hover:border-[#0f3d2e] hover:text-[#0f3d2e]">
                      Equipe
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-[#8ad6b0]">Expansão</p>
              <h3 className="text-xl font-semibold text-white">Quer trazer sua rede?</h3>
            </div>
            <Link to="/contact">
              <Button className="bg-[#0f3d2e] text-white hover:bg-[#15503c]">Contato</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

