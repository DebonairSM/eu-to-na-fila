import Fastify from 'fastify';
import { env } from './env.js';

const fastify = Fastify({ logger: true });

fastify.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

fastify.get('/test', async () => {
  return { message: 'Infrastructure working!', port: env.PORT };
});

const start = async () => {
  try {
    await fastify.listen({ port: env.PORT, host: '0.0.0.0' });
    console.log(`✅ Test server running at http://localhost:${env.PORT}`);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
};

start();

