/* ==========================================================================
   map.js — Construção do mundo
   Gera o mapa (chão, paredes, caminhos, vegetação) e posiciona os objetos
   interativos de cada área a partir de portfolio-data.js.
   ========================================================================== */

(function () {
  "use strict";

  const T = 16;
  const W = 80;
  const H = 60;

  /* Áreas do portfólio (coordenadas em tiles, retângulo externo incluindo paredes) */
  const ZONES = [
    { id: "about",    n: 1, title: "Sobre Mim",              place: "Casa-escritório",          theme: "about",    x: 5,  y: 5,  w: 18, h: 14, door: { side: "bottom", at: 13 }, color: "#f6c35b", sign: "SOBRE MIM" },
    { id: "skills",   n: 2, title: "Habilidades",            place: "Laboratório tecnológico",  theme: "skills",   x: 28, y: 4,  w: 22, h: 15, door: { side: "bottom", at: 38 }, color: "#4ea8ff", sign: "LAB SKILLS" },
    { id: "projects", n: 3, title: "Projetos",               place: "Centro de desenvolvimento",theme: "projects", x: 55, y: 5,  w: 19, h: 16, door: { side: "bottom", at: 63 }, color: "#4fe3c1", sign: "PROJETOS" },
    { id: "exp",      n: 4, title: "Experiência",            place: "Escritório corporativo",   theme: "exp",      x: 4,  y: 26, w: 17, h: 16, door: { side: "right",  at: 33 }, color: "#ff9f6b", sign: "EXPERIENCIA" },
    { id: "edu",      n: 5, title: "Formação e Certificados",place: "Biblioteca",               theme: "edu",      x: 27, y: 42, w: 24, h: 14, door: { side: "top",    at: 38 }, color: "#d1a35c", sign: "BIBLIOTECA" },
    { id: "testi",    n: 6, title: "Depoimentos",            place: "Galeria de exposição",     theme: "testi",    x: 57, y: 26, w: 18, h: 14, door: { side: "left",   at: 32 }, color: "#b892ff", sign: "GALERIA" },
    { id: "contact",  n: 7, title: "Contato",                place: "Central de comunicação",   theme: "contact",  x: 57, y: 44, w: 18, h: 13, door: { side: "left",   at: 49 }, color: "#ff6b8b", sign: "CONTATO" },
  ];
  const PLAZA = { cx: 39, cy: 30, r: 6 };
  const SPAWN = { x: 39 * T + 8, y: 35 * T + 4 };

  const PATHS = [
    [13, 19, 14, 24], [13, 23, 64, 24], [35, 23, 36, 27],      // Sobre → estrada principal
    [38, 19, 39, 25],                                          // Habilidades
    [63, 21, 64, 24], [42, 23, 43, 27],                        // Projetos
    [21, 33, 34, 34],                                          // Experiência
    [38, 36, 39, 41],                                          // Formação
    [45, 32, 56, 33],                                          // Depoimentos
    [52, 32, 53, 50], [52, 49, 56, 50],                        // Contato
  ];

  const world = {
    T, W, H, ZONES, PLAZA, SPAWN,
    ground: new Array(W * H),
    solid: new Uint8Array(W * H),
    reserved: new Uint8Array(W * H),
    objects: [],
    lights: [],
    staticCanvas: null,
  };

  const idx = (x, y) => y * W + x;
  const inB = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
  function setG(x, y, name, variant = 0, theme = null) { if (inB(x, y)) world.ground[idx(x, y)] = { name, variant, theme }; }
  function getG(x, y) { return inB(x, y) ? world.ground[idx(x, y)] : null; }
  function setSolid(x, y, v = 1) { if (inB(x, y)) world.solid[idx(x, y)] = v; }
  function reserve(x0, y0, x1, y1) { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (inB(x, y)) world.reserved[idx(x, y)] = 1; }

  let uid = 0;
  /** Adiciona um objeto ao mundo. fw/fh = tamanho da base em tiles. */
  function addObject(o) {
    const size = o.type === "npc" ? { w: 16, h: o.npc === "robot" ? 20 : 24, frames: 2 } : Sprites.objectSize(o.type);
    const obj = Object.assign({ id: o.id || `${o.type}-${uid++}`, fw: 1, fh: 1, solid: true, interactive: false, wall: false, opts: {}, animSpeed: 4 }, o);
    obj.sw = size.w; obj.sh = size.h; obj.frames = size.frames;
    obj.x = obj.tx * T; obj.y = obj.ty * T;
    obj.sx = obj.x + Math.round((obj.fw * T - obj.sw) / 2);
    obj.sy = obj.y + obj.fh * T - obj.sh + (obj.lift || 0);
    obj.baseY = obj.y + obj.fh * T;
    obj.cx = obj.x + (obj.fw * T) / 2;
    obj.cy = obj.y + (obj.fh * T) / 2;
    obj.phase = Math.random() * 10;
    if (obj.solid && !obj.wall) for (let y = 0; y < obj.fh; y++) for (let x = 0; x < obj.fw; x++) setSolid(obj.tx + x, obj.ty + y, 1);
    if (obj.light) world.lights.push(Object.assign({ x: obj.cx, y: obj.y + (obj.light.dy || 0), obj }, obj.light));
    world.objects.push(obj);
    return obj;
  }

  /* --------------------------------------------------------- construção */
  function build(data) {
    world.objects.length = 0; world.lights.length = 0;
    world.solid.fill(0); world.reserved.fill(0);
    const r = Sprites.rng(20251112);

    // 1) grama + floresta nas bordas
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const v = r(); setG(x, y, "grass", v < 0.06 ? 1 : v < 0.1 ? 2 : v < 0.22 ? 3 : 0);
      if (x < 2 || y < 2 || x >= W - 2 || y >= H - 2) { setG(x, y, "forest", (r() * 3) | 0); setSolid(x, y); reserve(x, y, x, y); }
    }

    // 2) praça central
    for (let y = PLAZA.cy - PLAZA.r; y <= PLAZA.cy + PLAZA.r; y++) for (let x = PLAZA.cx - PLAZA.r; x <= PLAZA.cx + PLAZA.r; x++) {
      const dx = x - PLAZA.cx, dy = y - PLAZA.cy;
      if (dx * dx + dy * dy <= PLAZA.r * PLAZA.r + 2) { setG(x, y, "stone", (x * 3 + y) % 3); }
    }
    reserve(PLAZA.cx - PLAZA.r - 1, PLAZA.cy - PLAZA.r - 1, PLAZA.cx + PLAZA.r + 1, PLAZA.cy + PLAZA.r + 1);

    // 3) caminhos
    PATHS.forEach(([x0, y0, x1, y1]) => {
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const g = getG(x, y); if (g && g.name !== "stone") setG(x, y, "dirt", r() < 0.08 ? 1 : 0); }
      reserve(x0 - 1, y0 - 1, x1 + 1, y1 + 1);
    });

    // 4) prédios
    ZONES.forEach((z) => buildZone(z));

    // 5) objetos da praça
    buildPlaza(data);

    // 6) conteúdo de cada área
    buildAbout(data); buildSkills(data); buildProjects(data); buildExp(data); buildEdu(data); buildTesti(data); buildContact(data);

    // 7) vegetação
    buildNature(r);

    world.staticCanvas = renderStatic();
    return world;
  }

  function buildZone(z) {
    const th = z.theme;
    for (let y = z.y; y < z.y + z.h; y++) for (let x = z.x; x < z.x + z.w; x++) {
      const edge = x === z.x || x === z.x + z.w - 1 || y === z.y || y === z.y + z.h - 1;
      if (edge) { setG(x, y, "wallcap", 0, th); setSolid(x, y); }
      else if (y === z.y + 1) { setG(x, y, "wallface", ((x - z.x) % 5 === 2 && x > z.x + 1 && x < z.x + z.w - 2) ? 1 : 0, th); setSolid(x, y); }
      else { setG(x, y, "floor", (x * 7 + y * 13) % 17 === 0 ? 1 : (x * 3 + y * 5) % 23 === 0 ? 2 : 0, th); setSolid(x, y, 0); }
    }
    reserve(z.x - 1, z.y - 1, z.x + z.w, z.y + z.h);
    const d = z.door;
    const door = [];
    if (d.side === "bottom") door.push([d.at, z.y + z.h - 1], [d.at + 1, z.y + z.h - 1]);
    if (d.side === "top") door.push([d.at, z.y], [d.at + 1, z.y], [d.at, z.y + 1], [d.at + 1, z.y + 1]);
    if (d.side === "left") door.push([z.x, d.at], [z.x, d.at + 1]);
    if (d.side === "right") door.push([z.x + z.w - 1, d.at], [z.x + z.w - 1, d.at + 1]);
    door.forEach(([x, y]) => { setG(x, y, "mat", 0, th); setSolid(x, y, 0); });
    z.doorTiles = door;
    z.inner = { x0: z.x + 1, y0: z.y + 2, x1: z.x + z.w - 2, y1: z.y + z.h - 2 };
    // luzes de teto
    for (let y = z.inner.y0 + 2; y <= z.inner.y1; y += 5) for (let x = z.inner.x0 + 3; x <= z.inner.x1; x += 6)
      world.lights.push({ x: x * T + 8, y: y * T, r: 70, color: "rgba(255,240,210,1)", a: 0.55 });
    // placa da área
    const sx = d.side === "bottom" ? d.at + 3 : d.side === "top" ? d.at + 3 : d.side === "left" ? z.x - 3 : z.x + z.w + 1;
    const sy = d.side === "bottom" ? z.y + z.h + 1 : d.side === "top" ? z.y - 2 : d.at - 2;
    reserve(sx - 1, sy - 1, sx + 3, sy + 1);
    addObject({ id: `sign-${z.id}`, type: "zonesign", tx: sx, ty: sy, fw: 3, fh: 1, zone: null, interactive: true, opts: { text: z.sign, key: z.id },
      label: `Placa — ${z.title}`, prompt: "Ler placa", action: { kind: "zoneinfo", zone: z.id } });
  }

  /** Distribui itens em linhas centradas dentro de uma faixa. */
  function layout(count, x0, x1, y0, stepX, stepY, fw) {
    const perRow = Math.max(1, Math.floor((x1 - x0 + 1 + (stepX - fw)) / stepX));
    const out = [];
    for (let i = 0; i < count; i++) {
      const row = Math.floor(i / perRow);
      const inRow = Math.min(perRow, count - row * perRow);
      const span = inRow * stepX - (stepX - fw);
      const start = x0 + Math.floor((x1 - x0 + 1 - span) / 2);
      out.push({ tx: start + (i % perRow) * stepX, ty: y0 + row * stepY });
    }
    return out;
  }

  function buildPlaza(data) {
    addObject({ id: "fountain", type: "fountain", tx: 38, ty: 29, fw: 3, fh: 2, interactive: true, label: "Fonte da praça", prompt: "Observar",
      action: { kind: "dialog", lines: [{ who: "Sistema", text: "A fonte da praça marca o centro do mapa. Daqui partem os caminhos para as 7 áreas do portfólio." }] },
      light: { r: 46, color: "rgba(140,200,255,1)", a: 0.35, dy: 8 } });
    addObject({ id: "byte", type: "npc", npc: "robot", tx: 36, ty: 33, lift: -3, interactive: true, label: "Byte — assistente", prompt: "Conversar", action: { kind: "guide" },
      light: { r: 30, color: "rgba(79,227,193,1)", a: 0.35 } });
    addObject({ id: "signpost", type: "signpost", tx: 43, ty: 33, interactive: true, label: "Placa de direções", prompt: "Ver mapa", action: { kind: "map" } });
    addObject({ id: "noticeboard", type: "noticeboard", tx: 44, ty: 27, fw: 2, interactive: true, label: "Quadro de missões", prompt: "Ver missões", action: { kind: "quests" } });
    addObject({ type: "bench", tx: 33, ty: 28, fw: 2 }); addObject({ type: "bench", tx: 33, ty: 32, fw: 2 });
    [[34, 25], [44, 25], [34, 35], [44, 35]].forEach(([x, y]) => addObject({ type: "lamppost", tx: x, ty: y, light: { r: 64, color: "rgba(255,210,130,1)", a: 0.75, dy: 4 - 26, flicker: true } }));
    [[37, 26], [41, 26]].forEach(([x, y]) => addObject({ type: "plant", tx: x, ty: y, opts: { pot: "#8d94a9", key: "stone" } }));
  }

  function buildAbout(d) {
    const z = ZONES[0];
    addObject({ id: "about-pc", type: "deskpc", tx: 8, ty: 8, fw: 2, zone: z.id, interactive: true, label: "Computador — Apresentação", prompt: "Usar computador",
      action: { kind: "panel", panel: "about" }, light: { r: 40, color: "rgba(120,220,255,1)", a: 0.5, dy: 4 } });
    addObject({ id: "about-profile", type: "photoframe", tx: 12, ty: 6, wall: true, zone: z.id, interactive: true, label: "Quadro — Perfil", prompt: "Ver perfil", action: { kind: "panel", panel: "profile" } });
    addObject({ id: "about-goals", type: "corkboard", tx: 15, ty: 6, fw: 2, wall: true, zone: z.id, interactive: true, label: "Mural — Objetivos", prompt: "Ler mural", action: { kind: "panel", panel: "goals" } });
    addObject({ id: "about-trajectory", type: "bookshelf", tx: 19, ty: 7, fw: 2, zone: z.id, interactive: true, opts: { seed: 3, key: "a" }, label: "Estante — Trajetória", prompt: "Ler diário", action: { kind: "panel", panel: "trajectory" } });
    addObject({ id: "about-resume", type: "cabinet", tx: 6, ty: 12, zone: z.id, interactive: true, label: "Impressora — Currículo", prompt: "Pegar currículo", action: { kind: "panel", panel: "resume" } });
    addObject({ type: "sofa", tx: 8, ty: 15, fw: 2, opts: { color: "#7d3f36", key: "red" } });
    addObject({ type: "plant", tx: 6, ty: 7 }); addObject({ type: "plant", tx: 21, ty: 7 }); addObject({ type: "plant", tx: 21, ty: 16, opts: { pot: "#4ea8ff", key: "b" } });
    addObject({ type: "lamp", tx: 10, ty: 15, light: { r: 50, color: "rgba(255,220,150,1)", a: 0.6, dy: -10 } });
    world.rugs = (world.rugs || []).concat([{ x0: 11, y0: 10, x1: 17, y1: 13, v: 0 }]);
  }

  function buildSkills(d) {
    const z = ZONES[1];
    addObject({ id: "skills-overview", type: "bigscreen", tx: 37, ty: 5, fw: 3, wall: true, zone: z.id, interactive: true, opts: { color: "#4ea8ff", text: "SKILLS", key: "skills" },
      label: "Painel — Todas as habilidades", prompt: "Ver painel", action: { kind: "panel", panel: "skills" }, light: { r: 50, color: "rgba(80,160,255,1)", a: 0.5, dy: 8 } });
    const pos = layout(d.skills.length, z.inner.x0 + 1, z.inner.x1 - 1, 8, 4, 3, 2);
    d.skills.forEach((s, i) => {
      addObject({ id: `skill-${s.id}`, type: "skillstation", tx: pos[i].tx, ty: pos[i].ty, fw: 2, zone: z.id, interactive: true, opts: { color: s.color, key: s.id },
        holo: { text: s.icon || s.name.slice(0, 3), color: s.color }, label: `Estação — ${s.name}`, prompt: `Analisar ${s.name}`,
        action: { kind: "skill", id: s.id }, light: { r: 34, color: s.color, a: 0.55, dy: -6 } });
    });
    [7, 10, 13].forEach((y) => { addObject({ type: "server", tx: z.inner.x0, ty: y, animSpeed: 3 }); addObject({ type: "server", tx: z.inner.x1, ty: y, animSpeed: 3 }); });
    addObject({ type: "crate", tx: z.inner.x0, ty: z.inner.y1 }); addObject({ type: "crate", tx: z.inner.x1, ty: z.inner.y1 });
    addObject({ type: "plant", tx: z.inner.x0 + 2, ty: z.inner.y1, opts: { pot: "#5d6a82", key: "lab" } });
  }

  function buildProjects(d) {
    const z = ZONES[2];
    addObject({ id: "projects-overview", type: "bigscreen", tx: 62, ty: 6, fw: 3, wall: true, zone: z.id, interactive: true, opts: { color: "#4fe3c1", text: "GITHUB", key: "proj" },
      label: "Painel — Todos os projetos", prompt: "Ver painel", action: { kind: "panel", panel: "projects" }, light: { r: 50, color: "rgba(79,227,193,1)", a: 0.5, dy: 8 } });
    const colors = ["#4fe3c1", "#ff7a8a", "#f6c35b", "#7cc4ff", "#b892ff", "#ff9f43", "#5fd47a", "#ff6fb5"];
    const pos = layout(d.projects.length, z.inner.x0 + 1, z.inner.x1 - 1, 10, 4, 4, 2);
    d.projects.forEach((p, i) => {
      const c = colors[i % colors.length];
      addObject({ id: `project-${p.id}`, type: "projectpod", tx: pos[i].tx, ty: pos[i].ty, fw: 2, zone: z.id, interactive: true, opts: { color: c, label: "P" + (i + 1), key: p.id + c },
        label: `Terminal — ${p.name}`, prompt: "Abrir projeto", action: { kind: "project", id: p.id }, light: { r: 36, color: c, a: 0.55, dy: 0 } });
    });
    addObject({ type: "coffee", tx: z.inner.x0, ty: z.inner.y0, animSpeed: 1 });
    addObject({ type: "server", tx: z.inner.x1, ty: z.inner.y0 + 1, animSpeed: 3 }); addObject({ type: "server", tx: z.inner.x1, ty: z.inner.y0 + 3, animSpeed: 3 });
    addObject({ type: "beanbag", tx: z.inner.x0 + 1, ty: z.inner.y1 - 1, opts: { color: "#ff7a8a", key: "r" } });
    addObject({ type: "beanbag", tx: z.inner.x1 - 1, ty: z.inner.y1 - 1, opts: { color: "#4ea8ff", key: "b" } });
    addObject({ type: "plant", tx: z.inner.x0, ty: z.inner.y1, opts: { pot: "#323a52", key: "dev" } }); addObject({ type: "plant", tx: z.inner.x1, ty: z.inner.y1, opts: { pot: "#323a52", key: "dev" } });
  }

  function buildExp(d) {
    const z = ZONES[3];
    addObject({ id: "exp-overview", type: "whiteboard", tx: 10, ty: 27, fw: 3, wall: true, zone: z.id, interactive: true, opts: { n: Math.max(2, d.experience.length), key: "exp" + d.experience.length },
      label: "Quadro — Linha do tempo", prompt: "Ver linha do tempo", action: { kind: "panel", panel: "experience" } });
    const pos = layout(d.experience.length, z.inner.x0 + 1, z.inner.x1 - 1, 31, 5, 4, 2);
    d.experience.forEach((e, i) => {
      addObject({ id: `exp-${e.id}`, type: "missiondesk", tx: pos[i].tx, ty: pos[i].ty, fw: 2, zone: z.id, interactive: true, opts: { n: i + 1, key: "m" + i }, animSpeed: 2,
        label: `Missão ${i + 1} — ${e.role}`, prompt: "Ver missão", action: { kind: "experience", id: e.id }, light: { r: 30, color: "rgba(150,200,255,1)", a: 0.4, dy: 4 } });
    });
    addObject({ type: "watercooler", tx: z.inner.x0, ty: z.inner.y0 });
    addObject({ type: "plant", tx: z.inner.x1, ty: z.inner.y0 }); addObject({ type: "plant", tx: z.inner.x0, ty: z.inner.y1 });
    addObject({ type: "sofa", tx: 8, ty: z.inner.y1, fw: 2, opts: { color: "#5b6280", key: "grey" } });
    addObject({ type: "plant", tx: z.inner.x1, ty: z.inner.y1, opts: { pot: "#5b6280", key: "o" } });
    world.rugs = (world.rugs || []).concat([{ x0: z.inner.x0 + 1, y0: 30, x1: z.inner.x1 - 1, y1: 30 + Math.ceil(d.experience.length / 3) * 4, v: 1 }]);
  }

  function buildEdu(d) {
    const z = ZONES[4];
    addObject({ id: "edu-overview", type: "diploma", tx: 36, ty: 43, wall: true, zone: z.id, interactive: true, label: "Quadro — Formação acadêmica", prompt: "Ver formação", action: { kind: "panel", panel: "education" } });
    // estantes: cada curso/certificado fica numa estante iluminada (parede do fundo + laterais)
    const shelves = [[29, 44], [31, 44], [33, 44], [42, 44], [44, 44], [46, 44], [48, 44], [28, 50], [48, 50], [30, 50], [46, 50]];
    shelves.forEach(([x, y], i) => {
      const cert = d.certificates[i];
      if (cert) addObject({ id: `cert-${cert.id}`, type: "bookshelf", tx: x, ty: y, fw: 2, zone: z.id, interactive: true, opts: { seed: 20 + i, glow: true, key: "c" + i },
        label: `Estante — ${cert.name}`, prompt: "Ler certificado", action: { kind: "certificate", id: cert.id }, light: { r: 30, color: "rgba(255,224,138,1)", a: 0.5, dy: -8 } });
      else if (y === 44) addObject({ type: "bookshelf", tx: x, ty: y, fw: 2, opts: { seed: 20 + i, key: "d" + i } });
    });
    const items = d.education.length + (d.languages.length ? 1 : 0);
    const pos = layout(items, 33, 44, 47, 3, 3, 1).map((q) => (q.tx >= 37 && q.tx <= 40 ? { tx: q.tx < 39 ? 36 : 41, ty: q.ty } : q));
    d.education.forEach((e, i) => addObject({ id: `edu-${e.id}`, type: "lectern", tx: pos[i].tx, ty: pos[i].ty, zone: z.id, interactive: true, animSpeed: 2,
      label: `Livro — ${e.course}`, prompt: "Ler diploma", action: { kind: "education", id: e.id }, light: { r: 34, color: "rgba(255,224,138,1)", a: 0.6, dy: 0 } }));
    if (d.languages.length) { const p = pos[d.education.length]; addObject({ id: "edu-languages", type: "globe", tx: p.tx, ty: p.ty, zone: z.id, interactive: true, animSpeed: 2, label: "Globo — Idiomas", prompt: "Ver idiomas", action: { kind: "panel", panel: "languages" } }); }
    [33, 43].forEach((x) => { addObject({ type: "readtable", tx: x, ty: 53, fw: 2 }); addObject({ type: "candle", tx: x + 2, ty: 53, solid: true, animSpeed: 3, light: { r: 30, color: "rgba(255,180,90,1)", a: 0.6, flicker: true } }); });
    addObject({ type: "plant", tx: z.inner.x0, ty: z.inner.y1 }); addObject({ type: "plant", tx: z.inner.x1, ty: z.inner.y1 });
    world.rugs = (world.rugs || []).concat([{ x0: 37, y0: 44, x1: 40, y1: 54, v: 0 }]);
  }

  function buildTesti(d) {
    const z = ZONES[5];
    [60, 64, 68, 71].forEach((x, i) => addObject({ type: "painting", tx: x, ty: 27, fw: 2, wall: true, opts: { v: i % 3, key: "p" + i } }));
    const colors = ["#b892ff", "#4ea8ff", "#ff9f6b", "#5fd47a", "#ff6fb5", "#f6c35b"];
    const pos = layout(d.testimonials.length, z.inner.x0 + 2, z.inner.x1 - 1, 31, 5, 4, 2);
    d.testimonials.forEach((t, i) => addObject({ id: `testi-${t.id}`, type: "easel", tx: pos[i].tx, ty: pos[i].ty, fw: 2, zone: z.id, interactive: true, opts: { color: colors[i % colors.length], key: t.id },
      label: `Quadro — ${t.name}`, prompt: "Ler depoimento", action: { kind: "testimonial", id: t.id }, light: { r: 34, color: "rgba(255,240,220,1)", a: 0.5, dy: -10 } }));
    addObject({ type: "pedestal", tx: z.inner.x0 + 1, ty: z.inner.y0, opts: { color: "#4ea8ff", key: "b" } });
    addObject({ type: "pedestal", tx: z.inner.x1, ty: z.inner.y0, opts: { color: "#ff9f6b", key: "o" } });
    addObject({ type: "rope", tx: z.inner.x0 + 4, ty: z.inner.y1, fw: 2 }); addObject({ type: "rope", tx: z.inner.x1 - 4, ty: z.inner.y1, fw: 2 });
    addObject({ id: "visitor", type: "npc", npc: "visitor", tx: z.inner.x1 - 1, ty: 36, interactive: true, label: "Visitante da galeria", prompt: "Conversar",
      action: { kind: "dialog", lines: [{ who: "Visitante", text: "Cada quadro desta galeria guarda um depoimento sobre o Matheus. Chegue perto e aperte E para ler." }] } });
    world.rugs = (world.rugs || []).concat([{ x0: z.inner.x0, y0: 32, x1: z.inner.x0 + 1, y1: 33, v: 2 }]);
  }

  function buildContact(d) {
    const z = ZONES[6];
    const c = d.contact;
    const channels = [
      { id: "whatsapp", label: "WhatsApp", icon: "phone", color: "#5fd47a" },
      { id: "email", label: "E-mail", icon: "mail", color: "#4ea8ff" },
      { id: "github", label: "GitHub", icon: "code", color: "#d6dde9" },
      { id: "instagram", label: "Instagram", icon: "camera", color: "#ff6fb5" },
    ];
    if (!isPending(c.linkedin)) channels.push({ id: "linkedin", label: "LinkedIn", icon: "link", color: "#4ea8ff" });
    channels.push({ id: "resume", label: "Currículo", icon: "doc", color: "#f6c35b" });
    const pos = layout(channels.length, z.inner.x0 + 1, z.inner.x1 - 3, 48, 3, 4, 2);
    channels.forEach((ch, i) => addObject({ id: `contact-${ch.id}`, type: "commterminal", tx: pos[i].tx, ty: pos[i].ty, fw: 2, zone: z.id, interactive: true, opts: { icon: ch.icon, color: ch.color, key: ch.id },
      label: `Terminal — ${ch.label}`, prompt: `Abrir ${ch.label}`, action: { kind: "contact", id: ch.id }, light: { r: 32, color: ch.color, a: 0.5, dy: 0 } }));
    if (c.form && c.form.enabled) addObject({ id: "contact-form", type: "console", tx: z.inner.x0 + 2, ty: z.inner.y1 - 1, fw: 3, zone: z.id, interactive: true,
      label: "Rádio — Enviar mensagem", prompt: "Escrever mensagem", action: { kind: "panel", panel: "form" }, light: { r: 40, color: "rgba(255,159,67,1)", a: 0.5, dy: 0 } });
    addObject({ id: "contact-overview", type: "antenna", tx: z.inner.x1 - 1, ty: z.inner.y0 + 1, fw: 2, zone: z.id, interactive: true, animSpeed: 2,
      label: "Antena — Todos os contatos", prompt: "Ver contatos", action: { kind: "panel", panel: "contact" }, light: { r: 26, color: "rgba(255,77,77,1)", a: 0.6, dy: -36, blink: true } });
    addObject({ type: "mailbox", tx: z.inner.x0, ty: z.inner.y0 });
    addObject({ type: "plant", tx: z.inner.x0, ty: z.inner.y1, opts: { pot: "#454c5f", key: "c" } });
  }

  function buildNature(r) {
    const free = (x, y) => inB(x, y) && !world.reserved[idx(x, y)] && !world.solid[idx(x, y)];
    const tree = (x, y, kind) => {
      if (!free(x, y) || !free(x + 1, y)) return false;
      addObject({ type: kind, tx: x, ty: y, fw: 2, opts: { seed: x * 31 + y, autumn: r() < 0.12, key: `${x},${y}` } });
      reserve(x, y, x + 1, y);
      return true;
    };
    for (let x = 2; x < W - 3; x += 2) { tree(x, 2, r() < 0.3 ? "pine" : "tree"); tree(x + (r() < 0.5 ? 1 : 0), H - 3, r() < 0.3 ? "pine" : "tree"); }
    for (let y = 4; y < H - 4; y += 2) { tree(2, y, r() < 0.3 ? "pine" : "tree"); tree(W - 4, y, r() < 0.3 ? "pine" : "tree"); }
    // espalhadas
    let placed = 0;
    for (let i = 0; i < 900 && placed < 70; i++) {
      const x = 3 + ((r() * (W - 7)) | 0), y = 3 + ((r() * (H - 7)) | 0);
      let ok = true;
      for (let yy = y - 1; yy <= y + 1 && ok; yy++) for (let xx = x - 1; xx <= x + 2; xx++) if (!free(xx, yy)) { ok = false; break; }
      if (!ok) continue;
      const roll = r();
      if (roll < 0.55) { if (tree(x, y, r() < 0.35 ? "pine" : "tree")) placed++; }
      else if (roll < 0.85) { addObject({ type: "bush", tx: x, ty: y, opts: { berries: r() < 0.4, key: r() < 0.4 ? "b" : "" } }); reserve(x, y, x, y); placed++; }
      else { addObject({ type: "rock", tx: x, ty: y }); reserve(x, y, x, y); placed++; }
    }
  }

  /* ------------------------------------------------------ camada estática */
  function renderStatic() {
    const c = Sprites.canvas(W * T, H * T);
    const ctx = c.getContext("2d");
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const g = world.ground[idx(x, y)];
      ctx.drawImage(Sprites.tile(g.name, g.variant, g.theme), x * T, y * T);
    }
    // tapetes
    (world.rugs || []).forEach((rg) => {
      for (let y = rg.y0; y <= rg.y1; y++) for (let x = rg.x0; x <= rg.x1; x++) ctx.drawImage(Sprites.tile("rug", rg.v), x * T, y * T);
      ctx.strokeStyle = "rgba(255,230,180,0.55)"; ctx.lineWidth = 1;
      ctx.strokeRect(rg.x0 * T + 2.5, rg.y0 * T + 2.5, (rg.x1 - rg.x0 + 1) * T - 5, (rg.y1 - rg.y0 + 1) * T - 5);
    });
    // bordas grama/terra/pedra (autotile simples)
    const fringe = (x, y) => {
      const g = world.ground[idx(x, y)];
      if (g.name !== "dirt" && g.name !== "stone") return;
      const isGrass = (xx, yy) => inB(xx, yy) && world.ground[idx(xx, yy)].name === "grass";
      const col = "#4a8a52", col2 = "#3f7847";
      const r = Sprites.rng(x * 999 + y);
      if (isGrass(x, y - 1)) for (let i = 0; i < T; i++) { const h = 1 + ((r() * 2.2) | 0); ctx.fillStyle = col; ctx.fillRect(x * T + i, y * T, 1, h); if (h > 1) { ctx.fillStyle = col2; ctx.fillRect(x * T + i, y * T + h, 1, 1); } }
      if (isGrass(x, y + 1)) for (let i = 0; i < T; i++) { const h = 1 + ((r() * 2.2) | 0); ctx.fillStyle = col; ctx.fillRect(x * T + i, y * T + T - h, 1, h); }
      if (isGrass(x - 1, y)) for (let i = 0; i < T; i++) { const w = 1 + ((r() * 2.2) | 0); ctx.fillStyle = col; ctx.fillRect(x * T, y * T + i, w, 1); }
      if (isGrass(x + 1, y)) for (let i = 0; i < T; i++) { const w = 1 + ((r() * 2.2) | 0); ctx.fillStyle = col; ctx.fillRect(x * T + T - w, y * T + i, w, 1); }
    };
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) fringe(x, y);
    // sombra projetada pelas paredes no chão interno
    ZONES.forEach((z) => {
      ctx.fillStyle = "rgba(10,8,20,0.28)";
      ctx.fillRect(z.inner.x0 * T, z.inner.y0 * T, (z.inner.x1 - z.inner.x0 + 1) * T, 4);
      ctx.fillStyle = "rgba(10,8,20,0.16)";
      ctx.fillRect(z.inner.x0 * T, z.inner.y0 * T, 3, (z.inner.y1 - z.inner.y0 + 1) * T);
      // sombra externa do prédio
      ctx.fillStyle = "rgba(10,8,20,0.25)";
      ctx.fillRect(z.x * T + 4, (z.y + z.h) * T, z.w * T - 4, 5);
      ctx.fillRect((z.x + z.w) * T, z.y * T + 6, 4, z.h * T - 2);
    });
    // borda da floresta
    ctx.fillStyle = "rgba(8,16,10,0.35)";
    ctx.fillRect(2 * T, 2 * T, (W - 4) * T, 3); ctx.fillRect(2 * T, 2 * T, 3, (H - 4) * T);
    return c;
  }

  /* ----------------------------------------------------------- consultas */
  world.build = build;
  world.isSolidTile = (tx, ty) => !inB(tx, ty) || world.solid[idx(tx, ty)] === 1;
  world.rectHitsSolid = function (x, y, w, h) {
    const x0 = Math.floor(x / T), y0 = Math.floor(y / T), x1 = Math.floor((x + w - 0.01) / T), y1 = Math.floor((y + h - 0.01) / T);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (world.isSolidTile(tx, ty)) return true;
    return false;
  };
  world.zoneAt = function (px, py) {
    const tx = Math.floor(px / T), ty = Math.floor(py / T);
    for (const z of ZONES) if (tx >= z.inner.x0 && tx <= z.inner.x1 && ty >= z.inner.y0 && ty <= z.inner.y1) return z;
    return null;
  };
  world.zone = (id) => ZONES.find((z) => z.id === id);
  /** Ponto em frente à porta, usado na viagem rápida. */
  world.zoneEntry = function (id) {
    const z = world.zone(id); const d = z.door;
    if (d.side === "bottom") return { x: (d.at + 1) * T, y: (z.y + z.h - 2) * T + 10, dir: "up" };
    if (d.side === "top") return { x: (d.at + 1) * T, y: (z.y + 2) * T + 12, dir: "down" };
    if (d.side === "left") return { x: (z.x + 1) * T + 10, y: (d.at + 1) * T + 4, dir: "right" };
    return { x: (z.x + z.w - 2) * T + 6, y: (d.at + 1) * T + 4, dir: "left" };
  };

  window.WorldMap = world;
})();
