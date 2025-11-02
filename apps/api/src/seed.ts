import { db, schema } from './db/index.js';
import { env } from './env.js';

async function seed() {
  console.log('Seeding database...');

  // Create mineiro shop
  const [shop] = await db
    .insert(schema.shops)
    .values({
      slug: 'mineiro',
      name: 'Barbearia Mineiro',
      domain: 'eutonafila.com',
      path: '/mineiro',
      apiBase: 'https://eutonafila.com',
      theme: {
        primary: '#3E2723',
        accent: '#FFD54F',
      },
    })
    .returning();

  console.log('Created shop:', shop);

  // Create services
  const serviceData = [
    { name: 'Corte de Cabelo', description: 'Corte tradicional', duration: 30, price: 3000 },
    { name: 'Barba', description: 'Aparar e modelar barba', duration: 20, price: 2000 },
    { name: 'Corte + Barba', description: 'Combo completo', duration: 45, price: 4500 },
  ];

  const services = await db
    .insert(schema.services)
    .values(
      serviceData.map((s) => ({
        shopId: shop.id,
        ...s,
      }))
    )
    .returning();

  console.log('Created services:', services.length);

  // Create barbers
  const barberData = [
    { name: 'João Silva', email: 'joao@mineiro.com', phone: '+5511999999999' },
    { name: 'Pedro Santos', email: 'pedro@mineiro.com', phone: '+5511988888888' },
  ];

  const barbers = await db
    .insert(schema.barbers)
    .values(
      barberData.map((b) => ({
        shopId: shop.id,
        ...b,
      }))
    )
    .returning();

  console.log('Created barbers:', barbers.length);

  console.log('Seed complete!');
}

seed().catch(console.error);

