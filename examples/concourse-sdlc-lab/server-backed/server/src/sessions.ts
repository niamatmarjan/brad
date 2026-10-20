import { createHash, randomBytes } from 'node:crypto';
import type { IncomingMessage } from 'node:http';
import { Store } from './database.js';
import { fail } from './errors.js';
import type { User } from './model.js';

const cookieName = 'concourse_session';
const lifetimeSeconds = 8 * 60 * 60;
const hash = (token: string) => createHash('sha256').update(token).digest('hex');
interface Session { tokenHash: string; userId: string; expiresAt: string; revokedAt: string | null }

export class Sessions {
  constructor(private readonly store: Store, private readonly production: boolean) {}
  token(request: IncomingMessage): string | undefined {
    const cookies = (request.headers.cookie ?? '').split(';').map(part => part.trim());
    const matches = cookies.filter(part => part.startsWith(`${cookieName}=`));
    if (matches.length !== 1) return undefined;
    const token = matches[0]!.slice(cookieName.length + 1);
    return /^[a-f0-9]{64}$/.test(token) ? token : undefined;
  }
  user(token: string | undefined): User {
    if (this.production) fail(401, 'UNAUTHENTICATED', 'Development sessions are not accepted in production.');
    if (!token) fail(401, 'UNAUTHENTICATED', 'Sign in to continue.');
    const session = this.store.get<Session>('SELECT * FROM sessions WHERE tokenHash = ?', hash(token));
    if (!session || session.revokedAt || session.expiresAt <= new Date().toISOString()) {
      fail(401, 'UNAUTHENTICATED', 'Your session has expired or was revoked. Sign in again.');
    }
    const user = this.store.get<User>('SELECT * FROM users WHERE id = ?', session.userId);
    if (!user) fail(401, 'UNAUTHENTICATED', 'Sign in to continue.');
    return user;
  }
  login(userId: string, previous: string | undefined): { user: User; cookie: string } {
    if (this.production) fail(404, 'NOT_FOUND', 'Development sign-in is disabled.');
    return this.store.transaction(() => {
      const user = this.store.get<User>('SELECT * FROM users WHERE id = ?', userId);
      if (!user) fail(400, 'INVALID_INPUT', 'Choose an existing demo account.');
      if (previous) this.revoke(previous);
      const token = randomBytes(32).toString('hex');
      const now = new Date();
      this.store.run('INSERT INTO sessions (tokenHash, userId, createdAt, expiresAt) VALUES (?, ?, ?, ?)',
        hash(token), user.id, now.toISOString(), new Date(now.getTime() + lifetimeSeconds * 1000).toISOString());
      // Do not put the bearer token or its hash in the readable activity feed.
      this.store.audit(user.id, 'session.started', user.id, {});
      return { user, cookie: this.cookie(token, lifetimeSeconds) };
    });
  }
  private revoke(token: string): void {
    const session = this.store.get<Session>('SELECT * FROM sessions WHERE tokenHash = ? AND revokedAt IS NULL', hash(token));
    if (session) {
      this.store.run('UPDATE sessions SET revokedAt = ?, version = version + 1 WHERE tokenHash = ?', new Date().toISOString(), hash(token));
      this.store.audit(session.userId, 'session.revoked', session.userId, {});
    }
  }
  logout(token: string | undefined): string {
    this.user(token);
    this.store.transaction(() => this.revoke(token!));
    return this.cookie('', 0);
  }
  private cookie(token: string, maxAge: number): string {
    return `${cookieName}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${this.production ? '; Secure' : ''}`;
  }
}
