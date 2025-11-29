import { db, schema } from './db/index.js';
import { env } from './env.js';
import { eq } from 'drizzle-orm';

async function seed() {
  console.log('Seeding database...');

  // Check if shop already exists
  let shop = await db.query.shops.findFirst({
    where: eq(schema.shops.slug, 'mineiro'),
  });

  if (shop) {
    console.log('Shop already exists:', shop);
  } else {
    // Create mineiro shop
    [shop] = await db
      .insert(schema.shops)
      .values({
        slug: 'mineiro',
        name: 'Barbearia Mineiro',
        domain: 'eutonafila.com',
        path: '/mineiro',
        apiBase: 'https://eutonafila.com',
        theme: JSON.stringify({
          primary: '#3E2723',
          accent: '#FFD54F',
        }),
        ownerPin: '1234', // Default owner PIN - change in production!
        staffPin: '0000', // Default staff PIN - change in production!
      })
      .returning();

    console.log('Created shop:', shop);
  }

  // Check if services already exist
  const existingServices = await db.query.services.findMany({
    where: eq(schema.services.shopId, shop.id),
  });

  if (existingServices.length > 0) {
    console.log('Services already exist:', existingServices.length);
  } else {
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
  }

  // Check if barbers already exist
  const existingBarbers = await db.query.barbers.findMany({
    where: eq(schema.barbers.shopId, shop.id),
  });

  if (existingBarbers.length > 0) {
    console.log('Barbers already exist:', existingBarbers.length);
  } else {
    // Create barbers
    const barberData = [
      { name: 'João Silva', email: 'joao@mineiro.com', phone: '+5511999999999', avatarUrl: null, isPresent: true },
      { name: 'Pedro Santos', email: 'pedro@mineiro.com', phone: '+5511988888888', avatarUrl: null, isPresent: true },
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
  }

  console.log('Seed complete!');
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

