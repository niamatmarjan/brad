import { Store, databasePath } from './database.js';
import { createApp } from './http.js';

const port = Number(process.env.PORT ?? 3001);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be between 1 and 65535.');
const store = new Store();
if (process.env.NODE_ENV !== 'production') store.seed();
const app = createApp(store);
app.listen(port, '127.0.0.1', () => {
  console.log(`Concourse local API: http://127.0.0.1:${port}; SQLite: ${databasePath()}`);
});
app.on('error', error => {
  console.error(error.message);
  store.close();
  process.exitCode = 1;
});
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    app.close(() => store.close());
    app.closeIdleConnections();
  });
}
