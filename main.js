/* ==========================================================================
   main.js — Inicialização, menu inicial animado e roteamento de teclado
   ========================================================================== */

(function () {
  "use strict";

  const $ = (s) => document.querySelector(s);

  const Main = {
    init() {
      const data = window.PORTFOLIO;
      State.load();
      this.applyMeta(data);
      Game.init($("#game"), data);
      UI.init();
      this.applySettings();
      this.menuBg = new MenuScene($("#menu-bg"), data.profile.avatar);
      this.bindMenu();
      this.bindKeys();
      Game.start();
      if (location.hash === "#portfolio" || /[?&]modo=tradicional/.test(location.search)) { UI.openClassic(); }
      else this.showMenu();
      window.addEventListener("hashchange", () => { if (location.hash === "#portfolio" && !UI.classicOpen) UI.openClassic(); });
    },

    applyMeta(d) {
      document.title = d.meta.title;
      const set = (sel, attr, v) => { const el = document.querySelector(sel); if (el && v) el.setAttribute(attr, v); };
      set('meta[name="description"]', "content", d.meta.description);
      set('meta[property="og:title"]', "content", d.meta.title);
      set('meta[property="og:description"]', "content", d.meta.description);
      set('meta[property="og:url"]', "content", d.meta.siteUrl);
      if (d.meta.ogImage) set('meta[property="og:image"]', "content", d.meta.ogImage);
    },

    applySettings() {
      const s = State.data.settings;
      GameAudio.setSfx(s.sfx); GameAudio.setVolume(s.volume); GameAudio.setMusic(s.music);
      document.documentElement.classList.toggle("reduce-motion", !!s.reduceMotion);
      UI.sync();
    },

    showMenu() {
      UI.menuOpen = true;
      $("#menu").hidden = false;
      $("#start-sub").textContent = State.data.started ? "continuar de onde parou" : "";
      UI.sync();
      this.menuBg.start();
      setTimeout(() => $("#btn-start").focus({ preventScroll: true }), 50);
    },
    hideMenu() {
      UI.menuOpen = false;
      $("#menu").hidden = true;
      this.menuBg.stop();
      UI.sync();
    },

    startGame() {
      GameAudio.init();
      this.applySettings();
      const first = !State.data.started;
      State.data.started = true; State.save();
      this.hideMenu();
      UI.fade(() => {});
      $("#game").focus({ preventScroll: true });
      Game.checkZone(true);
      const after = () => this.afterOpening(first);
      if (Cutscene.enabled()) Cutscene.opening(first).then(after); else after();
    },
    afterOpening(first) {
      if (first || !State.data.tutorialDone) {
        const byte = WorldMap.objects.find((o) => o.id === "byte");
        Game.target = byte;
        setTimeout(() => { State.markSeen("byte"); UI.guideDialog(); }, 250);
        UI.showHint(window.matchMedia("(pointer: coarse)").matches ? "Use o joystick para andar" : "<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> andar · <kbd>Shift</kbd> dash · <kbd>Espaço</kbd> pular · <kbd>E</kbd> interagir · <kbd>M</kbd> mapa");
        const off = setInterval(() => { if (Game.player.walking) { setTimeout(() => UI.hideHint(), 2500); clearInterval(off); } }, 300);
      }
    },

    bindMenu() {
      $("#btn-start").addEventListener("click", () => { GameAudio.init(); GameAudio.play("open"); this.startGame(); });
      $("#btn-controls").addEventListener("click", () => {
        GameAudio.init(); GameAudio.play("select");
        UI.menuOpen = false; UI.openControls(); UI.menuOpen = true;
        UI.modalStack[UI.modalStack.length - 1].onClose = () => setTimeout(() => $("#btn-controls").focus(), 20);
        UI.sync();
      });
      $("#btn-classic").addEventListener("click", () => { GameAudio.init(); GameAudio.play("select"); this.hideMenu(); UI.openClassic(); });
      $("#classic-back-menu") && $("#classic-back-menu").addEventListener("click", () => { UI.closeClassic(); this.showMenu(); });
      $("#skip-link").addEventListener("click", (e) => { e.preventDefault(); this.hideMenu(); UI.openClassic(); });
    },

    bindKeys() {
      document.addEventListener("keydown", (e) => {
        const tag = (e.target.tagName || "").toLowerCase();
        const typing = tag === "input" || tag === "textarea" || tag === "select";

        if (Cutscene.active) {
          if (["Escape", "Enter", " "].includes(e.key) || e.code === "KeyE") { e.preventDefault(); Cutscene.skip(); }
          return;
        }
        if (UI.classicOpen) {
          if (e.key === "Escape") { UI.closeClassic(); this.showMenu(); }
          return;
        }
        if (UI.modalStack.length) {
          if (e.key === "Escape") { e.preventDefault(); UI.closeModal(); }
          if (e.key === "Tab") trapFocus(e, $("#modal .modal-window"));
          if (!typing && (e.code === "KeyM" && UI.modalStack[UI.modalStack.length - 1].title === "Mapa e navegação")) UI.closeModal();
          return;
        }
        if (UI.menuOpen) {
          if ((e.key === "Enter" || e.key === " ") && document.activeElement === document.body) { e.preventDefault(); this.startGame(); }
          return;
        }
        if (UI.dialogState) {
          if (["KeyE", "Enter", "Space", "NumpadEnter"].includes(e.code)) { e.preventDefault(); if (!e.repeat) UI.advanceDialog(); }
          if (e.key === "Escape") { e.preventDefault(); while (UI.dialogState) UI.advanceDialog(); }
          return;
        }
        if (typing) return;
        if (Input.isMoveKey(e.code)) { e.preventDefault(); Input.keyDown(e.code); return; }
        if (e.repeat) return;
        if (e.code === "ShiftLeft" || e.code === "ShiftRight") { e.preventDefault(); UI.dash(); }
        else if (e.code === "Space") { e.preventDefault(); UI.jump(); }
        else if (e.code === "KeyE" || e.code === "Enter" || e.code === "NumpadEnter") { e.preventDefault(); UI.actionKey(); }
        else if (e.key === "Escape" || e.code === "KeyP") { e.preventDefault(); UI.openPause(); }
        else if (e.code === "KeyM") UI.openMap();
        else if (e.code === "KeyQ") UI.openQuests();
      });
      document.addEventListener("keyup", (e) => Input.keyUp(e.code));
    },
  };

  function trapFocus(e, root) {
    const f = [...root.querySelectorAll('a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])')].filter((el) => el.offsetParent !== null);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  /* ======================================================= MENU ANIMADO */
  class MenuScene {
    constructor(canvas, avatar) {
      this.c = canvas; this.g = canvas.getContext("2d"); this.pal = Object.assign({ id: "player" }, avatar);
      this.t = 0; this.run = false; this.buf = Sprites.canvas(10, 10); this.b = this.buf.getContext("2d");
      const r = Sprites.rng(42);
      this.stars = Array.from({ length: 90 }, () => ({ x: r(), y: r() * 0.6, s: r() < 0.15 ? 2 : 1, p: r() * 6 }));
      this.mount = Array.from({ length: 40 }, (_, i) => 0.55 + Math.sin(i * 0.9) * 0.05 + r() * 0.05);
      this.city = Array.from({ length: 30 }, () => ({ w: 10 + ((r() * 14) | 0), h: 20 + ((r() * 46) | 0), lit: Array.from({ length: 30 }, () => r() < 0.35) }));
      this.trees = Array.from({ length: 24 }, () => ({ k: r() < 0.4 ? "pine" : "tree", seed: (r() * 999) | 0 }));
      window.addEventListener("resize", () => this.resize()); this.resize();
    }
    resize() {
      const w = window.innerWidth, h = window.innerHeight, dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.z = Math.max(2, Math.floor(Math.min(w / 260, h / 170)));
      this.bw = Math.ceil(w / this.z); this.bh = Math.ceil(h / this.z);
      this.c.width = w * dpr; this.c.height = h * dpr; this.buf.width = this.bw; this.buf.height = this.bh; this.dpr = dpr;
      this.draw();
    }
    start() { if (this.run) return; this.run = true; let last = performance.now(); const loop = (ts) => { if (!this.run) return; this.t += Math.min(0.05, (ts - last) / 1000); last = ts; this.draw(); requestAnimationFrame(loop); }; requestAnimationFrame(loop); }
    stop() { this.run = false; }
    draw() {
      const b = this.b, W = this.bw, H = this.bh, red = State.data.settings.reduceMotion, t = red ? 0 : this.t;
      const sky = b.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, "#0b0d24"); sky.addColorStop(0.55, "#2a1f4f"); sky.addColorStop(0.8, "#6b3a5e"); sky.addColorStop(1, "#c4685a");
      b.fillStyle = sky; b.fillRect(0, 0, W, H);
      this.stars.forEach((s) => { const a = red ? 0.8 : 0.5 + Math.sin(this.t * 2 + s.p) * 0.5; b.globalAlpha = a; b.fillStyle = "#fff6d8"; b.fillRect(Math.round(s.x * W), Math.round(s.y * H), s.s, s.s); });
      b.globalAlpha = 1;
      // lua
      const mx = Math.round(W * 0.78), my = Math.round(H * 0.2);
      b.fillStyle = "rgba(255,240,200,0.12)"; b.beginPath(); b.arc(mx, my, 22, 0, 7); b.fill();
      b.fillStyle = "#fff1c9"; b.beginPath(); b.arc(mx, my, 11, 0, 7); b.fill(); b.fillStyle = "#e9d8a8"; b.fillRect(mx - 4, my - 3, 3, 2); b.fillRect(mx + 3, my + 3, 2, 2);
      // montanhas
      const layer = (speed, baseY, amp, color, seedArr, step) => {
        const off = (t * speed) % (step * seedArr.length);
        b.fillStyle = color; b.beginPath(); b.moveTo(0, H);
        for (let i = -1; i <= Math.ceil(W / step) + 1; i++) { const k = ((i + Math.floor(off / step)) % seedArr.length + seedArr.length) % seedArr.length; b.lineTo(Math.round(i * step - (off % step)), Math.round(H * baseY - seedArr[k] * amp)); }
        b.lineTo(W, H); b.fill();
      };
      layer(3, 0.72, 40, "#3b2a5c", this.mount, 18);
      layer(6, 0.8, 26, "#2c2348", this.mount.slice().reverse(), 14);
      // cidade
      const cOff = (t * 10) % 600; let x = -cOff; let i = 0;
      while (x < W + 40) { const bd = this.city[i % this.city.length]; const by = Math.round(H * 0.84 - bd.h); b.fillStyle = "#1c1a33"; b.fillRect(Math.round(x), by, bd.w, bd.h + 40);
        for (let wy = 0; wy < Math.floor(bd.h / 5); wy++) for (let wx = 0; wx < Math.floor((bd.w - 2) / 4); wx++) if (bd.lit[(wy * 3 + wx) % 30]) { b.fillStyle = (wy + wx + i) % 5 ? "#ffd98a" : "#4fe3c1"; b.fillRect(Math.round(x) + 2 + wx * 4, by + 3 + wy * 5, 2, 2); }
        x += bd.w + 3; i++; }
      // árvores e chão
      const gy = Math.round(H * 0.86);
      const tOff = (t * 24) % 40; this.trees.forEach((tr, k) => { const spr = Sprites.object(tr.k, 0, { seed: tr.seed, key: "m" + tr.seed }); const tx = Math.round(k * 40 - tOff - 20); if (tx < -40 || tx > W + 10) return; b.drawImage(spr, tx, gy - spr.height + 6); });
      b.fillStyle = "#2f5f3e"; b.fillRect(0, gy, W, H - gy); b.fillStyle = "#4a8a52"; b.fillRect(0, gy, W, 3);
      const pOff = Math.round((t * 40) % 16); b.fillStyle = "#b48a5c"; b.fillRect(0, gy + 8, W, 10);
      b.fillStyle = "#9a7149"; for (let px = -pOff; px < W; px += 16) b.fillRect(px, gy + 12, 4, 1);
      // personagem + Byte
      const cx = Math.round(W * 0.5) - 8, cy = gy + 16;
      const frame = red ? 0 : Math.floor(this.t * 8) % 4;
      b.fillStyle = "rgba(0,0,0,0.3)"; b.beginPath(); b.ellipse(cx + 8, cy - 1, 7, 2, 0, 0, 7); b.fill();
      const spr = Sprites.charFrame(this.pal, "right", frame, !red); b.drawImage(spr, cx - 1, cy - 25);
      const rb = Sprites.robotFrame(Math.floor(this.t * 2) % 2); b.drawImage(rb, cx - 22, cy - 34 + (red ? 0 : Math.round(Math.sin(this.t * 3) * 2)));
      // vinheta
      const v = b.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H); v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(5,4,15,0.6)"); b.fillStyle = v; b.fillRect(0, 0, W, H);
      const g = this.g; g.imageSmoothingEnabled = false; g.drawImage(this.buf, 0, 0, W * this.z * this.dpr, H * this.z * this.dpr);
    }
  }

  window.Main = Main;
  window.addEventListener("DOMContentLoaded", () => Main.init());
})();
