/* ==========================================================================
   sprites.js — Pixel art procedural
   Todos os gráficos são desenhados por código em canvases fora da tela e
   guardados em cache. Assim o projeto não depende de arquivos de imagem e
   continua leve. Cada sprite recebe contorno automático (outline).
   ========================================================================== */

(function () {
  "use strict";

  const T = 16;
  const OUTLINE = "#17121f";
  const cache = new Map();

  /* ------------------------------------------------------------ utilidades */
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function canvas(w, h) {
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    return c;
  }
  function painter(ctx) {
    const p = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
    p.px = (x, y, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, 1, 1); };
    p.disc = (cx, cy, r, c) => {
      ctx.fillStyle = c;
      for (let y = -r; y <= r; y++) {
        const half = Math.floor(Math.sqrt(r * r - y * y + r * 0.6));
        ctx.fillRect(Math.round(cx - half), Math.round(cy + y), half * 2 + 1, 1);
      }
    };
    p.ctx = ctx;
    return p;
  }
  function shade(hex, amt) {
    let c = hex.replace("#", "");
    if (c.length === 3) c = c.split("").map((x) => x + x).join("");
    const n = parseInt(c, 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    const f = (v) => Math.max(0, Math.min(255, Math.round(amt < 0 ? v * (1 + amt) : v + (255 - v) * amt)));
    return "#" + ((1 << 24) + (f(r) << 16) + (f(g) << 8) + f(b)).toString(16).slice(1);
  }
  function addOutline(c, color) {
    const ctx = c.getContext("2d");
    const { width: w, height: h } = c;
    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;
    const solid = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) solid[i] = d[i * 4 + 3] > 40 ? 1 : 0;
    const n = parseInt(color.slice(1), 16);
    const R = (n >> 16) & 255, G = (n >> 8) & 255, B = n & 255;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (solid[i]) continue;
      if ((x > 0 && solid[i - 1]) || (x < w - 1 && solid[i + 1]) || (y > 0 && solid[i - w]) || (y < h - 1 && solid[i + w])) {
        d[i * 4] = R; d[i * 4 + 1] = G; d[i * 4 + 2] = B; d[i * 4 + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }
  /** Cria (ou busca no cache) um sprite com 1px de margem para o contorno. */
  function make(key, w, h, draw, outline = true) {
    if (cache.has(key)) return cache.get(key);
    const c = canvas(w + 2, h + 2);
    const ctx = c.getContext("2d");
    ctx.translate(1, 1);
    draw(painter(ctx), ctx);
    if (outline) addOutline(c, OUTLINE);
    c.ox = -1; c.oy = -1; // deslocamento por causa da margem
    cache.set(key, c);
    return c;
  }

  /* ------------------------------------------------------ fonte 3x5 pixel */
  const GLYPHS = {
    A: "010101111101101", B: "110101110101110", C: "011100100100011", D: "110101101101110",
    E: "111100110100111", F: "111100110100100", G: "011100101101011", H: "101101111101101",
    I: "111010010010111", J: "001001001101010", K: "101101110101101", L: "100100100100111",
    M: "101111111101101", N: "110101101101101", O: "010101101101010", P: "110101110100100",
    Q: "010101101110011", R: "110101110101101", S: "011100010001110", T: "111010010010010",
    U: "101101101101111", V: "101101101101010", W: "101101111111101", X: "101101010101101",
    Y: "101101010010010", Z: "111001010100111", 0: "111101101101111", 1: "010110010010111",
    2: "110001010100111", 3: "110001010001110", 4: "101101111001001", 5: "111100110001110",
    6: "011100111101111", 7: "111001010010010", 8: "111101111101111", 9: "111101111001110",
    "<": "001010100010001", ">": "100010001010100", "/": "001001010100100", ".": "000000000000010",
    "#": "101111101111101", "-": "000000111000000", " ": "000000000000000", "!": "010010010000010",
    "?": "110001010000010", "&": "010101010101011", ":": "000010000010000",
  };
  function normalizeText(s) {
    return String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();
  }
  function textWidth(s) { return Math.max(0, normalizeText(s).length * 4 - 1); }
  function drawText(ctx, s, x, y, color, scale = 1) {
    ctx.fillStyle = color;
    const str = normalizeText(s);
    for (let i = 0; i < str.length; i++) {
      const g = GLYPHS[str[i]] || GLYPHS["?"];
      for (let k = 0; k < 15; k++) if (g[k] === "1") ctx.fillRect(x + (i * 4 + (k % 3)) * scale, y + Math.floor(k / 3) * scale, scale, scale);
    }
  }

  /* ================================================================ TILES */
  const THEMES = {
    about:   { floor: "wood",    cap: "#3a2e3f", face: "#c9b48f", faceDark: "#a8936f", trim: "#6e4430" },
    skills:  { floor: "lab",     cap: "#24304a", face: "#8fa3bf", faceDark: "#71849f", trim: "#3d4b66" },
    projects:{ floor: "dev",     cap: "#161a26", face: "#323a52", faceDark: "#262c40", trim: "#4fe3c1" },
    exp:     { floor: "office",  cap: "#2c3044", face: "#d9d4c7", faceDark: "#b9b3a4", trim: "#5b6280" },
    edu:     { floor: "library", cap: "#3b2420", face: "#7d3f36", faceDark: "#64312a", trim: "#d1a35c" },
    testi:   { floor: "gallery", cap: "#2d2a36", face: "#ece6da", faceDark: "#cfc7b6", trim: "#b8894a" },
    contact: { floor: "comms",   cap: "#1b1f2a", face: "#454c5f", faceDark: "#363c4d", trim: "#ff9f43" },
  };

  function tile(name, variant = 0, theme = null) {
    const key = `tile|${name}|${variant}|${theme || ""}`;
    if (cache.has(key)) return cache.get(key);
    const c = canvas(T, T);
    const p = painter(c.getContext("2d"));
    const r = rng(hash(key));
    const th = theme ? THEMES[theme] : null;
    const speckle = (n, cols) => { for (let i = 0; i < n; i++) p.px((r() * T) | 0, (r() * T) | 0, cols[(r() * cols.length) | 0]); };

    switch (name) {
      case "grass": {
        p(0, 0, T, T, "#4a8a52");
        speckle(18, ["#43804b", "#53955a", "#3f7847"]);
        for (let i = 0; i < 3; i++) { const x = (r() * 13) | 0, y = 3 + ((r() * 12) | 0); p.px(x, y, "#68ad62"); p.px(x + 2, y, "#68ad62"); p.px(x + 1, y - 1, "#7cc06e"); }
        if (variant === 1) { const x = 3 + ((r() * 9) | 0), y = 3 + ((r() * 9) | 0); p(x, y, 1, 1, "#f2f0e6"); p(x + 1, y + 1, 1, 1, "#f2f0e6"); p(x + 2, y, 1, 1, "#f2f0e6"); p(x + 1, y, 1, 1, "#f6c35b"); }
        if (variant === 2) { const x = 3 + ((r() * 9) | 0), y = 3 + ((r() * 9) | 0); p(x, y, 2, 2, "#ff8fb1"); p.px(x, y, "#ffc2d4"); p(x + 5, y + 3, 2, 2, "#b892ff"); }
        if (variant === 3) { for (let i = 0; i < 4; i++) { const x = (r() * 14) | 0, y = 2 + ((r() * 12) | 0); p(x, y, 1, 3, "#3b7444"); p(x + 1, y - 1, 1, 3, "#5aa05a"); } }
        break;
      }
      case "dirt":
        p(0, 0, T, T, "#b48a5c");
        speckle(22, ["#a37b50", "#c39967", "#9a7149"]);
        if (variant === 1) { p(5, 9, 2, 1, "#8d8f9c"); p(5, 10, 2, 1, "#6d6f7c"); }
        break;
      case "stone": {
        p(0, 0, T, T, "#6b7186");
        const stones = [[0, 0, 7, 7], [8, 0, 8, 4], [8, 5, 8, 3], [0, 8, 4, 8], [5, 8, 6, 8], [12, 9, 4, 7]];
        stones.forEach(([x, y, w, h], i) => {
          const base = ["#9aa1b5", "#8d94a9", "#a6adc0"][(i + variant) % 3];
          p(x, y, w, h, base); p(x, y, w, 1, shade(base, 0.25)); p(x, y + h - 1, w, 1, shade(base, -0.18));
        });
        speckle(5, ["#b5bccc", "#7e859a"]);
        break;
      }
      case "forest":
        p(0, 0, T, T, "#1d3a28");
        for (let i = 0; i < 5; i++) p.disc((r() * 16) | 0, (r() * 16) | 0, 2 + ((r() * 3) | 0), ["#244a31", "#2a5538", "#1a3324"][(r() * 3) | 0]);
        speckle(4, ["#3a7048"]);
        break;
      case "water":
        p(0, 0, T, T, "#3d7fd1");
        speckle(10, ["#4b8fe0", "#356fbe"]);
        p((variant * 5) % 12, 4, 4, 1, "#9fd0ff"); p((variant * 7 + 6) % 12, 11, 3, 1, "#9fd0ff");
        break;
      case "floor": {
        const f = th.floor;
        if (f === "wood") {
          for (let y = 0; y < T; y += 4) {
            const base = (y / 4 + variant) % 2 ? "#8c5d3d" : "#94643f";
            p(0, y, T, 4, base); p(0, y + 3, T, 1, "#6a442c"); p(0, y, T, 1, shade(base, 0.12));
            const seam = ((y * 7 + variant * 5) % 13) + 1; p(seam, y, 1, 3, "#6a442c");
          }
        } else if (f === "lab") {
          p(0, 0, T, T, "#b9c6d8"); p(0, 0, T, 1, "#d5deea"); p(0, 15, T, 1, "#8f9cb0"); p(15, 0, 1, T, "#8f9cb0"); p(0, 0, 1, T, "#d0d9e6");
          p.px(2, 2, "#8f9cb0"); p.px(13, 2, "#8f9cb0"); p.px(2, 13, "#8f9cb0"); p.px(13, 13, "#8f9cb0");
          if (variant === 1) { p(4, 7, 8, 2, "#a7b5c9"); }
        } else if (f === "dev") {
          p(0, 0, T, T, "#1e2333"); p(0, 15, T, 1, "#2a3147"); p(15, 0, 1, T, "#2a3147");
          if (variant === 1) { p(3, 8, 7, 1, "#2a6e6a"); p(9, 3, 1, 6, "#2a6e6a"); p.px(9, 3, "#4fe3c1"); p.px(3, 8, "#4fe3c1"); }
          if (variant === 2) { p(5, 5, 6, 6, "#232a3d"); p.px(7, 7, "#3b4766"); }
        } else if (f === "office") {
          p(0, 0, T, T, "#4b5a7a"); speckle(20, ["#45536f", "#52617f", "#41506c"]);
          if (variant === 1) { p(0, 7, T, 2, "#55658a"); }
        } else if (f === "library") {
          p(0, 0, T, T, "#8a5c39");
          for (let y = 0; y < T; y += 4) for (let x = 0; x < T; x += 8) {
            const off = (y / 4) % 2 ? 4 : 0; const base = ((x + y) / 4 + variant) % 2 ? "#9b6a43" : "#8a5c39";
            p((x + off) % T, y, 8, 4, base); p((x + off) % T, y + 3, 8, 1, "#6c4529"); p((x + off) % T, y, 1, 4, "#6c4529");
          }
        } else if (f === "gallery") {
          const a = "#ebe6dc", b = "#d4ccbd";
          p(0, 0, 8, 8, a); p(8, 0, 8, 8, b); p(0, 8, 8, 8, b); p(8, 8, 8, 8, a);
          speckle(6, ["#c9c0ae", "#f5f1ea"]);
        } else if (f === "comms") {
          p(0, 0, T, T, "#2c313f");
          for (let i = 1; i < T; i += 3) p(0, i, T, 1, "#252935");
          p(0, 0, T, 1, "#394052");
          if (variant === 1) { for (let x = 0; x < T; x += 4) { p(x, 14, 2, 2, "#ff9f43"); p(x + 2, 14, 2, 2, "#2c313f"); } }
        }
        break;
      }
      case "mat":
        p(0, 0, T, T, "#7a3b46"); p(1, 1, 14, 14, "#93485a"); for (let x = 2; x < 14; x += 3) p(x, 2, 1, 12, "#7a3b46");
        break;
      case "rug": {
        const col = variant === 0 ? "#8a3c4f" : variant === 1 ? "#2f5d7c" : "#4b3a6e";
        p(0, 0, T, T, col); p(0, 0, T, 1, shade(col, 0.2)); speckle(8, [shade(col, -0.12), shade(col, 0.1)]);
        break;
      }
      case "wallcap":
        p(0, 0, T, T, th.cap); p(0, 0, T, 2, shade(th.cap, 0.18)); p(0, T - 2, T, 2, shade(th.cap, -0.3));
        break;
      case "wallface": {
        p(0, 0, T, T, th.face);
        p(0, 0, T, 2, shade(th.face, -0.35));
        if (th.floor === "about" || th.floor === "wood" || th.floor === "library") { for (let x = 3; x < T; x += 5) p(x, 2, 1, 11, th.faceDark); }
        else if (th.floor === "lab" || th.floor === "comms" || th.floor === "dev") { p(0, 7, T, 1, th.faceDark); p(7, 2, 1, 11, th.faceDark); }
        else { speckle(6, [th.faceDark]); }
        p(0, T - 3, T, 3, th.trim); p(0, T - 3, T, 1, shade(th.trim, 0.25));
        if (variant === 1) { // janela
          p(3, 3, 10, 8, "#1c2a44"); p(4, 4, 8, 6, "#5a8fd0"); p(4, 4, 8, 2, "#8fc0f0"); p(7, 4, 1, 6, "#1c2a44"); p(4, 6, 8, 1, "#1c2a44");
          p(3, 11, 10, 1, shade(th.face, -0.4));
        }
        break;
      }
      default:
        p(0, 0, T, T, "#f0f");
    }
    cache.set(key, c);
    return c;
  }

  /* ============================================================ PERSONAGEM */
  function charFrame(pal, dir, frame, walking, closed) {
    const key = `char|${pal.id}|${dir}|${frame}|${walking ? 1 : 0}|${closed ? 1 : 0}`;
    return make(key, 16, 24, (p, ctx) => {
      const flip = dir === "right";
      if (flip) { ctx.translate(16, 0); ctx.scale(-1, 1); }
      const d = flip ? "left" : dir;
      const bob = walking ? [0, -1, 0, -1][frame] : [0, 1][frame % 2] * 0;
      const breathe = !walking && frame % 2 === 1 ? 1 : 0;
      const swing = walking ? [0, 1, 0, -1][frame] : 0;
      const hb = bob, tb = bob + breathe;

      // pernas
      if (d === "down" || d === "up") {
        const lh = 4 + (swing === 1 ? 1 : 0) - (swing === -1 ? 1 : 0);
        const rh = 4 + (swing === -1 ? 1 : 0) - (swing === 1 ? 1 : 0);
        p(5, 18, 3, lh, pal.pants); p(8, 18, 3, rh, pal.pants);
        p(5, 18 + lh, 3, 2, pal.shoes); p(8, 18 + rh, 3, 2, pal.shoes);
        p(5, 18 + lh + 1, 3, 1, shade(pal.shoes, -0.25)); p(8, 18 + rh + 1, 3, 1, shade(pal.shoes, -0.25));
      } else {
        const a = swing === 1 ? -2 : swing === -1 ? 2 : 0;
        p(6 + a, 18, 3, 4, shade(pal.pants, -0.15)); p(6 + a - (a < 0 ? 1 : 0), 22, 4, 2, shade(pal.shoes, -0.2));
        p(7 - a, 18, 3, 4, pal.pants); p(7 - a - (a > 0 ? 1 : 0), 22, 4, 2, pal.shoes);
      }

      // tronco
      if (d === "left") {
        p(5, 10 + tb, 7, 8, pal.hoodie); p(5, 10 + tb, 1, 8, pal.hoodieLight);
        p(5, 17 + tb, 7, 1, shade(pal.hoodie, -0.25));
        p(10, 10 + tb, 2, 3, shade(pal.hoodie, -0.2)); // capuz
        // braço
        const ay = 11 + tb + (walking ? swing : 0);
        p(7, ay, 3, 6, pal.hoodieLight); p(7, ay + 5, 3, 1, pal.skin);
        p(6, 13 + tb, 1, 1, pal.accent);
      } else {
        p(4, 10 + tb, 8, 8, pal.hoodie); p(4, 10 + tb, 1, 8, pal.hoodieLight);
        p(4, 17 + tb, 8, 1, shade(pal.hoodie, -0.25));
        const al = 11 + tb + (walking ? swing : 0), ar = 11 + tb - (walking ? swing : 0);
        p(2, al, 2, 6, pal.hoodieLight); p(2, al + 5, 2, 1, pal.skin);
        p(12, ar, 2, 6, pal.hoodie); p(12, ar + 5, 2, 1, pal.skin);
        if (d === "down") {
          p(7, 11 + tb, 2, 6, shade(pal.hoodie, -0.18)); p(7, 11 + tb, 1, 6, pal.accent);
          p(6, 11 + tb, 1, 3, pal.shoes); p(9, 11 + tb, 1, 3, pal.shoes); // cordões
          p(5, 14 + tb, 2, 1, pal.accent);
        } else {
          p(5, 10 + tb, 6, 3, shade(pal.hoodie, -0.2)); p(6, 13 + tb, 4, 1, shade(pal.hoodie, -0.2));
        }
      }

      // cabeça
      const hy = 2 + hb;
      if (d === "down") {
        p(4, hy, 8, 8, pal.skin); p(4, hy + 7, 8, 1, pal.skinShade);
        p(3, hy + 4, 1, 2, pal.skin); p(12, hy + 4, 1, 2, pal.skin);
        p(3, hy - 1, 10, 3, pal.hair); p(4, hy - 2, 8, 1, pal.hair); p(3, hy + 2, 1, 2, pal.hair); p(12, hy + 2, 1, 2, pal.hair);
        p(5, hy + 2, 2, 1, pal.hair); p(9, hy + 2, 3, 1, pal.hair); p(5, hy - 1, 3, 1, pal.hairLight);
        p(6, hy + 4, 1, 2, "#1a1423"); p(9, hy + 4, 1, 2, "#1a1423");
        p.px(6, hy + 4, "#3a3050"); p.px(9, hy + 4, "#3a3050");
        p(7, hy + 6, 2, 1, pal.skinShade);
        if (closed) { p(6, hy + 4, 1, 2, pal.skin); p(9, hy + 4, 1, 2, pal.skin); p(5, hy + 5, 2, 1, "#1a1423"); p(9, hy + 5, 2, 1, "#1a1423"); }
      } else if (d === "up") {
        p(4, hy, 8, 8, pal.hair); p(3, hy - 1, 10, 6, pal.hair); p(4, hy - 2, 8, 1, pal.hair);
        p(5, hy - 1, 4, 1, pal.hairLight); p(4, hy + 1, 2, 3, pal.hairLight);
        p(5, hy + 7, 6, 1, pal.skinShade); p(3, hy + 4, 1, 2, pal.skin); p(12, hy + 4, 1, 2, pal.skin);
      } else {
        p(4, hy, 8, 8, pal.skin); p(4, hy + 7, 8, 1, pal.skinShade);
        p(4, hy - 1, 9, 3, pal.hair); p(5, hy - 2, 7, 1, pal.hair); p(8, hy + 2, 5, 4, pal.hair); p(11, hy + 6, 1, 1, pal.hair);
        p(6, hy - 1, 3, 1, pal.hairLight); p(4, hy + 2, 2, 1, pal.hair);
        p(9, hy + 4, 1, 2, pal.skin); // orelha
        p(5, hy + 4, 1, 2, "#1a1423");
        p(3, hy + 5, 1, 1, pal.skin);
        if (closed) { p(5, hy + 4, 1, 2, pal.skin); p(4, hy + 5, 2, 1, "#1a1423"); }
      }
    });
  }

  function robotFrame(frame) {
    return make(`robot|${frame}`, 16, 20, (p) => {
      const y = frame === 1 ? 1 : 0;
      p(7, 0 + y, 2, 3, "#7b86a0"); p(6, 0 + y, 4, 1, frame === 1 ? "#ff6b6b" : "#ffd166");
      p(2, 3 + y, 12, 10, "#d6dde9"); p(2, 3 + y, 12, 1, "#f1f5fb"); p(2, 12 + y, 12, 1, "#9aa6bb");
      p(4, 5 + y, 8, 5, "#1a2236"); p(5, 6 + y, 2, 2, "#4fe3c1"); p(9, 6 + y, 2, 2, "#4fe3c1"); p(6, 9 + y, 4, 1, "#2f6e6a");
      p(0, 6 + y, 2, 4, "#9aa6bb"); p(14, 6 + y, 2, 4, "#9aa6bb");
      p(5, 13 + y, 6, 3, "#9aa6bb"); p(6, 16 + y, 4, 1, "#7b86a0");
    });
  }

  /* ============================================================== OBJETOS */
  // Cada definição: w, h (px), frames, draw(p, frame, opts)
  const OBJ = {};

  OBJ.tree = { w: 32, h: 42, draw(p, f, o) {
    const r = rng(o.seed || 1);
    p(13, 30, 6, 12, "#6b4428"); p(13, 30, 2, 12, "#4e301c"); p(11, 40, 10, 2, "#4e301c");
    const g = o.autumn ? ["#7a4a2a", "#b5652d", "#e09a3e", "#f4c56a"] : ["#285c37", "#36764a", "#4b9658", "#78c06c"];
    p.disc(16, 17, 13, g[0]); p.disc(8, 23, 8, g[0]); p.disc(24, 23, 8, g[0]);
    p.disc(14, 14, 10, g[1]); p.disc(9, 21, 6, g[1]); p.disc(23, 20, 6, g[1]);
    p.disc(12, 11, 6, g[2]); p.disc(20, 15, 4, g[2]); p.disc(7, 19, 3, g[2]);
    for (let i = 0; i < 7; i++) p.px(6 + ((r() * 18) | 0), 5 + ((r() * 14) | 0), g[3]);
  } };
  OBJ.pine = { w: 26, h: 44, draw(p, f, o) {
    p(11, 34, 4, 10, "#5a3820");
    const g = ["#1f4a35", "#2b634a", "#3f8462"];
    for (let i = 0; i < 4; i++) { const y = 4 + i * 8, hw = 4 + i * 3; for (let k = 0; k < 10; k++) { const ww = Math.round(hw * (k / 10)); p(13 - ww, y + k, ww * 2, 1, k > 7 ? g[0] : g[1]); } p(12 - Math.round(hw * 0.3), y + 3, 2, 4, g[2]); }
  } };
  OBJ.bush = { w: 20, h: 14, draw(p, f, o) {
    p.disc(6, 8, 5, "#2f6b3f"); p.disc(13, 8, 6, "#2f6b3f"); p.disc(10, 6, 5, "#3f8a4c"); p.disc(8, 5, 2, "#5aa85a");
    if (o.berries) { p.px(5, 8, "#ff6b8b"); p.px(14, 6, "#ff6b8b"); p.px(11, 10, "#ff6b8b"); }
  } };
  OBJ.rock = { w: 14, h: 10, draw(p) { p(1, 3, 12, 7, "#7e859a"); p(3, 1, 8, 3, "#9aa1b5"); p(3, 1, 4, 1, "#c0c6d4"); p(1, 8, 12, 2, "#5f6577"); } };

  OBJ.fountain = { w: 48, h: 36, frames: 4, draw(p, f) {
    p(2, 12, 44, 22, "#8d94a9"); p(0, 14, 48, 18, "#8d94a9"); p(2, 12, 44, 2, "#b5bccc"); p(0, 30, 48, 4, "#666d82");
    p(4, 16, 40, 14, "#3d7fd1"); p(4, 16, 40, 2, "#2f66ad");
    const rip = [[8, 22], [30, 25], [18, 27], [36, 20]];
    rip.forEach(([x, y], i) => { const k = (f + i) % 4; p(x - k, y, 4 + k * 2, 1, "#9fd0ff"); });
    p(20, 6, 8, 14, "#9aa1b5"); p(20, 6, 8, 1, "#c0c6d4"); p(17, 4, 14, 3, "#8d94a9"); p(17, 4, 14, 1, "#c0c6d4");
    const drop = f % 2;
    p(23, 0, 2, 4, "#bfe3ff"); p(18 - drop, 2 + drop, 1, 3, "#9fd0ff"); p(29 + drop, 2 + drop, 1, 3, "#9fd0ff");
    p(15 - drop, 7 + drop, 1, 2, "#9fd0ff"); p(32 + drop, 7 + drop, 1, 2, "#9fd0ff");
  } };
  OBJ.bench = { w: 30, h: 14, draw(p) { p(0, 2, 30, 3, "#8c5d3d"); p(0, 2, 30, 1, "#b07a52"); p(0, 7, 30, 3, "#94643f"); p(0, 7, 30, 1, "#b07a52"); p(2, 10, 2, 4, "#2b2d42"); p(26, 10, 2, 4, "#2b2d42"); p(2, 5, 2, 2, "#2b2d42"); p(26, 5, 2, 2, "#2b2d42"); } };
  OBJ.lamppost = { w: 10, h: 36, draw(p) { p(4, 8, 2, 26, "#2b2d42"); p(2, 33, 6, 3, "#2b2d42"); p(1, 2, 8, 7, "#2b2d42"); p(2, 3, 6, 5, "#ffd98a"); p(3, 4, 2, 2, "#fff3d1"); p(3, 0, 4, 2, "#2b2d42"); } };
  OBJ.signpost = { w: 26, h: 28, draw(p) {
    p(11, 6, 4, 22, "#6b4428"); p(11, 6, 1, 22, "#8a5a3b");
    p(1, 2, 20, 7, "#a7714a"); p(1, 2, 20, 1, "#c48c5f"); p(21, 3, 3, 5, "#a7714a");
    p(5, 11, 20, 7, "#94643f"); p(5, 11, 20, 1, "#b07a52"); p(2, 12, 3, 5, "#94643f");
    p(4, 5, 12, 1, "#5e3b26"); p(9, 14, 12, 1, "#5e3b26");
  } };
  OBJ.noticeboard = { w: 32, h: 30, draw(p) {
    p(3, 14, 3, 16, "#5e3b26"); p(26, 14, 3, 16, "#5e3b26");
    p(0, 0, 32, 20, "#6b4428"); p(2, 2, 28, 16, "#c69a5b");
    p(4, 4, 8, 6, "#f2f0e6"); p(14, 3, 7, 8, "#ffe08a"); p(23, 5, 6, 6, "#9fe6d0"); p(6, 11, 10, 5, "#f2f0e6"); p(19, 12, 8, 4, "#ffb3c7");
    p.px(8, 4, "#ff6b6b"); p.px(17, 3, "#4ea8ff"); p.px(26, 5, "#ff6b6b"); p.px(10, 11, "#4ea8ff");
    p(5, 6, 6, 1, "#9aa1b5"); p(15, 6, 5, 1, "#b38a3c"); p(7, 13, 8, 1, "#9aa1b5");
  } };
  OBJ.zonesign = { w: 44, h: 22, draw(p, f, o) {
    p(5, 12, 3, 10, "#5e3b26"); p(36, 12, 3, 10, "#5e3b26");
    p(0, 0, 44, 14, "#6b4428"); p(1, 1, 42, 12, "#a7714a"); p(1, 1, 42, 1, "#c48c5f");
    const txt = o.text || ""; const tw = textWidth(txt);
    drawText(p.ctx, txt, Math.round(22 - tw / 2), 5, "#2a1a10");
  } };

  // ---- Sobre mim
  OBJ.deskpc = { w: 34, h: 28, frames: 4, draw(p, f, o) {
    p(0, 14, 34, 5, "#94643f"); p(0, 14, 34, 1, "#b07a52"); p(2, 19, 3, 9, "#6b4428"); p(29, 19, 3, 9, "#6b4428"); p(0, 18, 34, 1, "#6b4428");
    p(9, 0, 18, 13, "#222839"); p(10, 1, 16, 10, "#0f1426");
    const cols = ["#4fe3c1", "#f6c35b", "#ff7a8a", "#7cc4ff", "#b892ff"];
    for (let i = 0; i < 4; i++) { const row = (i + f) % 5; const w = [9, 6, 11, 7, 5][row]; p(11 + (row % 2), 2 + i * 2, w, 1, cols[row]); }
    if (f % 2) p(11 + 3, 9, 2, 1, "#ffffff");
    p(16, 11, 4, 3, "#323a52"); p(13, 13, 10, 1, "#323a52");
    p(10, 15, 12, 2, "#d6dde9"); p(10, 15, 12, 1, "#f1f5fb"); p(24, 15, 3, 2, "#d6dde9");
    p(2, 10, 5, 4, "#f2f0e6"); p(2, 10, 5, 1, "#ffffff"); p(7, 11, 1, 2, "#f2f0e6"); // caneca
    p(29, 9, 3, 5, "#5aa85a"); p(28, 7, 2, 3, "#78c06c"); p(31, 6, 2, 4, "#3f8a4c"); p(28, 12, 5, 2, "#c96f4a");
  } };
  OBJ.chair = { w: 14, h: 18, draw(p, f, o) { const c = o.color || "#33446e"; p(2, 0, 10, 9, c); p(2, 0, 10, 1, shade(c, 0.25)); p(1, 9, 12, 4, shade(c, -0.1)); p(6, 13, 2, 3, "#2b2d42"); p(2, 16, 10, 2, "#2b2d42"); } };
  OBJ.bookshelf = { w: 32, h: 38, draw(p, f, o) {
    const r = rng(o.seed || 7);
    p(0, 0, 32, 38, "#6b4428"); p(0, 0, 32, 2, "#8a5a3b"); p(2, 2, 28, 34, "#3e2718");
    const books = ["#c0392b", "#2f5d7c", "#e1a43a", "#3f8a4c", "#8e44ad", "#d35400", "#16a085", "#ecf0f1", "#4ea8ff"];
    for (let s = 0; s < 3; s++) {
      const y = 3 + s * 11; let x = 3;
      while (x < 28) { const w = 2 + ((r() * 3) | 0); const h = 7 + ((r() * 3) | 0); if (x + w > 29) break; const c = o.glow && s === 1 && x > 12 && x < 18 ? "#ffe08a" : books[(r() * books.length) | 0]; p(x, y + 9 - h, w, h, c); p(x, y + 9 - h, w, 1, shade(c, 0.3)); x += w + (r() < 0.15 ? 2 : 0); }
      p(2, y + 9, 28, 2, "#8a5a3b");
    }
  } };
  OBJ.corkboard = { w: 30, h: 13, draw(p) { p(0, 0, 30, 13, "#6b4428"); p(1, 1, 28, 11, "#c69a5b"); p(3, 2, 7, 6, "#f2f0e6"); p(12, 3, 6, 7, "#ffe08a"); p(20, 2, 7, 5, "#9fe6d0"); p(4, 8, 6, 3, "#ffb3c7"); p.px(6, 2, "#ff6b6b"); p.px(15, 3, "#4ea8ff"); p.px(23, 2, "#ff6b6b"); p(21, 8, 6, 1, "#5e3b26"); p(4, 4, 5, 1, "#9aa1b5"); } };
  OBJ.cabinet = { w: 20, h: 26, frames: 2, draw(p, f) {
    p(1, 8, 18, 18, "#8f9cb0"); p(1, 8, 18, 1, "#b9c6d8"); p(3, 11, 14, 6, "#7d899d"); p(3, 18, 14, 6, "#7d899d"); p(8, 13, 4, 1, "#d5deea"); p(8, 20, 4, 1, "#d5deea");
    p(0, 2, 20, 6, "#d6dde9"); p(0, 2, 20, 1, "#f1f5fb"); p(3, 4, 14, 2, "#323a52"); p.px(16, 3, f ? "#4fe3c1" : "#2f6e6a");
    p(5, 0 - (f ? 1 : 0), 10, 3 + (f ? 1 : 0), "#ffffff"); p(6, 1, 6, 1, "#9aa1b5");
  } };
  OBJ.photoframe = { w: 16, h: 13, draw(p) { p(0, 0, 16, 13, "#b8894a"); p(1, 1, 14, 11, "#5a8fd0"); p(1, 7, 14, 5, "#3f8a4c"); p.disc(8, 5, 2, "#c98f6b"); p(5, 8, 6, 4, "#24304f"); p(6, 2, 4, 2, "#2a1d17"); } };
  OBJ.sofa = { w: 38, h: 22, draw(p, f, o) { const c = o.color || "#2f5d7c"; p(0, 4, 38, 14, c); p(3, 0, 32, 8, shade(c, 0.12)); p(3, 0, 32, 1, shade(c, 0.3)); p(0, 4, 4, 14, shade(c, -0.15)); p(34, 4, 4, 14, shade(c, -0.15)); p(5, 9, 13, 6, shade(c, 0.18)); p(20, 9, 13, 6, shade(c, 0.18)); p(2, 18, 3, 4, "#2b2d42"); p(33, 18, 3, 4, "#2b2d42"); } };
  OBJ.plant = { w: 14, h: 24, draw(p, f, o) {
    p(3, 16, 8, 8, o.pot || "#c96f4a"); p(2, 16, 10, 2, shade(o.pot || "#c96f4a", 0.2)); p(3, 22, 8, 2, shade(o.pot || "#c96f4a", -0.2));
    p(6, 6, 2, 10, "#2f6b3f"); p.disc(4, 8, 3, "#3f8a4c"); p.disc(10, 6, 3, "#4b9658"); p.disc(7, 3, 3, "#3f8a4c"); p.disc(9, 11, 2, "#78c06c"); p.disc(4, 13, 2, "#4b9658");
  } };
  OBJ.lamp = { w: 10, h: 26, draw(p) { p(4, 8, 2, 16, "#2b2d42"); p(1, 23, 8, 3, "#2b2d42"); p(0, 0, 10, 8, "#f2d48a"); p(1, 0, 8, 1, "#fff3d1"); p(0, 7, 10, 1, "#c8a65c"); } };

  // ---- Habilidades
  OBJ.skillstation = { w: 28, h: 26, draw(p, f, o) {
    const c = o.color || "#4fe3c1";
    p(2, 12, 24, 14, "#5d6a82"); p(2, 12, 24, 2, "#8a97ad"); p(4, 16, 20, 8, "#4a556b"); p(2, 24, 24, 2, "#3a4357");
    p(5, 17, 6, 2, c); p(13, 17, 2, 2, "#ff6b6b"); p(17, 17, 2, 2, "#ffd166"); p(5, 21, 14, 1, "#2f3747");
    p(7, 6, 14, 7, "#1a2236"); p(8, 7, 12, 5, shade(c, -0.55)); p(8, 7, 12, 1, shade(c, -0.25));
    p(11, 2, 6, 4, "#8a97ad"); p(12, 1, 4, 1, c); p(13, 0, 2, 1, "#ffffff");
  } };
  OBJ.server = { w: 16, h: 34, frames: 4, draw(p, f) {
    p(0, 0, 16, 34, "#262c40"); p(0, 0, 16, 1, "#3b4566"); p(1, 32, 14, 2, "#161a26");
    for (let i = 0; i < 6; i++) { const y = 3 + i * 5; p(2, y, 12, 3, "#323a52"); p(2, y, 12, 1, "#3e4866"); const on = (i + f) % 3 === 0; p(3, y + 1, 1, 1, on ? "#4fe3c1" : "#1f5f55"); p(5, y + 1, 1, 1, (i + f) % 2 ? "#ffd166" : "#6b5a2a"); p(9, y + 1, 4, 1, "#1a1f2e"); }
  } };
  OBJ.bigscreen = { w: 46, h: 14, frames: 4, draw(p, f, o) {
    const c = o.color || "#4fe3c1";
    p(0, 0, 46, 14, "#161a26"); p(1, 1, 44, 12, "#0f1426");
    for (let i = 0; i < 6; i++) { const h = 2 + ((i * 3 + f * 2) % 7); p(4 + i * 6, 11 - h, 4, h, i % 2 ? c : shade(c, -0.3)); }
    p(40, 3, 3, 1, "#ff6b6b"); p(40, 5, 3, 1, "#ffd166"); p(40, 7, 3, 1, c);
    if (o.text) drawText(p.ctx, o.text, 3, 2, "#ffffff");
  } };
  OBJ.crate = { w: 14, h: 14, draw(p) { p(0, 0, 14, 14, "#a7714a"); p(0, 0, 14, 2, "#c48c5f"); p(0, 12, 14, 2, "#6b4428"); p(1, 6, 12, 2, "#6b4428"); p(6, 2, 2, 10, "#8a5a3b"); } };
  OBJ.cables = { w: 30, h: 6, draw(p) { p(0, 2, 30, 2, "#1a1f2e"); p(4, 1, 1, 4, "#1a1f2e"); p(18, 3, 12, 2, "#2a6e6a"); }, outline: false };

  // ---- Projetos
  OBJ.projectpod = { w: 26, h: 34, frames: 4, draw(p, f, o) {
    const c = o.color || "#4fe3c1";
    p(1, 0, 24, 34, "#2a3147"); p(1, 0, 24, 1, "#3e4866"); p(1, 0, 2, 34, "#323a52");
    p(3, 1, 20, 6, c); p(3, 1, 20, 1, shade(c, 0.35)); drawText(p.ctx, o.label || "", 13 - Math.round(textWidth(o.label || "") / 2), 2, "#0f1426");
    p(4, 9, 18, 13, "#0f1426"); p(5, 10, 16, 11, shade(c, -0.6));
    // mini "thumbnail" animado
    p(6, 11, 14, 3, shade(c, -0.3)); for (let i = 0; i < 3; i++) p(6 + i * 5, 15, 4, 4, i === f % 3 ? c : shade(c, -0.4));
    p(3, 23, 20, 4, "#3e4866"); p(6, 24, 3, 2, "#ff6b6b"); p(11, 24, 3, 2, "#ffd166"); p(16, 24, 3, 2, "#4ea8ff");
    p(3, 28, 20, 6, "#232a3d"); p(10, 30, 6, 1, "#4a556b");
  } };
  OBJ.coffee = { w: 16, h: 24, frames: 2, draw(p, f) { p(0, 10, 16, 14, "#5d6a82"); p(0, 10, 16, 1, "#8a97ad"); p(2, 0, 12, 11, "#2b2d42"); p(3, 1, 10, 4, "#4a556b"); p.px(4, 2, f ? "#ff6b6b" : "#4fe3c1"); p(6, 7, 4, 3, "#1a1f2e"); p(5, 14, 6, 6, "#f2f0e6"); p(5, 14, 6, 1, "#6b4428"); p(11, 15, 1, 3, "#f2f0e6"); } };
  OBJ.beanbag = { w: 20, h: 13, draw(p, f, o) { const c = o.color || "#ff7a8a"; p.disc(10, 7, 6, c); p(2, 6, 16, 7, c); p.disc(8, 5, 3, shade(c, 0.2)); p(2, 11, 16, 2, shade(c, -0.2)); } };

  // ---- Experiência
  OBJ.missiondesk = { w: 34, h: 26, frames: 2, draw(p, f, o) {
    p(0, 12, 34, 5, "#d6dde9"); p(0, 12, 34, 1, "#f1f5fb"); p(0, 16, 34, 1, "#9aa6bb"); p(2, 17, 2, 9, "#5b6280"); p(30, 17, 2, 9, "#5b6280");
    p(10, 4, 14, 8, "#2b2d42"); p(11, 5, 12, 6, "#2f5d7c"); p(12, 6, 6, 1, "#9fd0ff"); p(12, 8, 9, 1, "#9fd0ff"); p(8, 11, 18, 2, "#4a556b");
    p(2, 9, 6, 3, "#f2f0e6"); p(3, 8, 6, 3, "#ffffff");
    // bandeira da missão
    p(28, 0, 1, 12, "#5b6280"); p(29, 0, 5, 4, f ? "#ffd166" : "#f6c35b"); drawText(p.ctx, String(o.n || 1), 30, 0, "#2b2d42");
  } };
  OBJ.whiteboard = { w: 46, h: 14, draw(p, f, o) {
    p(0, 0, 46, 13, "#9aa6bb"); p(1, 1, 44, 11, "#f5f7fb"); p(3, 6, 40, 1, "#5b6280");
    const n = o.n || 3; for (let i = 0; i < n; i++) { const x = 5 + Math.round((i * 36) / Math.max(1, n - 1)); p(x - 1, 5, 3, 3, ["#ff6b6b", "#4ea8ff", "#3f8a4c", "#f6c35b"][i % 4]); }
    p(4, 2, 10, 1, "#4ea8ff"); p(30, 9, 12, 1, "#ff6b6b"); p(10, 12, 26, 1, "#5b6280");
  } };
  OBJ.watercooler = { w: 12, h: 26, draw(p) { p(2, 0, 8, 10, "#9fd0ff"); p(3, 1, 3, 7, "#cfe8ff"); p(1, 10, 10, 16, "#d6dde9"); p(1, 10, 10, 1, "#f1f5fb"); p(3, 13, 2, 2, "#4ea8ff"); p(7, 13, 2, 2, "#ff6b6b"); p(2, 24, 8, 2, "#9aa6bb"); } };

  // ---- Formação
  OBJ.lectern = { w: 20, h: 26, frames: 2, draw(p, f) {
    p(7, 12, 6, 12, "#6b4428"); p(4, 23, 12, 3, "#5e3b26");
    p(0, 6, 20, 7, "#8a5a3b"); p(0, 6, 20, 1, "#a7714a");
    p(2, 3, 7, 5, "#f5efe0"); p(11, 3, 7, 5, "#f5efe0"); p(9, 4, 2, 4, "#d1a35c"); p(3, 4, 5, 1, "#9a8f7a"); p(12, 5, 5, 1, "#9a8f7a");
    p(9, f ? 0 : 1, 2, 2, "#ffe08a");
  } };
  OBJ.globe = { w: 16, h: 24, frames: 4, draw(p, f) {
    p(7, 14, 2, 7, "#8a5a3b"); p(3, 21, 10, 3, "#6b4428");
    p.disc(8, 8, 6, "#3d7fd1"); const o = f * 2; p((2 + o) % 10 + 2, 5, 4, 3, "#3f8a4c"); p((6 + o) % 10 + 2, 9, 3, 3, "#3f8a4c"); p(5, 3, 2, 1, "#9fd0ff");
    p(1, 2, 1, 12, "#d1a35c"); p(1, 13, 8, 1, "#d1a35c");
  } };
  OBJ.diploma = { w: 20, h: 13, draw(p) { p(0, 0, 20, 13, "#b8894a"); p(1, 1, 18, 11, "#f5efe0"); p(4, 3, 12, 1, "#7d3f36"); p(5, 5, 10, 1, "#9a8f7a"); p(5, 7, 10, 1, "#9a8f7a"); p.disc(15, 9, 2, "#d1a35c"); } };
  OBJ.readtable = { w: 36, h: 20, draw(p) { p(0, 4, 36, 6, "#8a5a3b"); p(0, 4, 36, 1, "#a7714a"); p(2, 10, 3, 10, "#5e3b26"); p(31, 10, 3, 10, "#5e3b26"); p(6, 0, 8, 5, "#2f5d7c"); p(6, 0, 8, 1, "#4a7ca0"); p(20, 1, 9, 4, "#f5efe0"); p(24, 1, 1, 4, "#d1a35c"); } };
  OBJ.candle = { w: 6, h: 10, frames: 2, draw(p, f) { p(1, 4, 4, 6, "#f5efe0"); p(2, f ? 0 : 1, 2, 3, "#ffb347"); p.px(2, 2, "#fff3d1"); }, outline: false };

  // ---- Depoimentos
  OBJ.easel = { w: 24, h: 34, draw(p, f, o) {
    const c = o.color || "#b892ff";
    p(3, 14, 2, 20, "#6b4428"); p(19, 14, 2, 20, "#6b4428"); p(11, 18, 2, 14, "#5e3b26");
    p(0, 0, 24, 20, "#b8894a"); p(0, 0, 24, 1, "#e0b778"); p(2, 2, 20, 16, shade(c, -0.25));
    p(2, 2, 20, 8, shade(c, 0.1));
    p.disc(12, 8, 3, o.skin || "#e0b48f"); p(7, 12, 10, 6, c); p(9, 4, 6, 2, o.hair || "#3a2620");
    p(0, 19, 24, 2, "#8a5a3b");
  } };
  OBJ.painting = { w: 22, h: 13, draw(p, f, o) {
    const pal = [["#5a8fd0", "#3f8a4c", "#ffd166"], ["#ff9f6b", "#7d3f36", "#ffe08a"], ["#2f5d7c", "#9fd0ff", "#ecf0f1"]][o.v || 0];
    p(0, 0, 22, 13, "#b8894a"); p(1, 1, 20, 11, pal[0]); p(1, 7, 20, 5, pal[1]); p.disc(15, 4, 2, pal[2]); p(4, 5, 4, 2, pal[1]);
  } };
  OBJ.pedestal = { w: 14, h: 26, draw(p, f, o) { p(2, 10, 10, 16, "#ece6da"); p(2, 10, 10, 1, "#ffffff"); p(0, 8, 14, 3, "#d4ccbd"); p(0, 24, 14, 2, "#cfc7b6"); p.disc(7, 4, 4, o.color || "#4ea8ff"); p(5, 0, 2, 2, "#ffffff"); } };
  OBJ.rope = { w: 34, h: 12, draw(p) { p(1, 2, 2, 10, "#d1a35c"); p(31, 2, 2, 10, "#d1a35c"); p(0, 0, 4, 3, "#e0b778"); p(30, 0, 4, 3, "#e0b778"); for (let x = 3; x < 31; x++) p(x, 3 + Math.round(Math.sin((x - 3) / 28 * Math.PI) * 3), 1, 2, "#a33b4a"); } };

  // ---- Contato
  const ICONS = {
    phone: ["0011100", "0111110", "1100011", "1000001", "1000001", "1100011", "0111110", "0011100"].map((r) => r),
    mail: ["1111111", "1100011", "1010101", "1001001", "1000001", "1000001", "1111111", "0000000"],
    code: ["0000000", "0100010", "1000001", "1000001", "1000001", "0100010", "0000000", "0000000"],
    camera: ["0011100", "1111111", "1000001", "1011101", "1010101", "1011101", "1000001", "1111111"],
    form: ["1111110", "1000010", "1011010", "1000010", "1011010", "1000010", "1111110", "0000000"],
    doc: ["1111100", "1000110", "1011111", "1000001", "1011101", "1000001", "1011101", "1111111"],
    link: ["0001110", "0010001", "0100110", "0101010", "0110010", "1000100", "0111000", "0000000"],
  };
  function drawIcon(ctx, icon, x, y, color) {
    const g = ICONS[icon]; if (!g) return; ctx.fillStyle = color;
    g.forEach((row, j) => { for (let i = 0; i < row.length; i++) if (row[i] === "1") ctx.fillRect(x + i, y + j, 1, 1); });
  }
  OBJ.commterminal = { w: 24, h: 32, frames: 4, draw(p, f, o) {
    const c = o.color || "#ff9f43";
    p(2, 10, 20, 22, "#3a4152"); p(2, 10, 20, 1, "#59617a"); p(4, 26, 16, 6, "#2c313f");
    p(0, 0, 24, 14, "#2c313f"); p(1, 1, 22, 12, "#0f1426"); p(2, 2, 20, 10, shade(c, -0.55));
    drawIcon(p.ctx, o.icon || "phone", 8, 3, c);
    p(2, 11, 20, 1, f % 2 ? c : shade(c, -0.3));
    p(5, 16, 14, 7, "#2c313f"); for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) p(6 + i * 5, 17 + j * 3, 3, 2, (i + j + f) % 4 === 0 ? c : "#59617a");
  } };
  OBJ.antenna = { w: 26, h: 54, frames: 4, draw(p, f) {
    p(10, 6, 6, 44, "#59617a"); p(11, 6, 1, 44, "#8a97ad");
    for (let y = 10; y < 48; y += 8) { p(4, y, 18, 1, "#454c5f"); p(6, y + 4, 14, 1, "#454c5f"); }
    p(4, 48, 18, 6, "#2c313f"); p(4, 48, 18, 1, "#454c5f");
    p(12, 0, 2, 6, "#8a97ad"); p(11, 0, 4, 2, f < 2 ? "#ff4d4d" : "#7a2a2a");
    p.disc(5, 18, 3, "#d6dde9"); p(4, 17, 2, 2, "#9aa6bb");
  } };
  OBJ.mailbox = { w: 14, h: 24, draw(p) { p(6, 10, 2, 14, "#2b2d42"); p(0, 0, 14, 11, "#4ea8ff"); p(0, 0, 14, 2, "#7cc4ff"); p(2, 4, 10, 2, "#1a2236"); p(12, 2, 2, 5, "#ff6b6b"); } };
  OBJ.console = { w: 40, h: 22, frames: 4, draw(p, f) {
    p(0, 8, 40, 14, "#3a4152"); p(0, 8, 40, 2, "#59617a"); p(0, 20, 40, 2, "#2c313f");
    p(4, 0, 32, 9, "#2c313f"); p(5, 1, 30, 7, "#0f1426");
    for (let i = 0; i < 28; i += 2) { const h = 1 + Math.round(Math.abs(Math.sin((i + f * 3) / 3)) * 4); p(6 + i, 7 - h, 1, h, "#ff9f43"); }
    for (let i = 0; i < 6; i++) p(4 + i * 6, 12, 4, 3, (i + f) % 3 ? "#59617a" : "#ffd166");
    p(6, 17, 28, 2, "#2c313f");
  } };

  /** Sprite de objeto (com cache por tipo/frame/opções relevantes). */
  function object(type, frame = 0, opts = {}) {
    const def = OBJ[type];
    if (!def) throw new Error("Sprite inexistente: " + type);
    const frames = def.frames || 1;
    const f = frame % frames;
    const key = `obj|${type}|${f}|${opts.key || ""}`;
    return make(key, def.w, def.h, (p) => def.draw(p, f, opts), def.outline !== false);
  }
  function objectSize(type) { const d = OBJ[type]; return { w: d.w, h: d.h, frames: d.frames || 1 }; }

  window.Sprites = { T, THEMES, tile, object, objectSize, charFrame, robotFrame, drawText, textWidth, drawIcon, shade, rng, hash, make, canvas };
})();
