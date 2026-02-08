import Fastify from 'fastify';
import { syndicateRoutes } from './routes/syndicate';
import 'dotenv/config';

const app = Fastify({ logger: true });

app.register(syndicateRoutes, { prefix: '/api/syndicate' });

const start = async () => {
  const port = Number(process.env.PORT) || 3000;
  await app.listen({ port, host: '0.0.0.0' });
  app.log.info(`Agent Syndicate running on port ${port}`);
};

start().catch((err) => {
  app.log.error(err);
  process.exit(1);
});

export default app;
