import Fastify from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';
import { registerCors } from '../cors.js';

describe('CORS origin policy', () => {
  const apps: ReturnType<typeof Fastify>[] = [];

  afterEach(async () => {
    await Promise.all(apps.splice(0).map((app) => app.close()));
  });

  it('allows an explicitly known deployment origin', async () => {
    const app = Fastify();
    apps.push(app);
    registerCors(app, 'https://configured.example');
    app.get('/test', async () => ({ ok: true }));

    const response = await app.inject({
      method: 'GET',
      url: '/test',
      headers: { origin: 'https://eu-to-na-fila.onrender.com' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['access-control-allow-origin']).toBe(
      'https://eu-to-na-fila.onrender.com'
    );
    expect(response.headers['access-control-allow-credentials']).toBe('true');
  });

  it.each([
    'https://eu-to-na-fila.onrender.com.attacker.example',
    'https://eutonafila.attacker.example',
  ])('rejects the lookalike origin %s', async (origin) => {
    const app = Fastify();
    apps.push(app);
    registerCors(app, 'https://configured.example');
    app.get('/test', async () => ({ ok: true }));

    const response = await app.inject({
      method: 'GET',
      url: '/test',
      headers: { origin },
    });

    expect(response.statusCode).toBe(500);
    expect(response.headers['access-control-allow-origin']).toBeUndefined();
    expect(response.headers['access-control-allow-credentials']).toBeUndefined();
  });

  it('allows exact origins from a comma-separated CORS_ORIGIN value', async () => {
    const app = Fastify();
    apps.push(app);
    registerCors(
      app,
      'https://first-configured.example, https://second-configured.example'
    );
    app.get('/test', async () => ({ ok: true }));

    const response = await app.inject({
      method: 'GET',
      url: '/test',
      headers: { origin: 'https://second-configured.example' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['access-control-allow-origin']).toBe(
      'https://second-configured.example'
    );
  });

  it('allows requests without an Origin header', async () => {
    const app = Fastify();
    apps.push(app);
    registerCors(app, 'https://configured.example');
    app.get('/test', async () => ({ ok: true }));

    const response = await app.inject({ method: 'GET', url: '/test' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true });
    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });
});
