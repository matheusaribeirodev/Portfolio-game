/* ==========================================================================
   game.js — Motor do jogo: loop, câmera, renderização, luz e partículas
   Renderiza em um buffer de baixa resolução e amplia em escala inteira,
   mantendo os pixels nítidos em qualquer tela.
   ========================================================================== */

(function () {
  "use strict";

  const T = 16;
  const VISITOR = { id: "visitor", hair: "#d9a441", hairLight: "#f0c46a", skin: "#e8b894", skinShade: "#c99472", hoodie: "#6d3a4f", hoodieLight: "#8a4c66", accent: "#ffd166", pants: "#2c3044", shoes: "#3a2620" };

  const gradCache = new Map();
  function grad(color, r) {
    const key = color + "|" + r;
    if (gradCache.has(key)) return gradCache.get(key);
    const c = Sprites.canvas(r * 2, r * 2); const g = c.getContext("2d");
    const gr = g.createRadialGradient(r, r, 0, r, r, r);
    const col = color.startsWith("#") ? hexToRgba(color, 1) : color;
    gr.addColorStop(0, col); gr.addColorStop(0.45, col.replace(/,\s*[\d.]+\)$/, ",0.45)")); gr.addColorStop(1, col.replace(/,\s*[\d.]+\)$/, ",0)"));
    g.fillStyle = gr; g.fillRect(0, 0, r * 2, r * 2);
    gradCache.set(key, c); return c;
  }
  function hexToRgba(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; }

  const Game = {
    canvas: null, ctx: null, buf: null, bctx: null, light: null, lctx: null, vignette: null,
    zoom: 3, bw: 320, bh: 180, dpr: 1,
    cam: { x: 0, y: 0 },
    world: null, player: null,
    running: false, paused: true, last: 0, t: 0,
    particles: [], fireflies: [],
    target: null, currentZone: undefined, ambient: 0.36,
    saveTimer: 0,
    onZoneEnter: null, onTargetChange: null,

    init(canvasEl, data) {
      this.canvas = canvasEl; this.ctx = canvasEl.getContext("2d");
      this.buf = Sprites.canvas(10, 10); this.bctx = this.buf.getContext("2d");
      this.light = Sprites.canvas(10, 10); this.lctx = this.light.getContext("2d");
      this.world = WorldMap.build(data);
      this.player = new Player(this.world, data.profile.avatar);
      this.player.onStep = (p) => {
        GameAudio.play("step");
        if (!this.reduced()) for (let i = 0; i < 2; i++) this.particles.push({ x: p.x + (Math.random() * 6 - 3), y: p.y - 1, vx: Math.random() * 10 - 5, vy: -8 - Math.random() * 8, life: 0.4, max: 0.4, c: "rgba(220,210,190,", s: 1 });
      };
      State.progressIds = this.world.objects.filter((o) => o.interactive && (o.zone || o.id === "byte")).map((o) => o.id);
      State.progressTotal = State.progressIds.length;
      const s = State.data.player;
      if (s && !this.world.rectHitsSolid(s.x - 5, s.y - 6, 10, 6)) this.player.place(s.x, s.y, s.dir);
      for (let i = 0; i < 28; i++) this.fireflies.push(this.newFirefly(true));
      window.addEventListener("resize", () => this.resize());
      this.resize();
      this.snapCamera();
    },
    reduced() { return State.data.settings.reduceMotion; },

    resize() {
      const vw = window.innerWidth, vh = window.innerHeight;
      this.dpr = Math.min(window.devicePixelRatio || 1, 3);
      this.zoom = Math.max(2, Math.floor(Math.min(vw / 400, vh / 235)));
      if (vw < 700 && vh > vw) this.zoom = Math.max(2, Math.floor(vw / 190));
      this.bw = Math.ceil(vw / this.zoom); this.bh = Math.ceil(vh / this.zoom);
      this.canvas.width = Math.round(vw * this.dpr); this.canvas.height = Math.round(vh * this.dpr);
      this.buf.width = this.bw; this.buf.height = this.bh;
      this.light.width = this.bw; this.light.height = this.bh;
      this.vignette = Sprites.canvas(this.bw, this.bh);
      const v = this.vignette.getContext("2d");
      const g = v.createRadialGradient(this.bw / 2, this.bh / 2, Math.min(this.bw, this.bh) * 0.35, this.bw / 2, this.bh / 2, Math.max(this.bw, this.bh) * 0.75);
      g.addColorStop(0, "rgba(8,6,20,0)"); g.addColorStop(1, "rgba(8,6,20,0.55)");
      v.fillStyle = g; v.fillRect(0, 0, this.bw, this.bh);
      this.render();
    },

    start() {
      if (this.running) return;
      this.running = true; this.last = performance.now();
      const loop = (ts) => {
        if (!this.running) return;
        const dt = Math.min(0.05, (ts - this.last) / 1000); this.last = ts;
        if (!document.hidden) { this.update(dt); this.render(); }
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    },
    stop() { this.running = false; },

    snapCamera() {
      const t = this.cameraTarget(); this.cam.x = t.x; this.cam.y = t.y;
    },
    cameraTarget() {
      const W = this.world.W * T, H = this.world.H * T;
      let x = this.player.x - this.bw / 2, y = this.player.y - 12 - this.bh / 2;
      x = this.bw >= W ? (W - this.bw) / 2 : Math.max(0, Math.min(W - this.bw, x));
      y = this.bh >= H ? (H - this.bh) / 2 : Math.max(0, Math.min(H - this.bh, y));
      return { x, y };
    },

    teleport(x, y, dir) {
      this.player.place(x, y, dir); this.snapCamera(); this.checkZone(true); this.savePos();
    },
    savePos() { State.data.player = { x: Math.round(this.player.x), y: Math.round(this.player.y), dir: this.player.dir }; State.save(); },

    /* ------------------------------------------------------------ update */
    update(dt) {
      this.t += dt;
      if (!this.paused) {
        const v = Input.vector();
        this.player.update(dt, v);
        if (v.x || v.y) { this.saveTimer += dt; if (this.saveTimer > 2) { this.saveTimer = 0; this.savePos(); } }
        this.checkZone(false);
        this.findTarget();
      }
      const ct = this.cameraTarget();
      const k = this.reduced() ? 1 : 1 - Math.exp(-dt * 7);
      this.cam.x += (ct.x - this.cam.x) * k; this.cam.y += (ct.y - this.cam.y) * k;

      const inside = this.currentZone ? 0.24 : 0.36;
      this.ambient += (inside - this.ambient) * Math.min(1, dt * 3);

      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i]; p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (p.g || 0) * dt;
        if (p.life <= 0) this.particles.splice(i, 1);
      }
      if (!this.reduced()) this.fireflies.forEach((f, i) => {
        f.t += dt; f.x += Math.cos(f.t * f.s + f.p) * 8 * dt; f.y += Math.sin(f.t * f.s * 1.3 + f.p) * 6 * dt;
        if (f.x < this.cam.x - 40 || f.x > this.cam.x + this.bw + 40 || f.y < this.cam.y - 40 || f.y > this.cam.y + this.bh + 40) this.fireflies[i] = this.newFirefly(false);
      });
    },
    newFirefly(any) {
      return { x: this.cam.x + Math.random() * (this.bw || 400), y: this.cam.y + Math.random() * (this.bh || 240), t: Math.random() * 10, s: 0.4 + Math.random() * 0.6, p: Math.random() * 6 };
    },

    checkZone(silent) {
      const z = this.world.zoneAt(this.player.x, this.player.y - 2);
      const id = z ? z.id : null;
      if (this.currentZone === undefined) { this.currentZone = z; if (z) State.markVisited(z.id); return; }
      if ((this.currentZone ? this.currentZone.id : null) !== id) {
        this.currentZone = z;
        if (z && this.onZoneEnter) this.onZoneEnter(z, silent);
      }
    },

    findTarget() {
      const p = this.player, f = p.front(10);
      let best = null, bestScore = Infinity;
      for (const o of this.world.objects) {
        if (!o.interactive) continue;
        if (Math.abs(o.cx - p.x) > 60 || Math.abs(o.cy - p.y) > 60) continue;
        const r = o.wall ? { x: o.x, y: o.y, w: o.fw * T, h: T } : { x: o.x, y: o.y, w: o.fw * T, h: o.fh * T };
        const dx = Math.max(r.x - f.x, 0, f.x - (r.x + r.w)), dy = Math.max(r.y - f.y, 0, f.y - (r.y + r.h));
        const df = Math.hypot(dx, dy);
        const fx = Math.max(r.x - p.x, 0, p.x - (r.x + r.w)), fy = Math.max(r.y - (p.y - 3), 0, (p.y - 3) - (r.y + r.h));
        const dfeet = Math.hypot(fx, fy);
        let score = Infinity;
        if (df <= 6) score = df; else if (dfeet <= 7) score = 10 + dfeet;
        if (score < bestScore) { bestScore = score; best = o; }
      }
      if (best !== this.target) { this.target = best; if (this.onTargetChange) this.onTargetChange(best); }
    },

    burst(x, y, color) {
      if (this.reduced()) return;
      for (let i = 0; i < 14; i++) { const a = Math.random() * Math.PI * 2, s = 20 + Math.random() * 30; this.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 20, g: 60, life: 0.7, max: 0.7, c: color, s: 1 + (Math.random() < 0.3 ? 1 : 0) }); }
    },

    /* ------------------------------------------------------------ render */
    render() {
      if (!this.world) return;
      const b = this.bctx, cx = Math.round(this.cam.x), cy = Math.round(this.cam.y);
      const bw = this.bw, bh = this.bh, t = this.t, red = this.reduced();
      b.imageSmoothingEnabled = false;
      b.fillStyle = "#1d3a28"; b.fillRect(0, 0, bw, bh);
      b.drawImage(this.world.staticCanvas, cx, cy, bw, bh, 0, 0, bw, bh);

      const inView = (o) => o.sx + o.sw > cx - 8 && o.sx < cx + bw + 8 && o.sy + o.sh > cy - 30 && o.sy < cy + bh + 8;
      const frameOf = (o) => (o.frames > 1 ? Math.floor(t * o.animSpeed + o.phase) % o.frames : 0);

      // objetos de parede
      for (const o of this.world.objects) if (o.wall && inView(o)) this.drawObj(b, o, frameOf(o), cx, cy);

      // ordenação por profundidade
      const list = [];
      for (const o of this.world.objects) if (!o.wall && inView(o)) list.push(o);
      list.push({ isPlayer: true, baseY: this.player.y });
      list.sort((a, c) => a.baseY - c.baseY);
      for (const o of list) {
        if (o.isPlayer) this.player.draw(b, cx, cy);
        else this.drawObj(b, o, frameOf(o), cx, cy);
      }

      // partículas
      for (const p of this.particles) { b.fillStyle = p.c + Math.max(0, p.life / p.max).toFixed(2) + ")"; b.fillRect(Math.round(p.x - cx), Math.round(p.y - cy), p.s, p.s); }

      // luz
      const l = this.lctx;
      l.globalCompositeOperation = "source-over"; l.clearRect(0, 0, bw, bh);
      l.fillStyle = `rgba(14,10,38,${this.ambient.toFixed(3)})`; l.fillRect(0, 0, bw, bh);
      l.globalCompositeOperation = "destination-out";
      const lights = this.world.lights;
      for (const L of lights) {
        const lx = L.x - cx, ly = L.y - cy;
        if (lx < -L.r || ly < -L.r || lx > bw + L.r || ly > bh + L.r) continue;
        let a = L.a; if (L.flicker && !red) a *= 0.9 + Math.sin(t * 9 + L.x) * 0.06 + Math.sin(t * 23 + L.y) * 0.04;
        if (L.blink) a *= Math.floor(t * 2) % 2 ? 0.2 : 1;
        l.globalAlpha = Math.min(1, a); l.drawImage(grad("rgba(255,255,255,1)", L.r), Math.round(lx - L.r), Math.round(ly - L.r));
      }
      l.globalAlpha = 0.5; l.drawImage(grad("rgba(255,255,255,1)", 44), Math.round(this.player.x - cx - 44), Math.round(this.player.y - 12 - cy - 44));
      l.globalAlpha = 1; l.globalCompositeOperation = "source-over";
      b.drawImage(this.light, 0, 0);

      // brilho colorido
      b.globalCompositeOperation = "lighter";
      for (const L of lights) {
        const lx = L.x - cx, ly = L.y - cy;
        if (lx < -L.r || ly < -L.r || lx > bw + L.r || ly > bh + L.r) continue;
        let a = L.a * 0.16; if (L.blink) a *= Math.floor(t * 2) % 2 ? 0.2 : 1;
        b.globalAlpha = a; const r = Math.round(L.r * 0.7);
        b.drawImage(grad(L.color, r), Math.round(lx - r), Math.round(ly - r));
      }
      if (!red && !this.currentZone) for (const f of this.fireflies) {
        const fx = Math.round(f.x - cx), fy = Math.round(f.y - cy), on = 0.5 + Math.sin(f.t * 3 + f.p) * 0.5;
        b.globalAlpha = 0.35 * on; b.drawImage(grad("rgba(255,230,140,1)", 6), fx - 6, fy - 6);
        b.globalAlpha = 0.9 * on; b.fillStyle = "#fff2b0"; b.fillRect(fx, fy, 1, 1);
      }
      b.globalAlpha = 1; b.globalCompositeOperation = "source-over";

      // marcadores de interação
      for (const o of this.world.objects) {
        if (!o.interactive || !inView(o)) continue;
        const bob = red ? 0 : Math.round(Math.sin(t * 4 + o.phase) * 1.5);
        const mx = Math.round(o.cx - cx), my = Math.round((o.wall ? o.y - 2 : o.sy - 4) - cy) + bob - (o.holo ? 12 : 0);
        if (o === this.target) this.drawKey(b, mx, my - 6);
        else if (!State.hasSeen(o.id) && (o.zone || o.id === "byte")) this.drawBang(b, mx, my);
      }

      b.drawImage(this.vignette, 0, 0);

      // blit para a tela
      const c = this.ctx; c.imageSmoothingEnabled = false;
      const s = this.zoom * this.dpr;
      c.drawImage(this.buf, 0, 0, bw, bh, 0, 0, bw * s, bh * s);
    },

    drawObj(b, o, f, cx, cy) {
      const x = o.sx - cx, y = o.sy - cy;
      if (!o.wall && ["tree", "pine", "lamppost", "npc", "fountain", "skillstation", "projectpod", "commterminal", "easel", "antenna", "signpost"].includes(o.type)) {
        b.fillStyle = "rgba(10,8,20,0.28)";
        b.beginPath(); b.ellipse(Math.round(o.cx - cx), Math.round(o.baseY - cy - 2), Math.min(16, o.sw / 2), 3, 0, 0, Math.PI * 2); b.fill();
      }
      let spr;
      if (o.type === "npc") {
        if (o.npc === "robot") {
          spr = Sprites.robotFrame(Math.floor(this.t * 2 + o.phase) % 2);
          const hover = this.reduced() ? 0 : Math.round(Math.sin(this.t * 3) * 1.5);
          b.drawImage(spr, Math.round(x) + spr.ox, Math.round(y + hover) + spr.oy);
          b.globalAlpha = 0.6; b.fillStyle = "#4fe3c1"; b.fillRect(Math.round(o.cx - cx) - 2, Math.round(o.baseY - cy) - 3, 4, 1); b.globalAlpha = 1;
          return;
        }
        const face = o.faceUntil && o.faceUntil > this.t ? o.faceDir : "up";
        spr = Sprites.charFrame(VISITOR, face, Math.floor(this.t * 1.6 + o.phase) % 2, false);
      } else spr = Sprites.object(o.type, f, o.opts);
      b.drawImage(spr, Math.round(x) + spr.ox, Math.round(y) + spr.oy);
      if (o.holo) {
        const bob = this.reduced() ? 0 : Math.round(Math.sin(this.t * 2.5 + o.phase) * 1.5);
        const tw = Sprites.textWidth(o.holo.text);
        const hx = Math.round(o.cx - cx - tw / 2), hy = Math.round(o.sy - cy - 9 + bob);
        b.globalAlpha = 0.22; b.fillStyle = o.holo.color;
        b.beginPath(); b.moveTo(Math.round(o.cx - cx) - 2, Math.round(o.sy - cy) + 2); b.lineTo(hx - 3, hy + 7); b.lineTo(hx + tw + 3, hy + 7); b.lineTo(Math.round(o.cx - cx) + 2, Math.round(o.sy - cy) + 2); b.fill();
        b.globalAlpha = 0.5; b.fillStyle = "#0f1426"; b.fillRect(hx - 2, hy - 2, tw + 4, 9);
        b.globalAlpha = 0.95; Sprites.drawText(b, o.holo.text, hx, hy, o.holo.color);
        if (!this.reduced() && Math.floor(this.t * 8 + o.phase) % 7 === 0) { b.globalAlpha = 0.4; b.fillStyle = "#fff"; b.fillRect(hx - 2, hy + Math.floor((this.t * 20) % 9) - 2, tw + 4, 1); }
        b.globalAlpha = 1;
      }
    },
    drawKey(b, x, y) {
      b.fillStyle = "#17121f"; b.fillRect(x - 6, y - 6, 13, 12);
      b.fillStyle = "#f5f1e8"; b.fillRect(x - 5, y - 6, 11, 10); b.fillStyle = "#c9c1b0"; b.fillRect(x - 5, y + 3, 11, 2);
      Sprites.drawText(b, "E", x - 1, y - 4, "#17121f");
      b.fillStyle = "#17121f"; b.fillRect(x - 1, y + 6, 3, 1); b.fillRect(x, y + 7, 1, 1);
    },
    drawBang(b, x, y) {
      b.fillStyle = "#17121f"; b.fillRect(x - 2, y - 9, 5, 11);
      b.fillStyle = "#f6c35b"; b.fillRect(x - 1, y - 8, 3, 6); b.fillRect(x - 1, y - 1, 3, 2);
    },
  };

  window.Game = Game;
})();
