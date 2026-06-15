const { app, BrowserWindow, shell } = require('electron');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

let server;

function getWebRoot() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'web');
  }

  return path.join(__dirname, '..', '..', 'mobile', 'dist-web');
}

function resolveRequestedFile(webRoot, requestUrl) {
  const pathname = decodeURIComponent(new URL(requestUrl, 'http://localhost').pathname);
  const relativePath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const requestedPath = path.resolve(webRoot, relativePath);

  if (!requestedPath.startsWith(`${path.resolve(webRoot)}${path.sep}`)) {
    return null;
  }

  return requestedPath;
}

function sendFile(response, filePath, method) {
  const contentType = MIME_TYPES[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream';
  response.writeHead(200, {
    'Cache-Control': 'no-cache',
    'Content-Type': contentType,
    'X-Content-Type-Options': 'nosniff',
  });

  if (method === 'HEAD') {
    response.end();
    return;
  }

  fs.createReadStream(filePath).pipe(response);
}

function startWebServer() {
  const webRoot = getWebRoot();

  return new Promise((resolve, reject) => {
    server = http.createServer((request, response) => {
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        response.writeHead(405);
        response.end();
        return;
      }

      const requestedFile = resolveRequestedFile(webRoot, request.url ?? '/');
      if (!requestedFile) {
        response.writeHead(403);
        response.end();
        return;
      }

      fs.stat(requestedFile, (error, stats) => {
        if (!error && stats.isFile()) {
          sendFile(response, requestedFile, request.method);
          return;
        }

        const indexFile = path.join(webRoot, 'index.html');
        fs.stat(indexFile, (indexError) => {
          if (indexError) {
            response.writeHead(404);
            response.end('Application files were not found.');
            return;
          }

          sendFile(response, indexFile, request.method);
        });
      });
    });

    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        reject(new Error('Unable to start the desktop web server.'));
        return;
      }

      resolve(`http://127.0.0.1:${address.port}`);
    });
  });
}

function createWindow(applicationUrl) {
  const window = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 960,
    minHeight: 640,
    show: false,
    backgroundColor: '#f6fbff',
    title: 'SugarPrecision',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  window.once('ready-to-show', () => window.show());
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      void shell.openExternal(url);
    }

    return { action: 'deny' };
  });

  void window.loadURL(applicationUrl);
}

const hasSingleInstanceLock = app.requestSingleInstanceLock();

if (!hasSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const window = BrowserWindow.getAllWindows()[0];
    if (window) {
      if (window.isMinimized()) {
        window.restore();
      }
      window.focus();
    }
  });

  app.whenReady().then(async () => {
    const applicationUrl = await startWebServer();
    createWindow(applicationUrl);

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow(applicationUrl);
      }
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('before-quit', () => {
    server?.close();
  });
}
