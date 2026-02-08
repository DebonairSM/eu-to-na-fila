import './dns-config.js';
import { db, schema } from './db/index.js';
import { env } from './env.js';
import { and, eq } from 'drizzle-orm';
import { hashPin } from './lib/pin.js';
import { hashPassword } from './lib/password.js';

async function seed() {
  console.log('Seeding database...');

  // Check if company already exists, create if not
  let company = await db.query.companies.findFirst({
    where: eq(schema.companies.slug, 'eutonafila'),
  });

  if (!company) {
    [company] = await db
      .insert(schema.companies)
      .values({
        name: 'EuToNaFila',
        slug: 'eutonafila',
      })
      .returning();
    console.log('Created company:', company);
  } else {
    console.log('Company already exists:', company);
  }

  // Check if company admin already exists, create if not
  let companyAdmin = await db.query.companyAdmins.findFirst({
    where: eq(schema.companyAdmins.username, 'admin'),
  });

  if (!companyAdmin) {
    const defaultPassword = 'admin123';
    [companyAdmin] = await db
      .insert(schema.companyAdmins)
      .values({
        companyId: company.id,
        username: 'admin',
        passwordHash: await hashPassword(defaultPassword),
        name: 'Administrador',
        email: 'admin@eutonafila.com',
        isActive: true,
      })
      .returning();
    console.log('Created company admin:', companyAdmin.username);
    console.log('Default credentials: admin / admin123');
  } else {
    console.log('Company admin already exists:', companyAdmin.username);
  }

  // Ensure project "mineiro" exists
  let project = await db.query.projects.findFirst({
    where: eq(schema.projects.slug, 'mineiro'),
  });
  if (!project) {
    [project] = await db
      .insert(schema.projects)
      .values({
        slug: 'mineiro',
        name: 'Mineiro',
        path: '/projects/mineiro',
      })
      .returning();
    console.log('Created project:', project);
  }

  // Check if shop already exists (by project + slug)
  let shop = await db.query.shops.findFirst({
    where: and(eq(schema.shops.projectId, project.id), eq(schema.shops.slug, 'mineiro')),
  });

  if (shop) {
    console.log('Shop already exists:', shop);
    
    // Update PIN hashes if they don't exist (migration case)
    if (!shop.ownerPinHash || !shop.staffPinHash) {
      console.log('Hashing shop PINs...');
      const ownerPinHash = shop.ownerPinHash || await hashPin(shop.ownerPin || '1234');
      const staffPinHash = shop.staffPinHash || await hashPin(shop.staffPin || '0000');
      
      const [updated] = await db
        .update(schema.shops)
        .set({
          ownerPinHash,
          staffPinHash,
          ownerPinResetRequired: !shop.ownerPinHash, // Require reset if migrating
          staffPinResetRequired: !shop.staffPinHash, // Require reset if migrating
          updatedAt: new Date(),
        })
        .where(eq(schema.shops.id, shop.id))
        .returning();
      shop = updated;
      console.log('Updated shop with hashed PINs');
    }
  } else {
    // Create mineiro shop with hashed PINs
    const defaultOwnerPin = '1234';
    const defaultStaffPin = '0000';
    
    [shop] = await db
      .insert(schema.shops)
      .values({
        projectId: project.id,
        companyId: company.id,
        slug: 'mineiro',
        name: 'Barbearia Mineiro',
        domain: 'eutonafila.com',
        path: '/projects/mineiro',
        apiBase: 'https://eutonafila.com',
        theme: JSON.stringify({
          primary: '#3E2723',
          accent: '#FFD54F',
        }),
        ownerPin: defaultOwnerPin, // Legacy: keep for migration support
        staffPin: defaultStaffPin, // Legacy: keep for migration support
        ownerPinHash: await hashPin(defaultOwnerPin),
        staffPinHash: await hashPin(defaultStaffPin),
        ownerPinResetRequired: true, // Require PIN reset on first login
        staffPinResetRequired: true, // Require PIN reset on first login
      })
      .returning();

    console.log('Created shop:', shop);
  }

  // Update existing shop to assign to company if not already assigned
  if (shop && !shop.companyId) {
    await db
      .update(schema.shops)
      .set({
        companyId: company.id,
        updatedAt: new Date(),
      })
      .where(eq(schema.shops.id, shop.id));
    console.log('Assigned shop to company');
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
    // Update existing barbers with avatars if they don't have them
    const avatarCount = 16;
    for (let i = 0; i < existingBarbers.length; i++) {
      const barber = existingBarbers[i];
      if (!barber.avatarUrl) {
        const avatarIndex = (i % avatarCount) + 1;
        const avatarUrl = `/projects/mineiro/avatars/barber-${avatarIndex}.png`;
        await db
          .update(schema.barbers)
          .set({ avatarUrl, updatedAt: new Date() })
          .where(eq(schema.barbers.id, barber.id));
        console.log(`Updated ${barber.name} with avatar: ${avatarUrl}`);
      }
    }
  } else {
    // Create barbers with avatars
    const barberData = [
      { name: 'João Silva', email: 'joao@mineiro.com', phone: '+5511999999999', avatarUrl: '/projects/mineiro/avatars/barber-1.png', isPresent: true },
      { name: 'Pedro Santos', email: 'pedro@mineiro.com', phone: '+5511988888888', avatarUrl: '/projects/mineiro/avatars/barber-2.png', isPresent: true },
      { name: 'Carlos Oliveira', email: 'carlos@mineiro.com', phone: '+5511977777777', avatarUrl: '/projects/mineiro/avatars/barber-3.png', isPresent: true },
      { name: 'Miguel Costa', email: 'miguel@mineiro.com', phone: '+5511966666666', avatarUrl: '/projects/mineiro/avatars/barber-4.png', isPresent: true },
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

