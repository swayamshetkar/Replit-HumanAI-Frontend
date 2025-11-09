// server.js - Simple development server with proper CSP headers
import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { extname, join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const CSP = "script-src 'self' 'unsafe-eval' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline'; connect-src 'self' http://localhost:3000 https://swayamshetkar-human-aii.hf.space https://cdn.jsdelivr.net https://huggingface.co; media-src 'self';";

// --- Lightweight in-memory cache for frequently accessed files ---
const cache = new Map();
async function getFileCached(path) {
  if (cache.has(path)) return cache.get(path);
  try {
    const data = await readFile(path);
    cache.set(path, data);
    return data;
  } catch (e) {
    throw e;
  }
}

// Preload root indexes to ensure ultra-fast health check responses
const ROOT_INDEX_PATH = join(__dirname, 'index.html');
const APP_INDEX_PATH = join(__dirname, 'public', 'app', 'index.html');
Promise.all([
  getFileCached(ROOT_INDEX_PATH).catch(() => null),
  getFileCached(APP_INDEX_PATH).catch(() => null)
]).then(() => {
  console.log('⚡ Preloaded index files into memory cache');
});

const server = createServer(async (req, res) => {
  const start = Date.now();
  // Remove query strings; decode URI
  let urlPath = (req.url || '/').split('?')[0];
  urlPath = decodeURIComponent(urlPath);

  // Fast dedicated health endpoint required by Replit & other PaaS
  if (urlPath === '/health' || urlPath === '/_health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', uptime: process.uptime(), ts: Date.now() }));
    return;
  }

  // Root: serve preloaded index immediately (no FS latency)
  if (urlPath === '/') {
    try {
      const idx = cache.get(ROOT_INDEX_PATH) || await getFileCached(ROOT_INDEX_PATH);
      res.writeHead(200, { 'Content-Type': 'text/html', 'Content-Security-Policy': CSP });
      res.end(idx);
      return;
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Root index missing');
      return;
    }
  }

  // Map /app static assets to /public/app/* for resiliency (so /app/assets/* works)
  if (urlPath.startsWith('/app/assets/') || urlPath.startsWith('/app/images/')) {
    const subPath = urlPath.replace(/^\/app\//, ''); // assets/... or images/...
    const fsPath = join(__dirname, 'public', 'app', subPath);
    const ext = extname(fsPath);
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    try {
      const content = await getFileCached(fsPath);
      res.writeHead(200, { 'Content-Type': contentType, 'Content-Security-Policy': CSP });
      res.end(content);
      return;
    } catch (e) {
      if (e.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
        return;
      }
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error');
      return;
    }
  }

  // Pretty routes mapping
  const routeMap = {
    '/about': 'public/app/about.html',
    '/about-us': 'public/app/about.html',
    '/app/about': 'public/app/about.html'
  };

  let filePath = routeMap[urlPath] ? routeMap[urlPath] : urlPath;
  const safePath = filePath.startsWith('/') ? filePath.slice(1) : filePath;
  const fsPath = join(__dirname, safePath);
  const ext = extname(fsPath);
  const contentType = mimeTypes[ext] || 'application/octet-stream';

  try {
    const content = await getFileCached(fsPath);
    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Security-Policy': CSP,
    });
    res.end(content);
  } catch (error) {
    if (error.code === 'ENOENT') {
      // SPA fallbacks
      try {
        if (urlPath.startsWith('/app')) {
          const appIndex = cache.get(APP_INDEX_PATH) || await getFileCached(APP_INDEX_PATH);
          res.writeHead(200, { 'Content-Type': 'text/html', 'Content-Security-Policy': CSP });
          res.end(appIndex);
          return;
        }
        const mainIndex = cache.get(ROOT_INDEX_PATH) || await getFileCached(ROOT_INDEX_PATH);
        res.writeHead(200, { 'Content-Type': 'text/html', 'Content-Security-Policy': CSP });
        res.end(mainIndex);
        return;
      } catch (e) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
        return;
      }
    }
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('500 Internal Server Error');
  } finally {
    const duration = Date.now() - start;
    // Minimal logging to avoid noisy health check spam
    if (duration > 250) {
      console.log(`${req.method} ${urlPath} - ${duration}ms`);
    }
  }
});

const PORT = process.env.PORT ? Number(process.env.PORT) : 8080;
const HOST = process.env.HOST || '0.0.0.0';
server.on('error', (err) => {
  console.error('Server error:', err);
});
server.listen(PORT, HOST, () => {
  console.log(`✅ Server running at http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}/`);
  console.log('🩺 Health endpoint: GET /health -> 200');
  console.log('📝 CSP configured to allow unsafe-eval for ML libraries');
});
