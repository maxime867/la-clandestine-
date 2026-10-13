// La Serre Clandestine : serveur sans dépendance (Node.js 18+).
// - sert les fichiers de public/
// - multijoueur par WebSocket sur /ws (implémentation maison de la RFC 6455)
// - sauvegardes en ligne : GET/POST /api/doc?path=saves/XXXX-XXXX, stockées dans DATA_DIR/saves.json
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = +process.env.PORT || 3000;
const PUBLIC = path.join(__dirname, 'public');
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(__dirname, 'data'));
const SAVES_FILE = path.join(DATA_DIR, 'saves.json');

const ROOM_RE = /^[a-z0-9][a-z0-9_.-]{0,47}$/;
const TOPIC_RE = /^[a-z0-9_.-]{1,32}$/;
const SAVE_RE = /^saves\/[A-Z0-9]{4}-[A-Z0-9]{4}$/;
const MAX_MSG = 4096;          // présence et événements : 4 Ko max
const MAX_FRAME = 16384;       // trame WebSocket entrante max
const MAX_RATE = 60;           // messages par seconde et par connexion
const MAX_ROOMS_PER_CONN = 16;
const MAX_SAVE = 200 * 1024;   // une sauvegarde : 200 Ko max
const MAX_SAVES = 20000;

/* ---------- sauvegardes ---------- */
let saves = {};
try { saves = JSON.parse(fs.readFileSync(SAVES_FILE, 'utf8')) || {}; } catch (e) { saves = {}; }
let saveTimer = null;
function persist() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      const tmp = SAVES_FILE + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify(saves));
      fs.renameSync(tmp, SAVES_FILE);
    } catch (e) { console.error('Écriture des sauvegardes impossible :', e.message); }
  }, 1000);
}

/* ---------- fichiers statiques ---------- */
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.webp': 'image/webp', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.woff2': 'font/woff2',
};
function serveStatic(req, res, pathname) {
  let rel;
  try { rel = decodeURIComponent(pathname); } catch (e) { return send(res, 400, 'Requête invalide'); }
  if (rel.endsWith('/')) rel += 'index.html';
  const file = path.normalize(path.join(PUBLIC, rel));
  if (!file.startsWith(PUBLIC + path.sep)) return send(res, 403, 'Interdit');
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) return send(res, 404, 'Introuvable');
    res.writeHead(200, {
      'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Content-Length': st.size,
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
    });
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(file).pipe(res);
  });
}
function send(res, code, body, type) {
  res.writeHead(code, { 'Content-Type': type || 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(body);
}

/* ---------- API des sauvegardes ---------- */
function api(req, res, url) {
  const p = url.searchParams.get('path') || '';
  if (!SAVE_RE.test(p)) return send(res, 400, JSON.stringify({ code: 'invalid_argument' }), 'application/json');
  if (req.method === 'GET') {
    if (!Object.prototype.hasOwnProperty.call(saves, p)) return send(res, 404, JSON.stringify({ code: 'not_found' }), 'application/json');
    return send(res, 200, JSON.stringify(saves[p]), 'application/json');
  }
  if (req.method === 'POST') {
    let size = 0, chunks = [], aborted = false;
    req.on('data', c => {
      size += c.length;
      if (size > MAX_SAVE) { aborted = true; send(res, 413, JSON.stringify({ code: 'quota_exceeded' }), 'application/json'); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      if (aborted) return;
      let data;
      try { data = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch (e) { return send(res, 400, JSON.stringify({ code: 'invalid_argument' }), 'application/json'); }
      if (!data || typeof data !== 'object' || Array.isArray(data)) return send(res, 400, JSON.stringify({ code: 'invalid_argument' }), 'application/json');
      if (!Object.prototype.hasOwnProperty.call(saves, p) && Object.keys(saves).length >= MAX_SAVES) return send(res, 507, JSON.stringify({ code: 'quota_exceeded' }), 'application/json');
      saves[p] = data; persist();
      send(res, 200, JSON.stringify({ ok: true }), 'application/json');
    });
    return;
  }
  send(res, 405, JSON.stringify({ code: 'invalid_argument' }), 'application/json');
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/api/doc') return api(req, res, url);
  if (url.pathname === '/healthz') return send(res, 200, 'ok');
  if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Méthode non autorisée');
  serveStatic(req, res, url.pathname);
});

/* ---------- WebSocket (RFC 6455) ---------- */
const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const rooms = new Map(); // nom -> Map(peerId -> conn)
const conns = new Set();
let nextPeer = 1;

server.on('upgrade', (req, socket) => {
  const url = new URL(req.url, 'http://x');
  const key = req.headers['sec-websocket-key'];
  if (url.pathname !== '/ws' || !key || String(req.headers.upgrade).toLowerCase() !== 'websocket') {
    socket.end('HTTP/1.1 400 Bad Request\r\n\r\n'); return;
  }
  const accept = crypto.createHash('sha1').update(key + GUID).digest('base64');
  socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + accept + '\r\n\r\n');
  socket.setNoDelay(true);
  const conn = { id: 'p' + (nextPeer++).toString(36) + crypto.randomBytes(3).toString('hex'), socket, buf: Buffer.alloc(0), frag: null, rooms: new Map(), rate: 0, rateT: Date.now(), alive: true, closed: false };
  conns.add(conn);
  socket.on('data', d => onData(conn, d));
  socket.on('close', () => drop(conn));
  socket.on('error', () => drop(conn));
  sendJSON(conn, { t: 'hello', peer: conn.id });
});

function frame(op, payload) {
  const len = payload.length;
  let head;
  if (len < 126) { head = Buffer.alloc(2); head[1] = len; }
  else if (len < 65536) { head = Buffer.alloc(4); head[1] = 126; head.writeUInt16BE(len, 2); }
  else { head = Buffer.alloc(10); head[1] = 127; head.writeBigUInt64BE(BigInt(len), 2); }
  head[0] = 0x80 | op;
  return Buffer.concat([head, payload]);
}
function sendJSON(conn, obj) {
  if (conn.closed) return;
  try { conn.socket.write(frame(1, Buffer.from(JSON.stringify(obj)))); } catch (e) { drop(conn); }
}
function closeConn(conn, code) {
  if (conn.closed) return;
  const p = Buffer.alloc(2); p.writeUInt16BE(code || 1000, 0);
  try { conn.socket.write(frame(8, p)); conn.socket.end(); } catch (e) {}
  drop(conn);
}
function onData(conn, d) {
  conn.buf = Buffer.concat([conn.buf, d]);
  while (conn.buf.length >= 2) {
    const b0 = conn.buf[0], b1 = conn.buf[1];
    const fin = (b0 & 0x80) !== 0, op = b0 & 0x0f, masked = (b1 & 0x80) !== 0;
    let len = b1 & 0x7f, off = 2;
    if (!masked) return closeConn(conn, 1002); // les clients doivent masquer
    if (len === 126) { if (conn.buf.length < 4) return; len = conn.buf.readUInt16BE(2); off = 4; }
    else if (len === 127) { if (conn.buf.length < 10) return; const big = conn.buf.readBigUInt64BE(2); if (big > BigInt(MAX_FRAME)) return closeConn(conn, 1009); len = Number(big); off = 10; }
    if (len > MAX_FRAME) return closeConn(conn, 1009);
    if (conn.buf.length < off + 4 + len) return;
    const mask = conn.buf.subarray(off, off + 4);
    const payload = Buffer.from(conn.buf.subarray(off + 4, off + 4 + len));
    for (let i = 0; i < payload.length; i++) payload[i] ^= mask[i & 3];
    conn.buf = conn.buf.subarray(off + 4 + len);
    if (op === 8) return closeConn(conn, 1000);
    if (op === 9) { try { conn.socket.write(frame(10, payload)); } catch (e) {} continue; }
    if (op === 10) { conn.alive = true; continue; }
    if (op === 1 || op === 2) {
      if (fin) onText(conn, payload); else conn.frag = [payload];
    } else if (op === 0 && conn.frag) {
      conn.frag.push(payload);
      const total = conn.frag.reduce((a, b) => a + b.length, 0);
      if (total > MAX_FRAME) return closeConn(conn, 1009);
      if (fin) { const all = Buffer.concat(conn.frag); conn.frag = null; onText(conn, all); }
    }
  }
}

function peersOf(name) { return rooms.get(name) || new Map(); }
function broadcast(name, obj, except) {
  for (const [, c] of peersOf(name)) if (c !== except) sendJSON(c, obj);
}
function leaveRoom(conn, name) {
  if (!conn.rooms.has(name)) return;
  conn.rooms.delete(name);
  const m = rooms.get(name);
  if (m) { m.delete(conn.id); if (!m.size) rooms.delete(name); }
  broadcast(name, { t: 'left', room: name, peer: conn.id });
}
function drop(conn) {
  if (conn.closed) return;
  conn.closed = true;
  conns.delete(conn);
  for (const name of Array.from(conn.rooms.keys())) leaveRoom(conn, name);
  try { conn.socket.destroy(); } catch (e) {}
}

function onText(conn, buf) {
  const now = Date.now();
  if (now - conn.rateT >= 1000) { conn.rateT = now; conn.rate = 0; }
  if (++conn.rate > MAX_RATE) return; // au-delà, on ignore
  let m;
  try { m = JSON.parse(buf.toString('utf8')); } catch (e) { return; }
  if (!m || typeof m !== 'object') return;
  const name = typeof m.room === 'string' ? m.room : '';
  if (!ROOM_RE.test(name)) { if (m.t === 'join') sendJSON(conn, { t: 'join_err', room: name, code: 'invalid_argument' }); return; }
  switch (m.t) {
    case 'join': {
      if (conn.rooms.has(name)) { sendJSON(conn, { t: 'joined', room: name, peers: listPeers(name, conn) }); return; }
      if (conn.rooms.size >= MAX_ROOMS_PER_CONN) { sendJSON(conn, { t: 'join_err', room: name, code: 'limit_reached' }); return; }
      if (!rooms.has(name)) rooms.set(name, new Map());
      rooms.get(name).set(conn.id, conn);
      conn.rooms.set(name, {});
      sendJSON(conn, { t: 'joined', room: name, peers: listPeers(name, conn) });
      broadcast(name, { t: 'pres', room: name, peer: conn.id, p: {} }, conn);
      return;
    }
    case 'leave': leaveRoom(conn, name); return;
    case 'presence': {
      if (!conn.rooms.has(name)) return;
      const p = m.p;
      if (!p || typeof p !== 'object' || Array.isArray(p)) return;
      if (JSON.stringify(p).length > MAX_MSG) return;
      conn.rooms.set(name, p);
      broadcast(name, { t: 'pres', room: name, peer: conn.id, p }, conn);
      return;
    }
    case 'emit': {
      if (!conn.rooms.has(name)) return;
      if (typeof m.topic !== 'string' || !TOPIC_RE.test(m.topic)) return;
      const data = m.data === undefined ? null : m.data;
      if (JSON.stringify(data).length > MAX_MSG) return;
      broadcast(name, { t: 'ev', room: name, topic: m.topic, data, peer: conn.id }); // l'émetteur reçoit aussi son message
      return;
    }
  }
}
function listPeers(name, self) {
  const out = [];
  for (const [id, c] of peersOf(name)) if (c !== self) out.push({ peer: id, presence: c.rooms.get(name) || {} });
  return out;
}

// garde la connexion ouverte derrière les hébergeurs (Render coupe les connexions muettes)
setInterval(() => {
  for (const c of Array.from(conns)) {
    if (!c.alive) { drop(c); continue; }
    c.alive = false;
    try { c.socket.write(frame(9, Buffer.alloc(0))); } catch (e) { drop(c); }
  }
}, 25000);

server.listen(PORT, () => {
  console.log('La Serre Clandestine : http://localhost:' + PORT);
});
