import 'dotenv/config';
import app from './app.js';
import { initializeDatabase } from './services/db.service.js';

const port = Number(process.env.PORT || 4000);

async function startServer() {
  await initializeDatabase();

  app.listen(port, () => {
    console.log(`API running on http://localhost:${port}`);
  });
}

startServer().catch((error) => {
  console.error(error);
  process.exit(1);
});
