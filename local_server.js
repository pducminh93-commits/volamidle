const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const JX_WEB_HOST = 'https://s1volam.esport9.com';
const JX_WEB_LOOK_PATH = path.join(__dirname, 'img', 'look', 'web-jxlook.json');
let jxWebLookRequest = null;
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf'
};

function sendFile(res, filePath, contentType) {
  res.writeHead(200, {
    'Content-Type': contentType,
    'Cache-Control': 'public, max-age=31536000'
  });
  fs.createReadStream(filePath).pipe(res);
}

async function loadJxWebLook() {
  if (fs.existsSync(JX_WEB_LOOK_PATH)) return;
  if (jxWebLookRequest) return jxWebLookRequest;
  jxWebLookRequest = (async () => {
    const response = await fetch(`${JX_WEB_HOST}/jxlook.js?v=20261107-festive`, {
      signal: AbortSignal.timeout(15000)
    });
    if (!response.ok) throw new Error(`Sprite manifest returned HTTP ${response.status}`);
    const source = await response.text();
    const start = source.indexOf('window.JXLOOK=');
    const jsonStart = start < 0 ? -1 : source.indexOf('{', start);
    const jsonEnd = source.lastIndexOf('}');
    if (jsonStart < 0 || jsonEnd < jsonStart) throw new Error('Sprite manifest has an invalid format');
    const data = JSON.parse(source.slice(jsonStart, jsonEnd + 1));
    if (!data.sheets || !data.tabs || !data.assoc || !data.sort) throw new Error('Sprite manifest is incomplete');
    await fs.promises.mkdir(path.dirname(JX_WEB_LOOK_PATH), { recursive: true });
    await fs.promises.writeFile(JX_WEB_LOOK_PATH, JSON.stringify(data), 'utf8');
  })().finally(() => { jxWebLookRequest = null; });
  return jxWebLookRequest;
}

async function serveJxWebLook(res) {
  try {
    await loadJxWebLook();
    sendFile(res, JX_WEB_LOOK_PATH, 'application/json; charset=utf-8');
  } catch (error) {
    console.warn('[JX web sprites] Could not fetch sprite manifest:', error.message);
    res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end('Không tải được dữ liệu sprite từ máy chủ tham chiếu');
  }
}

async function serveJxWebSprite(res, urlPath) {
  const match = /^\/img\/jx\/(f|m)\/([A-Za-z0-9_-]+\.webp)$/.exec(urlPath);
  if (!match) {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Đường dẫn sprite không hợp lệ');
  }
  const filePath = path.join(__dirname, 'img', 'jx', match[1], match[2]);
  if (fs.existsSync(filePath)) return sendFile(res, filePath, 'image/webp');
  try {
    const response = await fetch(`${JX_WEB_HOST}${urlPath}?n1`, {
      signal: AbortSignal.timeout(15000)
    });
    if (!response.ok) throw new Error(`Sprite returned HTTP ${response.status}`);
    const image = Buffer.from(await response.arrayBuffer());
    await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
    await fs.promises.writeFile(filePath, image);
    sendFile(res, filePath, 'image/webp');
  } catch (error) {
    console.warn(`[JX web sprites] Could not fetch ${urlPath}:`, error.message);
    res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end('Không tải được sprite từ máy chủ tham chiếu');
  }
}

const server = http.createServer((req, res) => {
  const urlPath = new URL(req.url, 'http://localhost').pathname;
  if (req.method === 'GET' && urlPath === '/img/look/web-jxlook.json') {
    serveJxWebLook(res);
    return;
  }
  if (req.method === 'GET' && urlPath.startsWith('/img/jx/')) {
    serveJxWebSprite(res, urlPath);
    return;
  }

  let rawPath = decodeURI(req.url.split('?')[0]);
  if (rawPath === '/' || rawPath === '') {
    rawPath = '/play.html';
  }
  rawPath = rawPath.replace(/^\/assets\/img\/pl\//, '/img/pl/');

  const safePath = path.normalize(rawPath).replace(/^(\.\.[\/\\])+/, '');
  const filePath = path.join(__dirname, safePath);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('404 Không tìm thấy file');
    }

    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': 'no-cache'
    });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.on('error', error => {
  if (error.code === 'EADDRINUSE') {
    console.error(`\n[LỖI] Cổng ${PORT} đang bị chiếm.`);
    console.error('  Thường là do cửa sổ Võ Lâm IDLE trước đó chưa đóng.');
    console.error('  Cách xử lý: đóng cửa sổ đó, hoặc chạy Chay_Game.bat và chọn Y để tắt tiến trình giữ cổng.');
    console.error(`  Hoặc tìm PID: netstat -ano | findstr :${PORT}`);
    process.exit(1);
  }
  console.error('[LỖI] Máy chủ không khởi động được:', error.message);
  process.exit(1);
});

server.listen(PORT, () => {
  console.log(`✅ Máy chủ Local đang hoạt động tại: http://localhost:${PORT}`);
});
