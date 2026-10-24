import { Readable } from 'node:stream';
import { EventEmitter } from 'node:events';

export function makeRequest(app, { method = 'GET', url = '/', headers = {}, body = null }) {
  return new Promise((resolve, reject) => {
    let payload = '';
    if (body !== null && body !== undefined) {
      payload = typeof body === 'string' ? body : JSON.stringify(body);
    }

    const req = Readable.from(payload ? [Buffer.from(payload)] : []);
    req.method = method;
    req.url = url;
    req.headers = Object.fromEntries(
      Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v])
    );

    const res = new EventEmitter();
    res.statusCode = 200;
    res._headers = {};
    res.body = '';

    res.writeHead = (status, headers = {}) => {
      res.statusCode = status;
      for (const [k, v] of Object.entries(headers)) {
        res._headers[k.toLowerCase()] = v;
      }
      return res;
    };

    res.setHeader = (k, v) => {
      res._headers[k.toLowerCase()] = v;
    };

    res.getHeader = (k) => res._headers[k.toLowerCase()];

    res.end = (chunk) => {
      if (chunk) res.body += chunk;
      res.emit('finish');
      try {
        const isJson = res._headers['content-type']?.includes('application/json');
        const json = isJson ? JSON.parse(res.body || '{}') : null;
        resolve({
          status: res.statusCode,
          headers: res._headers,
          body: res.body,
          json
        });
      } catch {
        resolve({
          status: res.statusCode,
          headers: res._headers,
          body: res.body,
          json: null
        });
      }
    };

    app.handleRequest(req, res).catch(reject);
  });
}
