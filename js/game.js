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
    camZoom: 1, camFocus: null, camSpeed: 7, look: { x: 0, y: 0 }, shakeT: 0, shakeA: 0, tweens: [], effects: [], scriptInput: null,
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
      this.player.onStep = () => GameAudio.play("step");
      this.player.reduced = () => this.reduced();
      this.player.fx = (k, x, y, dx, dy) => this.fx(k, x, y, dx, dy);
      this.player.onLand = (impact) => { GameAudio.play("land"); this.shake(1.2 + impact * 1.5, 0.14); };
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
      const fx = this.camFocus ? this.camFocus.x : this.player.x + this.look.x;
      const fy = this.camFocus ? this.camFocus.y : this.player.y - 12 + this.look.y;
      let x = fx - this.bw / 2, y = fy - this.bh / 2;
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
      for (let i = this.tweens.length - 1; i >= 0; i--) {
        const tw = this.tweens[i]; tw.t += dt; const k = Math.min(1, tw.t / tw.d); const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
        tw.set(tw.from + (tw.to - tw.from) * e); if (k >= 1) { this.tweens.splice(i, 1); if (tw.done) tw.done(); }
      }
      for (let i = this.effects.length - 1; i >= 0; i--) { this.effects[i].t += dt; if (this.effects[i].t >= this.effects[i].d) this.effects.splice(i, 1); }
      this.shakeT = Math.max(0, this.shakeT - dt);
      if (this.scriptInput) {
        this.player.update(dt, this.scriptInput);
      } else if (!this.paused) {
        const v = Input.vector();
        this.player.update(dt, v);
        // a câmera "olha" um pouco à frente do movimento
        const lx = Math.max(-26, Math.min(26, this.player.vx * 0.22)), ly = Math.max(-18, Math.min(18, this.player.vy * 0.16));
        const kl = 1 - Math.exp(-dt * 2.5); this.look.x += (lx - this.look.x) * kl; this.look.y += (ly - this.look.y) * kl;
        if (v.x || v.y) { this.saveTimer += dt; if (this.saveTimer > 2) { this.saveTimer = 0; this.savePos(); } }
        this.checkZone(false);
        this.findTarget();
      }
      const ct = this.cameraTarget();
      if (this.paused && !this.scriptInput) { this.look.x *= 0.9; this.look.y *= 0.9; }
      const k = this.reduced() ? 1 : 1 - Math.exp(-dt * this.camSpeed);
      this.cam.x += (ct.x - this.cam.x) * k; this.cam.y += (ct.y - this.cam.y) * k;

      const inside = this.currentZone ? 0.24 : 0.36;
      this.ambient += (inside - this.ambient) * Math.min(1, dt * 3);

      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i]; p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (p.g || 0) * dt;
        if (p.drag) { const d = Math.exp(-p.drag * dt); p.vx *= d; p.vy *= d; }
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

    /** Efeitos de movimento: poeira, rastro, faíscas, "Zzz"… */
    fx(kind, x, y, dx, dy) {
      if (this.reduced()) return;
      const dust = this.currentZone ? "rgba(230,225,215," : "rgba(214,196,160,";
      const puff = (px, py, vx, vy, r, life, grow) => this.particles.push({ x: px, y: py, vx, vy, life, max: life, puff: true, r, grow: grow || 3, c: dust, drag: 5 });
      const R = () => Math.random() - 0.5;
      switch (kind) {
        case "step": puff(x + R() * 4 + dx * 3, y - 1, dx * 10 + R() * 8, -4 - Math.random() * 5, 1.2, 0.35, 2); break;
        case "start": for (let i = 0; i < 4; i++) puff(x + dx * 4 + R() * 6, y - 1 + R() * 2, dx * 30 + R() * 20, -6 + R() * 8, 1.5, 0.45); break;
        case "stop": for (let i = 0; i < 3; i++) puff(x + dx * 5 + R() * 5, y - 1, dx * 24 + R() * 14, -5 + R() * 6, 1.3, 0.4); break;
        case "skid": for (let i = 0; i < 6; i++) puff(x + R() * 6, y - 1 + R() * 2, dx * 26 + R() * 24, -10 * Math.random(), 1.5, 0.5); break;
        case "dash": for (let i = 0; i < 6; i++) puff(x + R() * 4, y - 2 + R() * 3, dx * 50 + R() * 30, dy * 50 + R() * 20 - 6, 1.8, 0.5, 4); this.shake(1, 0.08); GameAudio.play("dash"); break;
        case "trail": puff(x + R() * 4, y - 1, dx * 8 + R() * 6, -3, 1, 0.3, 1.5); break;
        case "bump": for (let i = 0; i < 5; i++) this.particles.push({ x: x + dx * 5, y: y - 6 + R() * 8, vx: -dx * 30 + R() * 30, vy: R() * 30 - 15, g: 120, life: 0.4, max: 0.4, c: "rgba(255,240,200,", s: 1 }); this.shake(1.5, 0.1); GameAudio.play("bump"); break;
        case "jump": for (let i = 0; i < 5; i++) puff(x + R() * 8, y - 1, R() * 30, -4 * Math.random(), 1.3, 0.4); GameAudio.play("jump"); break;
        case "land": for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; puff(x + Math.cos(a) * 4, y - 1 + Math.sin(a) * 1.5, Math.cos(a) * 34, Math.sin(a) * 10 - 4, 1.6, 0.5, 3.5); } break;
        case "sparkle": for (let i = 0; i < 8; i++) { const a = Math.random() * Math.PI * 2; this.particles.push({ x, y, vx: Math.cos(a) * 25, vy: Math.sin(a) * 25 - 10, life: 0.6, max: 0.6, c: "rgba(255,236,150,", s: 1, drag: 3 }); } break;
        case "zzz": this.particles.push({ x, y, vx: 6, vy: -9, life: 2.2, max: 2.2, zzz: true, c: "rgba(220,230,255," }); break;
        case "beam": for (let i = 0; i < 18; i++) this.particles.push({ x: x + R() * 14, y: y - Math.random() * 40, vx: R() * 6, vy: -20 - Math.random() * 30, life: 0.8, max: 0.8, c: "rgba(160,255,230,", s: 1 }); break;
      }
    },
    shake(a, d) { if (this.reduced()) return; this.shakeA = Math.max(this.shakeT > 0 ? this.shakeA : 0, a); this.shakeT = Math.max(this.shakeT, d); },
    tween(from, to, d, set, done) { this.tweens = this.tweens.filter((t) => t.set !== set); this.tweens.push({ from, to, d: Math.max(0.001, d), t: 0, set, done }); },
    zoomTo(z, d) { return new Promise((res) => this.tween(this.camZoom, z, d, (v) => (this.camZoom = v), res)); },
    effect(e) { this.effects.push(Object.assign({ t: 0 }, e)); },
    /** Converte coordenadas do mundo em pixels de tela (CSS), considerando zoom de câmera. */
    worldToScreen(x, y) {
      const z = this.camZoom, ox = (this.bw - this.bw / z) / 2, oy = (this.bh - this.bh / z) / 2;
      return { x: ((x - this.cam.x) - ox) * z * this.zoom, y: ((y - this.cam.y) - oy) * z * this.zoom };
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
      for (const p of this.particles) {
        const k = Math.max(0, p.life / p.max);
        if (p.puff) { const r = Math.max(1, Math.round(p.r + (1 - k) * p.grow)); b.fillStyle = p.c + (k * 0.75).toFixed(2) + ")"; b.fillRect(Math.round(p.x - cx - r / 2), Math.round(p.y - cy - r / 2), r, r); if (r > 2) { b.fillStyle = p.c + (k * 0.35).toFixed(2) + ")"; b.fillRect(Math.round(p.x - cx - r / 2) + 1, Math.round(p.y - cy - r / 2) - 1, r - 2, 1); } }
        else if (p.zzz) { b.globalAlpha = Math.min(1, k * 1.5); Sprites.drawText(b, "Z", Math.round(p.x - cx + Math.sin(p.life * 3) * 2), Math.round(p.y - cy), "#dfe8ff"); b.globalAlpha = 1; }
        else { b.fillStyle = p.c + k.toFixed(2) + ")"; b.fillRect(Math.round(p.x - cx), Math.round(p.y - cy), p.s, p.s); }
      }
      // efeitos de cutscene: feixe de luz e destaque de objetos
      for (const e of this.effects) {
        const k = e.t / e.d, ex = Math.round(e.x - cx), ey = Math.round(e.y - cy);
        if (e.type === "beam") {
          const a = k < 0.2 ? k / 0.2 : 1 - (k - 0.2) / 0.8, w = Math.round(10 + Math.sin(k * Math.PI) * 6);
          b.globalCompositeOperation = "lighter";
          b.globalAlpha = 0.55 * a; b.fillStyle = "#4fe3c1"; b.fillRect(ex - w, ey - 200, w * 2, 200);
          b.globalAlpha = 0.8 * a; b.fillStyle = "#c8fff1"; b.fillRect(ex - Math.round(w / 3), ey - 200, Math.round(w / 1.5), 200);
          b.globalAlpha = 0.5 * a; b.drawImage(grad("rgba(79,227,193,1)", 30), ex - 30, ey - 30);
          b.globalAlpha = 1; b.globalCompositeOperation = "source-over";
        } else if (e.type === "spot") {
          const pulse = 0.5 + Math.sin(e.t * 9) * 0.5, a = k < 0.15 ? k / 0.15 : k > 0.8 ? (1 - k) / 0.2 : 1;
          b.globalCompositeOperation = "lighter";
          b.globalAlpha = (0.25 + pulse * 0.2) * a; const r = Math.round(e.r + pulse * 6);
          b.drawImage(grad(e.color || "rgba(255,230,150,1)", r), ex - r, ey - r);
          b.globalAlpha = 0.5 * a; b.strokeStyle = e.color || "rgba(255,230,150,1)"; b.lineWidth = 1;
          const rr = Math.round(e.r * 0.6 + k * 26); b.strokeRect(ex - rr + 0.5, ey - Math.round(rr * 0.6) + 0.5, rr * 2, Math.round(rr * 1.2));
          b.globalAlpha = 1; b.globalCompositeOperation = "source-over";
        }
      }

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
        if (!o.interactive || !inView(o) || (window.Cutscene && Cutscene.active)) continue;
        const bob = red ? 0 : Math.round(Math.sin(t * 4 + o.phase) * 1.5);
        const mx = Math.round(o.cx - cx), my = Math.round((o.wall ? o.y - 2 : o.sy - 4) - cy) + bob - (o.holo ? 12 : 0);
        if (o === this.target) this.drawKey(b, mx, my - 6);
        else if (!State.hasSeen(o.id) && (o.zone || o.id === "byte")) this.drawBang(b, mx, my);
      }

      b.drawImage(this.vignette, 0, 0);

      // blit para a tela
      const c = this.ctx; c.imageSmoothingEnabled = false;
      const s = this.zoom * this.dpr;
      const z = this.camZoom, sw = bw / z, sh = bh / z;
      let shx = 0, shy = 0;
      if (this.shakeT > 0) { shx = (Math.random() - 0.5) * 2 * this.shakeA; shy = (Math.random() - 0.5) * 2 * this.shakeA; }
      c.fillStyle = "#07060f"; if (shx || shy) c.fillRect(0, 0, this.canvas.width, this.canvas.height);
      c.drawImage(this.buf, (bw - sw) / 2, (bh - sh) / 2, sw, sh, Math.round(shx * s), Math.round(shy * s), bw * s, bh * s);
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
