/* ==========================================================================
   cutscene.js — Cutscenes curtas e roteirizadas
   Um "diretor" minimalista: trava o controle, liga as faixas de cinema,
   move/zoom a câmera, mostra balões de fala presos a pontos do mundo e
   devolve o controle. Toda cutscene pode ser pulada (ESC, E, Enter, Espaço
   ou botão "Pular") e respeita "reduzir movimento" / "cutscenes desligadas".
   ========================================================================== */

(function () {
  "use strict";

  const SKIP = Symbol("skip");
  const $ = (s) => document.querySelector(s);
  const D = () => window.PORTFOLIO;

  /* Objeto em destaque de cada área ("monumento") e a fala da apresentação */
  const MONUMENT = {
    about: "about-pc", skills: "skills-overview", projects: "projects-overview", exp: "exp-overview",
    edu: "edu-overview", testi: null, contact: "contact-overview",
  };
  const LINES = {
    about: () => "Aqui começa a história: apresentação, trajetória e currículo.",
    skills: () => `${D().skills.length} tecnologias. Cada estação é uma habilidade.`,
    projects: () => `${D().projects.length} projetos em destaque e o resto direto do GitHub.`,
    exp: () => `${D().experience.length} missões reais, do e-commerce ao produto.`,
    edu: () => `Formação e ${D().certificates.length} cursos nas estantes douradas.`,
    testi: () => "Quem já trabalhou com o Matheus deixou um recado aqui.",
    contact: () => "Fim da jornada? Que tal mandar um oi para o Matheus?",
  };

  const Cutscene = {
    active: false, skipped: false, pending: [], bubble: null, raf: 0,

    enabled() { return State.data.settings.cutscenes !== false && !State.data.settings.reduceMotion; },

    /** Executa um roteiro. `end(skipped)` garante o estado final mesmo se o jogador pular. */
    async play(script, end) {
      if (this.active) return;
      this.active = true; this.skipped = false;
      UI.cutscene = true; Input.clear(); UI.sync();
      Game.scriptInput = { x: 0, y: 0 };
      document.body.classList.add("cinematic");
      $("#cine").classList.add("on");
      try { await script(this); } catch (e) { if (e !== SKIP) console.error(e); }
      this.pending.forEach((p) => clearTimeout(p.id)); this.pending = [];
      this.hideBubble(); this.caption(null);
      if (end) end(this.skipped);
      if (this.skipped) $("#zone-banner").classList.remove("show");
      Game.scriptInput = null; Game.camFocus = null; Game.camSpeed = 7;
      if (this.skipped) { Game.tweens = []; Game.camZoom = 1; Game.snapCamera(); } else if (Game.camZoom !== 1) Game.zoomTo(1, 0.45);
      $("#cine").classList.remove("on");
      document.body.classList.remove("cinematic");
      this.active = false; UI.cutscene = false; UI.sync();
    },
    skip() {
      if (!this.active || this.skipped) return;
      this.skipped = true;
      this.pending.forEach((p) => { clearTimeout(p.id); p.rej(SKIP); }); this.pending = [];
    },
    wait(ms) {
      return new Promise((res, rej) => {
        if (this.skipped) return rej(SKIP);
        const entry = { rej };
        entry.id = setTimeout(() => { this.pending = this.pending.filter((p) => p !== entry); res(); }, ms);
        this.pending.push(entry);
      });
    },

    /* ----------------------------------------------------------- câmera */
    camTo(x, y, ms) { Game.camSpeed = Math.max(2, 4200 / ms); Game.camFocus = { x, y }; return this.wait(ms); },
    camBack(ms) { Game.camSpeed = Math.max(2, 4200 / ms); Game.camFocus = null; return this.wait(ms); },
    zoom(z, ms) { Game.zoomTo(z, ms / 1000); },

    /* ------------------------------------------------- balão e legenda */
    say(x, y, text, ms, who) {
      const el = this.bubble || (this.bubble = $("#bubble"));
      el.innerHTML = `${who ? `<b>${who}</b>` : ""}<span></span>`;
      el.hidden = false; el.classList.remove("show"); void el.offsetWidth; el.classList.add("show");
      const span = el.querySelector("span");
      let i = 0; clearInterval(this._type);
      this._type = setInterval(() => { i += 2; span.textContent = text.slice(0, i); if (i >= text.length) clearInterval(this._type); }, 18);
      GameAudio.play("pop");
      const follow = () => {
        if (el.hidden) return;
        const p = Game.worldToScreen(x, y);
        el.style.left = Math.round(p.x) + "px"; el.style.top = Math.round(p.y) + "px";
        this.raf = requestAnimationFrame(follow);
      };
      cancelAnimationFrame(this.raf); follow();
      return this.wait(ms);
    },
    hideBubble() { clearInterval(this._type); cancelAnimationFrame(this.raf); if (this.bubble) { this.bubble.hidden = true; this.bubble.classList.remove("show"); } },
    caption(text) {
      const el = $("#cine-caption");
      if (!text) { el.classList.remove("show"); return; }
      el.textContent = text; el.classList.add("show");
    },

    /* ======================================================== ROTEIROS */

    /** Abertura: a câmera desliza até a praça, um feixe de luz "teletransporta" o personagem. */
    opening(first) {
      const P = Game.player, sp = { x: P.x, y: P.y, dir: P.dir };
      const byte = WorldMap.objects.find((o) => o.id === "byte");
      return this.play(async (c) => {
        P.visible = false;
        if (first) {
          Game.camFocus = { x: 39 * 16 + 8, y: 11 * 16 }; Game.camZoom = 1.3; Game.snapCamera();
          c.caption(`Portfólio de ${D().profile.name}`);
          await c.wait(800);
          c.zoom(1.12, 2300); await c.camTo(sp.x, sp.y - 26, 2300);
        } else {
          Game.camFocus = { x: sp.x, y: sp.y - 22 }; Game.camZoom = 1.35; Game.snapCamera();
          c.caption("Bem-vindo de volta!");
          c.zoom(1.18, 700); await c.wait(500);
        }
        Game.effect({ type: "beam", x: sp.x, y: sp.y, d: 1.2 }); Game.fx("beam", sp.x, sp.y); GameAudio.play("beam");
        await c.wait(480);
        P.visible = true; P.dir = "down"; P.z = 64; P.vz = -30; P.squash(0.72, 1.34);
        await c.wait(620); // aterrissa pela física (poeira + tremida)
        c.caption(null);
        P.lookDir = "left"; await c.wait(340); P.lookDir = "right"; await c.wait(340); P.lookDir = null; P.blinkHold = 0.15;
        if (first && byte) await c.say(byte.cx, byte.sy - 4, "Opa! Chegou visita!", 1300, "Byte");
        c.hideBubble(); c.zoom(1, 600); await c.camBack(550);
      }, () => { P.visible = true; P.z = 0; P.vz = 0; P.lookDir = null; P.x = sp.x; P.y = sp.y; P.dir = "down"; });
    },

    /** Primeira visita a uma área: câmera vai até o "monumento" da área e volta. */
    zoneIntro(z) {
      const id = MONUMENT[z.id] || null;
      const obj = WorldMap.objects.find((o) => (id ? o.id === id : o.zone === z.id && o.interactive));
      if (!obj) return Promise.resolve();
      return this.play(async (c) => {
        await c.wait(180);
        c.zoom(1.3, 600); await c.camTo(obj.cx, obj.cy - 4, 600);
        Game.effect({ type: "spot", x: obj.cx, y: obj.wall ? obj.y + 8 : obj.cy - 4, r: 34, d: 1.6, color: z.color });
        Game.burst(obj.cx, obj.wall ? obj.y + 8 : obj.sy + 6, "rgba(255,236,150,"); GameAudio.play("reveal");
        await c.say(obj.cx, obj.wall ? obj.y - 2 : obj.sy - 6, LINES[z.id](), 1350);
        c.hideBubble(); c.zoom(1, 450); await c.camBack(420);
      });
    },

    /** Ao ativar um objeto importante pela 1ª vez: foco rápido antes de abrir o conteúdo. */
    focusObject(obj, text) {
      const P = Game.player;
      const dx = obj.cx - P.x, dy = obj.cy - P.y;
      return this.play(async (c) => {
        P.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up";
        P.squash(0.9, 1.1);
        c.zoom(1.38, 420); await c.camTo((obj.cx + P.x) / 2, (obj.cy + P.y) / 2 - 10, 380);
        Game.effect({ type: "spot", x: obj.cx, y: obj.wall ? obj.y + 8 : obj.cy - 4, r: 28, d: 1.1, color: obj.light && obj.light.color });
        Game.burst(obj.cx, obj.wall ? obj.y + 8 : obj.sy + 6, "rgba(160,255,230,"); GameAudio.play("reveal");
        await c.say(obj.cx, obj.wall ? obj.y - 2 : obj.sy - 6, text, 950);
        c.hideBubble(); c.zoom(1, 300); await c.camBack(260);
      });
    },
  };

  window.Cutscene = Cutscene;
})();
