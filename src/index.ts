import { app } from './app';
import { connectDatabase } from './config/database';
import { initFirebaseAdmin } from './config/firebase';
import { env } from './config/env';

const basePath = env.API_BASE_PATH;

async function start(): Promise<void> {
  initFirebaseAdmin();
  await connectDatabase();
  app.listen(env.PORT, () => {
    console.log(`Arena backend listening on port ${env.PORT}, base path ${basePath}`);
  });
}

if (require.main === module) {
  start().catch((err) => {
    console.error('Failed to start:', err);
    process.exit(1);
  });
}
