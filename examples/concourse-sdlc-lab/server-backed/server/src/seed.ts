import { Store, databasePath } from './database.js';

if (process.env.NODE_ENV === 'production') throw new Error('Demo seeding is disabled in production.');
const store = new Store();
try {
  store.seed();
  console.log(`Seeded ten demo identities in ${databasePath()}`);
} finally { store.close(); }
