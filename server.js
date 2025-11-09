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

const server = createServer(async (req, res) => {
  console.log(`${req.method} ${req.url}`);

  // Remove query strings
  let urlPath = (req.url || '/').split('?')[0];
  urlPath = decodeURIComponent(urlPath);

  // Default to main index for root
  let filePath = urlPath === '/' ? '/index.html' : urlPath;

  // Pretty routes mapping
  const routeMap = {
    '/about': 'public/app/about.html',
    '/about-us': 'public/app/about.html',
    '/app/about': 'public/app/about.html'
  };
  if (routeMap[urlPath]) {
    filePath = routeMap[urlPath];
  }
  const safePath = filePath.startsWith('/') ? filePath.slice(1) : filePath;
  const fsPath = join(__dirname, safePath);

  const ext = extname(fsPath);
  const contentType = mimeTypes[ext] || 'application/octet-stream';

  try {
    const content = await readFile(fsPath);
    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Security-Policy': CSP,
    });
    res.end(content);
    return;
  } catch (error) {
    if (error.code === 'ENOENT') {
      // Route-specific SPA fallbacks
      try {
        if (urlPath.startsWith('/app')) {
          const appIndex = await readFile(join(__dirname, 'public', 'app', 'index.html'));
          res.writeHead(200, { 'Content-Type': 'text/html', 'Content-Security-Policy': CSP });
          res.end(appIndex);
          return;
        }

        // Default: serve main index.html
        const indexContent = await readFile(join(__dirname, 'index.html'));
        res.writeHead(200, { 'Content-Type': 'text/html', 'Content-Security-Policy': CSP });
        res.end(indexContent);
        return;
      } catch (e) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
        return;
      }
    }

    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('500 Internal Server Error');
  }
});

const PORT = process.env.PORT ? Number(process.env.PORT) : 8080;
server.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}/`);
  console.log(`📝 CSP configured to allow unsafe-eval for ML libraries`);
});
