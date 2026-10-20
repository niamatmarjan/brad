import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { migrations } from './migrations.js';
import type { User } from './model.js';

export const demoUsers: readonly User[] = [
  { id: 'pm-01', name: 'Priya Morgan', role: 'product-manager' },
  { id: 'ba-01', name: 'Blair Allen', role: 'business-analyst' },
  { id: 'dm-01', name: 'Dana Miller', role: 'delivery-manager' },
  { id: 'arch-01', name: 'Alex Rivera', role: 'solution-architect' },
  { id: 'tl-01', name: 'Taylor Lee', role: 'technical-lead' },
  { id: 'dev-01', name: 'Devon Chen', role: 'developer' },
  { id: 'dev-02', name: 'Sam Patel', role: 'developer' },
  { id: 'dev-03', name: 'Jordan Reed', role: 'developer' },
  { id: 'qa-01', name: 'Quinn Adams', role: 'functional-qa' },
  { id: 'qa-02', name: 'Robin Brooks', role: 'automation-qa' },
];

export function databasePath(env: NodeJS.ProcessEnv = process.env): string {
  if (env.CONCOURSE_DB) return resolve(env.CONCOURSE_DB);
  // Source and compiled modules have different depth; both resolve inside this worktree.
  const packageRoot = fileURLToPath(new URL(import.meta.url.includes('/dist/') ? '../..' : '..', import.meta.url));
  return resolve(env.CONCOURSE_WORKTREE ?? resolve(packageRoot, '..'), 'server', 'data', 'concourse.sqlite');
}

export class Store {
  readonly db: DatabaseSync;
  constructor(path = databasePath()) {
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;');
    this.db.exec('CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, appliedAt TEXT NOT NULL) STRICT;');
    this.transaction(() => {
      const latest = this.get<{ version: number }>('SELECT COALESCE(MAX(version), 0) AS version FROM schema_migrations')!.version;
      if (latest > migrations.length) throw new Error('Database schema is newer than this server.');
      for (const migration of migrations) {
        if (migration.version > latest) {
          this.db.exec(migration.sql);
          this.run('INSERT INTO schema_migrations VALUES (?, ?)', migration.version, new Date().toISOString());
        }
      }
    });
  }
  run(sql: string, ...args: SQLInputValue[]) { return this.db.prepare(sql).run(...args); }
  get<T>(sql: string, ...args: SQLInputValue[]): T | undefined {
    return this.db.prepare(sql).get(...args) as T | undefined;
  }
  all<T>(sql: string, ...args: SQLInputValue[]): T[] {
    return this.db.prepare(sql).all(...args) as T[];
  }
  transaction<T>(fn: () => T): T {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const result = fn();
      this.db.exec('COMMIT');
      return result;
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }
  seed(): void {
    this.transaction(() => {
      for (const user of demoUsers) {
        this.run('INSERT INTO users (id, name, role) VALUES (?, ?, ?) ON CONFLICT(id) DO NOTHING', user.id, user.name, user.role);
      }
    });
  }
  audit(actorId: string, kind: string, entityId: string, details: unknown, projectId: string | null = null, workItemId: string | null = null): void {
    this.run('INSERT INTO activity (id, projectId, workItemId, actorId, kind, entityId, details, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      randomUUID(), projectId, workItemId, actorId, kind, entityId, JSON.stringify(details), new Date().toISOString());
  }
  close(): void { this.db.close(); }
}
