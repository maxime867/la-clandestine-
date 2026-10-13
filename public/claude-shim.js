/* Adaptateur : réimplémente claude.use('room') et claude.use('db') au-dessus de server.js.
   Le jeu a été écrit pour claude.ai ; ici, plus besoin de compte : tout passe par ce serveur. */
(function () {
  'use strict';
  if (window.claude && typeof window.claude.use === 'function') return; // déjà sur claude.ai : on ne touche à rien
  const offline = location.protocol === 'file:';

  /* ---------- room ---------- */
  const err = code => { const e = new Error(code); e.code = code; return e; };
  let ws = null, me = null, open = false, backoff = 500;
  const rooms = new Map();          // nom -> état du salon
  const lobbyConn = new Set();      // écouteurs de connexion globaux

  function wsUrl() { return (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws'; }
  function send(o) { if (ws && ws.readyState === 1) { ws.send(JSON.stringify(o)); return true; } return false; }
  function fire(set, v) { for (const f of Array.from(set)) { try { f(v); } catch (e) { setTimeout(() => { throw e; }); } } }

  function peerList(r) {
    const out = [];
    if (me) out.push({ peer: me, presence: r.myPres, kind: 'viewer', sameTab: true, isMe: true });
    for (const [id, p] of r.peers) out.push({ peer: id, presence: p, kind: 'viewer', sameTab: false, isMe: false });
    return out;
  }
  function firePeers(r) { const peers = peerList(r); fire(r.peerL, { peers }); }
  function setConn(r, c) { if (r.connected === c) return; r.connected = c; fire(r.connL, c); }

  function connect() {
    if (offline) return;
    try { ws = new WebSocket(wsUrl()); } catch (e) { retry(); return; }
    ws.onmessage = e => { let m; try { m = JSON.parse(e.data); } catch (x) { return; } handle(m); };
    ws.onclose = () => {
      open = false; me = null; ws = null;
      fire(lobbyConn, false);
      for (const r of rooms.values()) { r.peers.clear(); setConn(r, false); }
      retry();
    };
    ws.onerror = () => {};
  }
  function retry() { setTimeout(connect, backoff); backoff = Math.min(backoff * 2, 8000); }

  function handle(m) {
    if (m.t === 'hello') {
      me = m.peer; open = true; backoff = 500;
      fire(lobbyConn, true);
      for (const r of rooms.values()) send({ t: 'join', room: r.name });
      return;
    }
    const r = rooms.get(m.room); if (!r) return;
    switch (m.t) {
      case 'joined':
        r.peers.clear();
        for (const p of m.peers || []) r.peers.set(p.peer, p.presence || {});
        if (Object.keys(r.myPres).length) send({ t: 'presence', room: r.name, p: r.myPres });
        setConn(r, true);
        if (r.pending) { r.pending.ok(r.api); r.pending = null; }
        firePeers(r);
        break;
      case 'join_err':
        if (r.pending) { r.pending.ko(err(m.code || 'upstream_error')); r.pending = null; }
        rooms.delete(r.name);
        break;
      case 'pres': r.peers.set(m.peer, m.p || {}); firePeers(r); break;
      case 'left': if (r.peers.delete(m.peer)) firePeers(r); break;
      case 'ev': {
        const set = r.topics.get(m.topic); if (!set) break;
        const msg = { topic: m.topic, data: m.data, peer: m.peer, sameTab: m.peer === me, isMe: m.peer === me, at: Date.now() };
        fire(set, msg);
        break;
      }
    }
  }

  function makeRoom(name) {
    const r = { name, peers: new Map(), myPres: {}, connected: false, connL: new Set(), peerL: new Set(), topics: new Map(), pending: null, left: false };
    r.api = Object.freeze({
      name,
      connected: () => r.connected,
      onConnection(fn) { r.connL.add(fn); return () => r.connL.delete(fn); },
      onPeers(fn) { r.peerL.add(fn); if (r.connected) setTimeout(() => fn({ peers: peerList(r) })); return () => r.peerL.delete(fn); },
      peers: () => peerList(r),
      on(topic, fn) { if (!r.topics.has(topic)) r.topics.set(topic, new Set()); r.topics.get(topic).add(fn); return () => r.topics.get(topic).delete(fn); },
      emit(topic, data) {
        if (r.left) return Promise.reject(err('invalid_argument'));
        const s = JSON.stringify(data === undefined ? null : data);
        if (s.length > 4096) return Promise.reject(err('invalid_argument'));
        return send({ t: 'emit', room: name, topic, data: data === undefined ? null : data }) ? Promise.resolve() : Promise.reject(err('upstream_error'));
      },
      presence(patch) {
        if (r.left) return Promise.reject(err('invalid_argument'));
        if (!patch || typeof patch !== 'object') return Promise.reject(err('invalid_argument'));
        const next = Object.assign({}, r.myPres);
        for (const k in patch) { if (patch[k] === null) delete next[k]; else next[k] = patch[k]; }
        if (JSON.stringify(next).length > 4096) return Promise.reject(err('invalid_argument'));
        r.myPres = next;
        send({ t: 'presence', room: name, p: next });
        return Promise.resolve();
      },
      leave() {
        if (!r.left) { r.left = true; send({ t: 'leave', room: name }); rooms.delete(name); r.connL.clear(); r.peerL.clear(); r.topics.clear(); }
        return Promise.resolve();
      },
    });
    return r;
  }

  const room = Object.freeze({
    connected: () => open,
    onConnection(fn) { lobbyConn.add(fn); return () => lobbyConn.delete(fn); },
    join(name) {
      if (typeof name !== 'string' || !/^[a-z0-9][a-z0-9_.-]{0,47}$/.test(name)) return Promise.reject(err('invalid_argument'));
      const ex = rooms.get(name);
      if (ex && ex.connected) return Promise.resolve(ex.api);
      if (ex && ex.pending) return ex.pending.p;
      const r = ex || makeRoom(name); rooms.set(name, r);
      let ok, ko; const p = new Promise((a, b) => { ok = a; ko = b; });
      r.pending = { ok, ko, p };
      setTimeout(() => { if (r.pending && r.pending.p === p) { r.pending = null; rooms.delete(name); ko(err('upstream_error')); } }, 10000);
      send({ t: 'join', room: name }); // sinon envoyé à la connexion (hello)
      return p;
    },
  });

  /* ---------- db : sauvegardes par code ---------- */
  const db = Object.freeze({
    doc(path) {
      const url = '/api/doc?path=' + encodeURIComponent(path);
      return Object.freeze({
        async get() {
          let res;
          try { res = await fetch(url, { cache: 'no-store' }); } catch (e) { throw err('upstream_error'); }
          if (res.status === 404) return { exists: false, data: () => undefined };
          if (!res.ok) throw err(res.status === 400 ? 'invalid_argument' : 'upstream_error');
          const j = await res.json();
          return { exists: true, data: () => j };
        },
        async set(data) {
          let res;
          try { res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); } catch (e) { throw err('upstream_error'); }
          if (!res.ok) throw err(res.status === 413 || res.status === 507 ? 'quota_exceeded' : res.status === 400 ? 'invalid_argument' : 'upstream_error');
        },
      });
    },
  });

  if (!offline) connect();
  window.claude = Object.freeze({
    use(name) {
      if (offline) return Promise.resolve(null);
      if (name === 'room') return Promise.resolve(room);
      if (name === 'db') return Promise.resolve(db);
      return Promise.resolve(null);
    },
  });
})();
