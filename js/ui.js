/* ==========================================================================
   ui.js — Interface: HUD, diálogos RPG, janelas de conteúdo, pausa,
   missões, conquistas, mapa/navegação acessível e portfólio tradicional.
   ========================================================================== */

(function () {
  "use strict";

  const $ = (s, r = document) => r.querySelector(s);
  const D = () => window.PORTFOLIO;
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const isTouch = () => window.matchMedia("(pointer: coarse)").matches || "ontouchstart" in window;

  /* --------------------------------------------------------------- ícones */
  const ICON = {
    map: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M1.5 3.2 5.2 1.6l5.6 2 3.7-1.6v11.2l-3.7 1.6-5.6-2-3.7 1.6z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M5.2 1.6v11.2M10.8 3.6v11.2" stroke="currentColor" stroke-width="1.5"/></svg>',
    quest: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 1.5h8.5l1.5 1.5v11.5H3z" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M5.5 5.5h5M5.5 8h5M5.5 10.5h3" stroke="currentColor" stroke-width="1.5"/></svg>',
    sound: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 6h3l4-3.5v11L5 10H2z" fill="currentColor"/><path d="M11 5.5c1.2 1.4 1.2 3.6 0 5M12.8 3.6c2.2 2.4 2.2 6.4 0 8.8" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
    mute: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 6h3l4-3.5v11L5 10H2z" fill="currentColor"/><path d="m11 5.5 4 5M15 5.5l-4 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    gear: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="2.4" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M8 1v2.2M8 12.8V15M1 8h2.2M12.8 8H15M3 3l1.6 1.6M11.4 11.4 13 13M13 3l-1.6 1.6M4.6 11.4 3 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    pause: '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="3.5" y="2.5" width="3" height="11" fill="currentColor"/><rect x="9.5" y="2.5" width="3" height="11" fill="currentColor"/></svg>',
    book: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3.5C6.5 2.4 4.2 2 1.5 2.2v10.5c2.7-.2 5 .2 6.5 1.3 1.5-1.1 3.8-1.5 6.5-1.3V2.2C11.8 2 9.5 2.4 8 3.5zM8 3.5v10.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>',
    ext: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M9 2h5v5M14 2 7.5 8.5M12 9.5V14H2V4h4.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    down: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2v8.5M4.5 7 8 10.5 11.5 7M2.5 14h11" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  };

  /* ------------------------------------------------------ blocos de HTML */
  function pend(label) { return `<span class="pending" title="Conteúdo a preencher a partir do index.html original">⚠ ${esc(label || "Pendente — preencher com o conteúdo original")}</span>`; }
  function val(v, label) { return isPending(v) ? pend(label) : esc(v); }
  function para(list, label) {
    const items = (list || []).filter((x) => !isPending(x));
    if (!items.length) return `<p>${pend(label)}</p>`;
    return items.map((p) => `<p>${esc(p)}</p>`).join("");
  }
  function linkBtn(url, label, opts = {}) {
    if (isPending(url)) return `<span class="btn btn-disabled" aria-disabled="true">${esc(label)} <small>— link pendente</small></span>`;
    const dl = opts.download ? (typeof opts.download === "string" ? ` download="${esc(opts.download)}"` : " download") : "";
    const ext = /^https?:/.test(url) ? ' target="_blank" rel="noopener noreferrer"' : "";
    return `<a class="btn ${opts.primary ? "btn-primary" : ""}" href="${esc(url)}"${ext}${dl} data-track="${esc(opts.track || "")}">${opts.icon ? ICON[opts.icon] : ""}<span>${esc(label)}</span></a>`;
  }
  function tags(list) {
    const real = (list || []).filter((t) => !isPending(t));
    const pendings = (list || []).filter((t) => isPending(t));
    if (!real.length && !pendings.length) return pend("Tecnologias pendentes");
    return `<ul class="tags">${real.map((t) => `<li>${esc(t)}</li>`).join("")}${pendings.map((t) => `<li class="tag-pending">${esc(t)}</li>`).join("")}</ul>`;
  }
  function chip(text, color) { return `<span class="chip" style="--c:${esc(color)}">${esc(text)}</span>`; }

  function whatsappUrl() {
    const w = D().contact.whatsapp;
    if (!w || isPending(w.number)) return null;
    return `https://wa.me/${String(w.number).replace(/\D/g, "")}${w.message ? "?text=" + encodeURIComponent(w.message) : ""}`;
  }
  function channels() {
    const c = D().contact;
    const list = [
      { id: "whatsapp", label: "WhatsApp", url: whatsappUrl(), detail: c.whatsapp && !isPending(c.whatsapp.number) ? c.whatsapp.display || "+" + c.whatsapp.number : null, color: "#5fd47a", note: "Conversa direta pelo WhatsApp." },
      { id: "email", label: "E-mail", url: isPending(c.email) ? null : "mailto:" + c.email, detail: c.email, color: "#4ea8ff", note: "Para propostas, orçamentos e oportunidades." },
      { id: "github", label: "GitHub", url: c.github, detail: c.github ? c.github.replace(/^https?:\/\//, "") : null, color: "#d6dde9", note: "Repositórios e código-fonte." },
      { id: "instagram", label: "Instagram", url: c.instagram && c.instagram.url, detail: c.instagram && c.instagram.handle, color: "#ff6fb5", note: "Bastidores e novidades." },
    ];
    if (!isPending(c.linkedin)) list.push({ id: "linkedin", label: "LinkedIn", url: c.linkedin, detail: c.linkedin.replace(/^https?:\/\/(www\.)?/, ""), color: "#4ea8ff", note: "Perfil profissional." });
    list.push({ id: "resume", label: "Currículo", url: D().resume.url, detail: D().resume.url ? "PDF" : null, color: "#f6c35b", note: "Versão completa do currículo.", download: D().resume.fileName || true });
    return list;
  }

  /* ----------------------------------------------- construtores de conteúdo */
  const C = {
    codeCard() {
      const p = D().profile, s = D().skills;
      const stack = ["python", "javascript", "sqlite", "figma"].map((id) => s.find((x) => x.id === id)).filter(Boolean).map((x) => `<span class="tk-s">"${esc(x.name)}"</span>`).join(", ");
      const nproj = (p.stats.find((x) => /projeto/i.test(x.label)) || {}).value || "";
      return `<div class="code-window" aria-label="Apresentação em formato de código"><div class="code-window__bar"><i></i><i></i><i></i><span>matheus.js</span></div><pre><code><span class="tk-k">const</span> <span class="tk-v">matheus</span> = {
  <span class="tk-p">nome</span>: <span class="tk-s">"${esc(p.name)}"</span>,
  <span class="tk-p">cargo</span>: [<span class="tk-s">"Full Stack"</span>, <span class="tk-s">"UI Designer"</span>],
  <span class="tk-p">local</span>: <span class="tk-s">"Cajamar, SP"</span>,
  <span class="tk-p">stack</span>: [${stack}],
  <span class="tk-p">projetos</span>: <span class="tk-n">${esc(nproj.replace("+", ""))}</span>,
  <span class="tk-p">disponivel</span>: <span class="tk-k">${p.available ? "true" : "false"}</span>,
};

<span class="tk-c">// Bora construir algo juntos?</span>
<span class="tk-v">matheus</span>.<span class="tk-p">criar</span>(<span class="tk-s">"seu próximo projeto"</span>); <span class="caret"></span></code></pre></div>`;
    },
    stats() { return `<div class="stats">${D().profile.stats.map((x) => `<div><strong>${esc(x.value)}</strong><span>${esc(x.label)}</span></div>`).join("")}</div>`; },
    about() {
      const p = D().profile;
      return `
        <p class="lead">${esc(p.headline)}</p>
        <p>${esc(p.intro)}</p>
        ${p.codeCard ? C.codeCard() : ""}
        <h3>${esc(p.aboutTitle)}</h3>
        ${para(p.about, "Texto da seção Sobre pendente")}
        <div class="chips">${(p.chips || []).map((c) => `<span class="chip-soft">${esc(c)}</span>`).join("")}</div>
        ${C.stats()}
        <dl class="facts">
          <div><dt>Área</dt><dd>${val(p.role)}</dd></div>
          <div><dt>Formação</dt><dd>${val(p.education)}</dd></div>
          <div><dt>Localização</dt><dd>${val(p.location)}</dd></div>
        </dl>
        <div class="actions">${linkBtn(D().resume.url, "Baixar currículo", { icon: "down", download: D().resume.fileName || true, primary: true })}<button class="btn" data-open="contact">Fale comigo</button><button class="btn" data-open="trajectory">Trajetória</button></div>`;
    },
    profile() {
      const p = D().profile;
      const photo = isPending(p.photo) ? `<div class="sheet-avatar"><canvas data-avatar width="18" height="26"></canvas></div>` : `<div class="sheet-avatar"><img src="${esc(p.photo)}" alt="Foto de ${esc(p.name)}" onerror="this.replaceWith(Object.assign(document.createElement('canvas'),{width:18,height:26,className:'avatar-fallback'}));UI.drawAvatar(document.querySelector('.avatar-fallback'))"></div>`;
      return `<div class="sheet">${photo}<dl class="sheet-stats">
          <div><dt>Nome</dt><dd>${esc(p.name)}</dd></div>
          <div><dt>Classe</dt><dd>${val(p.role)}</dd></div>
          <div><dt>Guilda</dt><dd>${val(p.education)}</dd></div>
          <div><dt>Base</dt><dd>${val(p.location)}</dd></div>
          <div><dt>Especialidade</dt><dd>${esc(p.headline)}</dd></div>
          <div><dt>Status</dt><dd>${p.available ? "Disponível para projetos e vagas" : "—"}</dd></div>
        </dl></div>
        <h3>Atributos</h3>${tags(D().skills.map((s) => s.name))}
        ${D().languages.length ? `<h3>Idiomas</h3>${tags(D().languages.map((l) => `${l.name} — ${l.level}`))}` : ""}
        ${C.stats()}`;
    },
    trajectory() { return `<h3>Trajetória</h3>${para(D().profile.trajectory, "Trajetória pendente — copiar do index.html original")}`; },
    goals() { return `<h3>Objetivos</h3>${para(D().profile.goals, "Objetivos pendentes — copiar do index.html original")}`; },
    resume() {
      const r = D().resume;
      if (isPending(r.url)) return `<p>${pend("PDF do currículo pendente: adicione o arquivo em assets/ e informe o caminho em resume.url")}</p><p>Enquanto isso, todas as informações estão no <button class="linklike" data-classic>portfólio tradicional</button>.</p>`;
      return `<p>${esc(r.label)}</p><p class="muted">Sobre, habilidades técnicas, experiência, formação, certificações, projetos e idiomas em uma página.</p><div class="actions">${linkBtn(r.url, "Abrir currículo", { icon: "ext", primary: true })}${linkBtn(r.url, "Baixar PDF", { icon: "down", download: r.fileName || true })}</div>`;
    },
    skillCard(s, big) {
      const area = (D().skillAreas || []).find((a) => a.id === s.area);
      const projs = D().projects.filter((p) => (p.technologies || []).some((t) => t.toLowerCase() === s.name.toLowerCase()));
      return `<article class="card skill-card ${big ? "big" : ""}" style="--c:${esc(s.color)}">
        <div class="skill-icon">${esc(s.icon || s.name.slice(0, 2))}</div>
        <div><h3>${esc(s.name)}</h3><p class="muted">${val(s.category, "Categoria pendente")}</p>
        ${area ? (big ? `<p><strong>${esc(area.title)}</strong> — ${esc(area.description)}</p>` : `<p class="muted small">${esc(area.title)}</p>`) : !isPending(s.description) ? `<p>${esc(s.description)}</p>` : ""}
        ${big && projs.length ? `<p class="muted">Usada em: ${projs.map((p) => esc(p.name)).join(", ")}</p>` : ""}</div></article>`;
    },
    areas() { return `<div class="grid areas">${(D().skillAreas || []).map((a) => `<article class="card"><h3>${esc(a.title)}</h3><p>${esc(a.description)}</p><p class="tk-line">${esc(a.tech)}</p></article>`).join("")}</div>`; },
    skills() { return `<p class="lead">Do design à automação, com cuidado em cada etapa.</p>${C.areas()}<h3>Tecnologias e ferramentas</h3><div class="grid">${D().skills.map((s) => C.skillCard(s)).join("")}</div>`; },
    skill(id) { return C.skillCard(D().skills.find((s) => s.id === id), true); },
    projectCard(p, big) {
      const img = !isPending(p.image) ? `<img class="proj-img" src="${esc(p.image)}" alt="${esc(p.imageAlt || "Imagem do projeto " + p.name)}" loading="lazy" onerror="this.remove()">` : (big ? `<div class="proj-img placeholder" aria-hidden="true"><span>Sem imagem cadastrada</span></div>` : "");
      return `<article class="card project-card">${img}
        ${p.tag ? `<p class="tile-tag">${esc(p.tag)}</p>` : ""}<h3>${val(p.name)}</h3>
        <p>${val(p.description, "Descrição pendente")}</p>
        ${p.note ? `<p>${pend(p.note.replace(/^⚠\s*/, ""))}</p>` : ""}
        <h4>Tecnologias</h4>${tags(p.technologies)}
        <div class="actions">${linkBtn(p.repo, "Repositório GitHub", { icon: "ext", primary: true })}${!isPending(p.demo) ? linkBtn(p.demo, "Ver site", { icon: "ext" }) : ""}</div>
        ${p.source ? `<p class="muted small">Fonte: ${esc(p.source)}</p>` : ""}
      </article>`;
    },
    projects() { return `<p class="lead">Projetos acadêmicos e independentes, tudo direto do meu GitHub.</p><div class="stack">${D().projects.map((p) => C.projectCard(p)).join("")}</div>${C.repos()}`; },
    repos() {
      if (!D().autoRepos) return `<div class="actions">${linkBtn(D().githubProfile, "Ver perfil completo", { icon: "ext" })}</div>`;
      return `<div class="repos-head"><h3>Mais no GitHub</h3>${linkBtn(D().githubProfile, "Ver perfil completo", { icon: "ext" })}</div><div class="repos" data-repos><p class="muted">Carregando repositórios…</p></div>`;
    },
    project(id) { return C.projectCard(D().projects.find((p) => p.id === id), true); },
    expItem(e, i) {
      return `<li class="tl-item"><span class="tl-dot">${i + 1}</span><div class="card">
        <p class="tl-period">${isPending(e.period) ? pend("Período pendente") : esc(e.period)}</p>
        <h3>${val(e.role)}</h3><p class="muted">${isPending(e.company) ? (isPending(e.role) ? "" : pend("Empresa/local pendente")) : esc(e.company)}</p>
        ${isPending(e.description) ? "" : `<p>${esc(e.description)}</p>`}
        ${(e.tasks || []).filter((t) => !isPending(t)).length ? `<ul class="list">${e.tasks.filter((t) => !isPending(t)).map((t) => `<li>${esc(t)}</li>`).join("")}</ul>` : ""}
      </div></li>`;
    },
    experience() { return `<ol class="timeline">${D().experience.map((e, i) => C.expItem(e, i)).join("")}</ol>`; },
    experienceItem(id) { const i = D().experience.findIndex((e) => e.id === id); return `<ol class="timeline">${C.expItem(D().experience[i], i)}</ol>`; },
    eduCard(e) {
      return `<article class="card"><p class="tl-period">${isPending(e.period) ? pend("Período pendente") : esc(e.period)} ${e.status ? chip(e.status, "#4fe3c1") : ""}</p>
        <h3>${esc(e.course)}</h3><p class="muted">${esc(e.institution)}</p>${isPending(e.description) ? "" : `<p>${esc(e.description)}</p>`}</article>`;
    },
    certCard(c) {
      return `<article class="card"><h3>${val(c.name)}</h3>
        <p class="muted">${isPending(c.issuer) ? (isPending(c.name) ? "" : pend("Instituição pendente")) : esc(c.issuer)}${!isPending(c.date) ? " · " + esc(c.date) : ""}</p>
        ${c.description ? `<p>${val(c.description)}</p>` : ""}
        ${c.url !== undefined && !isPending(c.name) ? `<div class="actions">${linkBtn(c.url, "Ver certificado", { icon: "ext" })}</div>` : ""}</article>`;
    },
    education() {
      const d = D();
      return `<h3>Formação acadêmica</h3><div class="stack">${d.education.map(C.eduCard).join("")}</div>
        ${d.languages.length ? `<h3>Idiomas</h3>${tags(d.languages.map((l) => `${l.name} — ${l.level}`))}` : ""}
        <h3>Cursos e certificados</h3><div class="stack">${d.certificates.map(C.certCard).join("")}</div>`;
    },
    educationItem(id) { return C.eduCard(D().education.find((e) => e.id === id)); },
    certificate(id) { return C.certCard(D().certificates.find((c) => c.id === id)); },
    languages() { return `<ul class="list">${D().languages.map((l) => `<li><strong>${esc(l.name)}</strong> — nível ${esc(l.level)}</li>`).join("")}</ul>`; },
    testiCard(t) {
      const flag = "";
      return `<figure class="card quote">${flag}<blockquote>${isPending(t.text) ? pend("Texto do depoimento pendente — copiar do index.html original") : "“" + esc(t.text) + "”"}</blockquote>
        <figcaption>${!isPending(t.photo) ? `<img src="${esc(t.photo)}" alt="" loading="lazy">` : ""}<span><strong>${esc(t.name)}</strong><br><span class="muted">${isPending(t.role) ? pend("Cargo/relação pendente") : esc(t.role)}</span></span></figcaption></figure>`;
    },
    testimonials() { return `<p class="lead">Quem já trabalhou comigo.</p><div class="stack">${D().testimonials.map(C.testiCard).join("")}</div>`; },
    testimonial(id) { return C.testiCard(D().testimonials.find((t) => t.id === id)); },
    channelRow(ch) {
      return `<li class="channel" style="--c:${ch.color}"><div><strong>${esc(ch.label)}</strong><br><span class="muted">${ch.detail ? esc(ch.detail) : pend(ch.id === "whatsapp" ? "Número pendente" : "Pendente")}</span></div>
        ${linkBtn(ch.url, ch.id === "resume" ? "Baixar" : "Abrir", { icon: ch.id === "resume" ? "down" : "ext", download: ch.download, track: "contact-" + ch.id })}</li>`;
    },
    contact() { return `<p class="lead">${esc(D().contact.intro || "")}</p><ul class="channels">${channels().map(C.channelRow).join("")}</ul>${D().contact.form && D().contact.form.enabled ? `<h3>Ou mande uma mensagem por aqui</h3>${C.form()}` : ""}`; },
    channel(id) {
      const ch = channels().find((c) => c.id === id);
      return `<div class="channel-hero" style="--c:${ch.color}"><p>${esc(ch.note)}</p><p class="big">${ch.detail ? esc(ch.detail) : pend(ch.id === "whatsapp" ? "Número de WhatsApp pendente" : "Link pendente")}</p>
        <div class="actions">${linkBtn(ch.url, ch.id === "resume" ? "Baixar currículo" : "Abrir " + ch.label, { icon: ch.id === "resume" ? "down" : "ext", primary: true, download: ch.download })}</div></div>
        <h3>Outros canais</h3><ul class="channels">${channels().filter((c) => c.id !== id).map(C.channelRow).join("")}</ul>`;
    },
    form() {
      const uid = Math.random().toString(36).slice(2, 7);
      return `<form class="contact-form" novalidate>
        <label for="f-name-${uid}">Nome</label><input id="f-name-${uid}" name="name" required autocomplete="name">
        <label for="f-mail-${uid}">E-mail</label><input id="f-mail-${uid}" name="email" type="email" required autocomplete="email">
        <label for="f-msg-${uid}">Mensagem</label><textarea id="f-msg-${uid}" name="message" rows="4" required></textarea>
        <button class="btn btn-primary" type="submit">Enviar mensagem</button>
        <p class="form-status" role="status"></p></form>`;
    },
  };

  /* metadados de cada janela */
  const META = {
    about: { t: "Apresentação", z: "about" }, profile: { t: "Ficha do personagem", z: "about" }, trajectory: { t: "Trajetória", z: "about" },
    goals: { t: "Objetivos", z: "about" }, resume: { t: "Currículo", z: "about" },
    skills: { t: "Arsenal técnico", z: "skills" }, skill: { t: "Habilidade", z: "skills" },
    projects: { t: "Projetos", z: "projects" }, project: { t: "Projeto", z: "projects" },
    experience: { t: "Linha do tempo", z: "exp" }, experienceItem: { t: "Missão", z: "exp" },
    education: { t: "Formação e certificados", z: "edu" }, educationItem: { t: "Formação", z: "edu" }, certificate: { t: "Certificado", z: "edu" }, languages: { t: "Idiomas", z: "edu" },
    testimonials: { t: "Depoimentos", z: "testi" }, testimonial: { t: "Depoimento", z: "testi" },
    contact: { t: "Central de contato", z: "contact" }, channel: { t: "Contato", z: "contact" }, form: { t: "Enviar mensagem", z: "contact" },
  };

  /* ================================================================= UI */
  const UI = {
    modalStack: [], dialogState: null, menuOpen: true, classicOpen: false,

    init() {
      this.hud = $("#hud"); this.prompt = $("#prompt"); this.hint = $("#hint");
      this.modal = $("#modal"); this.modalBody = $("#modal .modal-body"); this.modalTitle = $("#modal-title"); this.modalBadge = $("#modal .modal-badge");
      this.dlg = $("#dialog"); this.toasts = $("#toasts"); this.banner = $("#zone-banner"); this.fadeEl = $("#fade");
      $("#modal .modal-close").addEventListener("click", () => this.closeModal());
      this.modal.addEventListener("mousedown", (e) => { if (e.target === this.modal) this.closeModal(); });
      this.modal.addEventListener("click", (e) => this.handleModalClick(e));
      this.modal.addEventListener("submit", (e) => this.handleForm(e));
      this.dlg.addEventListener("click", () => this.advanceDialog());

      // HUD
      const acts = $("#hud-actions");
      acts.innerHTML = [
        ["map", "Mapa e navegação (M)", "map"], ["quest", "Missões e conquistas (Q)", "quests"], ["sound", "Ativar/desativar áudio", "audio"],
        ["gear", "Configurações", "settings"], ["pause", "Pausa (ESC)", "pause"],
      ].map(([i, l, a]) => `<button class="hud-btn" data-hud="${a}" aria-label="${l}" title="${l}">${ICON[i]}</button>`).join("");
      acts.addEventListener("click", (e) => {
        const b = e.target.closest("[data-hud]"); if (!b) return;
        GameAudio.play("select");
        ({ map: () => this.openMap(), quests: () => this.openQuests(), audio: () => this.toggleAudio(), settings: () => this.openSettings(), pause: () => this.openPause() })[b.dataset.hud]();
      });
      $("#minimap-btn").addEventListener("click", () => this.openMap());
      $("#hud-name").textContent = D().profile.shortName.toUpperCase();
      $("#hud-role").textContent = D().profile.role;
      this.drawAvatar($("#hud-avatar"));
      $("#area-pips").innerHTML = WorldMap.ZONES.map((z) => `<span class="pip" data-zone="${z.id}" style="--c:${z.color}" title="Área ${z.n} — ${z.title}">${z.n}</span>`).join("");

      // toque
      Input.bindJoystick($("#joy-base"), $("#joy-knob"));
      $("#touch-e").addEventListener("pointerdown", (e) => { e.preventDefault(); this.actionKey(); });
      $("#touch-pause").addEventListener("click", () => this.openPause());

      State.on((type, p) => {
        if (type === "achievement") { this.toast(`<b>Conquista desbloqueada</b><span>${esc(p.title)}</span>`, p.badge, "ach"); GameAudio.play("achievement"); }
        if (type === "quest") { this.toast(`<b>Missão concluída</b><span>${esc(p.title)}</span>`, "✓", "quest"); GameAudio.play("quest"); }
        this.updateHud();
      });
      Game.onZoneEnter = (z, silent) => this.enterZone(z, silent);
      Game.onTargetChange = (o) => this.setPrompt(o);
      this.buildMinimap();
      this.updateHud();
      setInterval(() => this.drawMinimap(), 120);
      this.renderClassic();
    },

    /* ----------------------------------------------- estado de bloqueio */
    isBlocking() { return this.menuOpen || this.classicOpen || !!this.dialogState || this.modalStack.length > 0; },
    sync() {
      const block = this.isBlocking();
      Game.paused = block;
      if (block) Input.clear();
      const playing = !this.menuOpen && !this.classicOpen;
      this.hud.hidden = !playing;
      const touchMode = State.data.settings.touch;
      $("#touch").hidden = !(playing && !this.modalStack.length && (touchMode === "always" || (touchMode === "auto" && isTouch())));
      document.body.classList.toggle("is-playing", playing);
    },

    /* ----------------------------------------------------------- HUD */
    updateHud() {
      const pct = Math.round(State.progress() * 100);
      $("#progress-fill").style.width = pct + "%";
      $("#progress-label").textContent = `Exploração ${pct}%`;
      $("#progress-bar").setAttribute("aria-valuenow", pct);
      document.querySelectorAll("#area-pips .pip").forEach((p) => p.classList.toggle("on", State.hasVisited(p.dataset.zone)));
      const q = QUESTS.find((x) => !State.data.questsDone.includes(x.id));
      $("#quest-tracker").innerHTML = q ? `<span class="qt-label">Missão</span><strong>${esc(q.title)}</strong><span>${esc(q.desc)}${q.count ? " · " + q.count(State.data) : ""}</span>` : `<span class="qt-label">Missões</span><strong>Todas concluídas!</strong><span>Obrigado por explorar.</span>`;
      const mute = !State.data.settings.sfx && !State.data.settings.music;
      const ab = document.querySelector('[data-hud="audio"]'); if (ab) { ab.innerHTML = mute ? ICON.mute : ICON.sound; ab.setAttribute("aria-pressed", String(!mute)); }
    },
    setPrompt(o) {
      if (!o) { this.prompt.classList.remove("show"); return; }
      const key = isTouch() && State.data.settings.touch !== "never" ? "Toque em E" : "E";
      this.prompt.innerHTML = `<kbd>${key}</kbd> ${esc(o.prompt || "Interagir")} <span class="muted">· ${esc(o.label || "")}</span>`;
      this.prompt.classList.add("show");
    },
    showHint(text) { this.hint.innerHTML = text; this.hint.classList.add("show"); },
    hideHint() { this.hint.classList.remove("show"); },
    enterZone(z, silent) {
      if (!z) return;
      const first = State.markVisited(z.id);
      if (silent && !first) return;
      this.banner.style.setProperty("--c", z.color);
      this.banner.innerHTML = `<span>Área ${z.n}</span><strong>${esc(z.title)}</strong><em>${esc(z.place)}</em>`;
      this.banner.classList.remove("show"); void this.banner.offsetWidth; this.banner.classList.add("show");
      clearTimeout(this._bt); this._bt = setTimeout(() => this.banner.classList.remove("show"), 2600);
      GameAudio.play("zone");
      document.body.classList.remove("zone-flash"); void document.body.offsetWidth; document.body.classList.add("zone-flash");
    },
    toast(html, badge, kind) {
      const el = document.createElement("div");
      el.className = "toast " + (kind || "");
      el.innerHTML = `<span class="toast-badge">${esc(badge || "!")}</span><div>${html}</div>`;
      this.toasts.appendChild(el);
      while (this.toasts.children.length > 3) this.toasts.firstElementChild.remove();
      setTimeout(() => el.classList.add("out"), 3600);
      setTimeout(() => el.remove(), 4200);
    },
    drawAvatar(cv, scale) {
      if (!cv) return;
      const spr = Sprites.charFrame(Object.assign({ id: "player" }, D().profile.avatar), "down", 0, false);
      const g = cv.getContext("2d"); cv.width = spr.width; cv.height = spr.height; g.clearRect(0, 0, cv.width, cv.height); g.drawImage(spr, 0, 0);
    },

    /* ------------------------------------------------------- minimapa */
    buildMinimap() {
      const W = WorldMap.W * 16, H = WorldMap.H * 16, s = 0.125;
      const c = Sprites.canvas(Math.round(W * s), Math.round(H * s)); const g = c.getContext("2d");
      g.imageSmoothingEnabled = true; g.drawImage(WorldMap.staticCanvas, 0, 0, c.width, c.height);
      g.fillStyle = "rgba(10,10,30,0.25)"; g.fillRect(0, 0, c.width, c.height);
      this.miniBase = c; this.miniScale = s;
      const mm = $("#minimap"); mm.width = c.width; mm.height = c.height;
    },
    drawMinimap(target, big) {
      const cv = target || $("#minimap"); if (!cv || !this.miniBase) return;
      if (!target && this.hud.hidden) return;
      const g = cv.getContext("2d"); const s = cv.width / (WorldMap.W * 16);
      g.drawImage(this.miniBase, 0, 0, cv.width, cv.height);
      WorldMap.ZONES.forEach((z) => {
        const v = State.hasVisited(z.id);
        g.fillStyle = v ? z.color + "55" : "rgba(10,10,30,0.55)"; g.strokeStyle = v ? z.color : "rgba(255,255,255,0.35)"; g.lineWidth = big ? 2 : 1;
        g.fillRect(z.x * 16 * s, z.y * 16 * s, z.w * 16 * s, z.h * 16 * s); g.strokeRect(z.x * 16 * s + 0.5, z.y * 16 * s + 0.5, z.w * 16 * s - 1, z.h * 16 * s - 1);
        g.fillStyle = "#fff"; g.font = `bold ${big ? 11 : 9}px "Pixelify Sans", monospace`; g.textAlign = "center"; g.textBaseline = "middle";
        g.fillText(big ? `${z.n} · ${z.title.split(" ")[0]}` : (v ? String(z.n) : "?"), (z.x + z.w / 2) * 16 * s, (z.y + z.h / 2) * 16 * s);
      });
      const p = Game.player, on = Math.floor(performance.now() / 400) % 2;
      g.fillStyle = on ? "#ffffff" : "#4fe3c1"; const r = big ? 5 : 2.5;
      g.beginPath(); g.arc(p.x * s, p.y * s, r, 0, Math.PI * 2); g.fill();
      g.strokeStyle = "#17121f"; g.lineWidth = 1; g.stroke();
    },

    /* --------------------------------------------------------- diálogo */
    dialog(lines, onDone) {
      if (!lines || !lines.length) return onDone && onDone();
      this.dialogState = { lines, i: 0, onDone, typed: 0, full: false };
      this.dlg.hidden = false;
      this.sync();
      this.showLine();
    },
    showLine() {
      const st = this.dialogState; const line = st.lines[st.i];
      $(".dlg-name", this.dlg).textContent = line.who || "";
      this.drawPortrait(line.who);
      const el = $(".dlg-text", this.dlg);
      clearInterval(st.timer);
      if (State.data.settings.reduceMotion) { el.textContent = line.text; st.full = true; return; }
      st.full = false; st.typed = 0; el.textContent = "";
      st.timer = setInterval(() => {
        st.typed += 2; el.textContent = line.text.slice(0, st.typed);
        if (st.typed % 4 === 0) GameAudio.play("type");
        if (st.typed >= line.text.length) { clearInterval(st.timer); st.full = true; }
      }, 22);
    },
    advanceDialog() {
      const st = this.dialogState; if (!st) return;
      if (!st.full) { clearInterval(st.timer); $(".dlg-text", this.dlg).textContent = st.lines[st.i].text; st.full = true; return; }
      st.i++;
      if (st.i < st.lines.length) { GameAudio.play("select"); this.showLine(); return; }
      clearInterval(st.timer);
      this.dialogState = null; this.dlg.hidden = true;
      this.sync();
      if (st.onDone) st.onDone();
    },
    drawPortrait(who) {
      const cv = $(".portrait", this.dlg), g = cv.getContext("2d");
      g.clearRect(0, 0, cv.width, cv.height);
      let spr;
      if (who === "Byte") spr = Sprites.robotFrame(0);
      else if (who === "Visitante") spr = Sprites.charFrame({ id: "visitor", hair: "#d9a441", hairLight: "#f0c46a", skin: "#e8b894", skinShade: "#c99472", hoodie: "#6d3a4f", hoodieLight: "#8a4c66", accent: "#ffd166", pants: "#2c3044", shoes: "#3a2620" }, "down", 0, false);
      else if (Game.target && Game.target.type !== "npc") spr = Sprites.object(Game.target.type, 0, Game.target.opts);
      else spr = Sprites.robotFrame(0);
      const s = Math.max(1, Math.floor(Math.min(cv.width / spr.width, cv.height / spr.height)));
      g.imageSmoothingEnabled = false;
      g.drawImage(spr, Math.round((cv.width - spr.width * s) / 2), Math.round((cv.height - spr.height * s) / 2), spr.width * s, spr.height * s);
    },
    guideDialog() {
      const next = WorldMap.ZONES.find((z) => !State.hasVisited(z.id));
      const lines = [];
      if (!State.data.tutorialDone) {
        lines.push(
          { who: "Byte", text: `Olá, visitante! Eu sou o Byte, assistente deste mundo. Aqui você conhece o portfólio de ${D().profile.name}.` },
          { who: "Byte", text: isTouch() ? "Use o joystick no canto da tela para andar e o botão E para interagir com objetos e pessoas." : "Ande com W A S D ou com as setas. Aperte E para interagir com objetos e pessoas." },
          { who: "Byte", text: "Objetos com um ! amarelo ainda não foram explorados. Cada área visitada desbloqueia uma conquista." },
          { who: "Byte", text: "M abre o mapa com viagem rápida e a lista de todo o conteúdo. ESC abre a pausa, onde também fica o Portfólio Tradicional." },
          { who: "Byte", text: "São 7 áreas ao redor desta praça. Boa exploração!" },
        );
      } else if (next) {
        const dirs = { about: "a noroeste", skills: "ao norte", projects: "a nordeste", exp: "a oeste", edu: "ao sul", testi: "a leste", contact: "a sudeste" };
        lines.push({ who: "Byte", text: `Sugestão de próxima parada: Área ${next.n} — ${next.title}, ${dirs[next.id]} da praça.` }, { who: "Byte", text: "Se preferir, aperte M e use a viagem rápida." });
      } else {
        lines.push({ who: "Byte", text: "Você visitou todas as áreas! Se quiser falar com o Matheus, a Central de Contato fica a sudeste." });
      }
      this.dialog(lines, () => { if (!State.data.tutorialDone) { State.data.tutorialDone = true; State.save(); } });
    },

    /* ----------------------------------------------------------- modais */
    openModal(opts) {
      if (this.dialogState) { clearInterval(this.dialogState.timer); this.dialogState = null; this.dlg.hidden = true; }
      if (opts.replace) this.modalStack.pop();
      this.modalStack.push(opts);
      this.renderModal();
      GameAudio.play("open");
      this.sync();
    },
    renderModal() {
      const o = this.modalStack[this.modalStack.length - 1];
      this.modal.hidden = false;
      this.modal.style.setProperty("--c", o.color || "#4fe3c1");
      this.modal.className = "modal " + (o.cls || "");
      this.modalTitle.textContent = o.title;
      this.modalBadge.textContent = o.badge || "";
      this.modalBadge.hidden = !o.badge;
      this.modalBody.innerHTML = typeof o.body === "function" ? o.body() : o.body;
      this.modalBody.scrollTop = 0;
      this.modalBody.querySelectorAll("canvas[data-avatar]").forEach((c) => this.drawAvatar(c));
      this.loadRepos(this.modalBody);
      if (o.after) o.after(this.modalBody);
      const back = $("#modal .modal-back");
      back.hidden = this.modalStack.length < 2;
      back.onclick = () => this.closeModal();
      const focusable = this.modalBody.querySelector("[autofocus]") || $("#modal .modal-close");
      setTimeout(() => focusable.focus({ preventScroll: true }), 30);
    },
    closeModal(all) {
      if (!this.modalStack.length) return;
      const o = all ? null : this.modalStack.pop();
      if (all) this.modalStack.length = 0;
      if (o && o.onClose) o.onClose();
      GameAudio.play("close");
      if (this.modalStack.length) this.renderModal();
      else { this.modal.hidden = true; $("#game").focus({ preventScroll: true }); }
      this.sync();
    },
    handleModalClick(e) {
      const t = e.target.closest("[data-open],[data-goto],[data-classic],[data-action],a[data-track]");
      if (!t) return;
      if (t.matches("a[data-track]")) { const id = t.dataset.track; if (id) State.markSeen(id); return; }
      if (t.dataset.open) { GameAudio.play("select"); this.openContent(t.dataset.open, t.dataset.id); }
      if (t.dataset.goto) { GameAudio.play("select"); this.travel(t.dataset.goto); }
      if (t.hasAttribute("data-classic")) this.openClassic();
      if (t.dataset.action) this.modalAction(t.dataset.action, t);
    },
    /** Abre uma janela de conteúdo (do jogo ou da navegação acessível). */
    openContent(key, id) {
      const m = META[key] || { t: key, z: "about" };
      const z = WorldMap.zone(m.z);
      let title = m.t;
      const d = D();
      if (key === "skill") title = d.skills.find((s) => s.id === id).name;
      if (key === "project") title = d.projects.find((p) => p.id === id).name.replace(/^⚠\s*/, "");
      if (key === "experienceItem") title = "Missão " + (d.experience.findIndex((e) => e.id === id) + 1);
      if (key === "channel") title = (channels().find((c) => c.id === id) || {}).label || "Contato";
      this.openModal({ title, badge: `Área ${z.n}`, color: z.color, body: () => (id ? C[key](id) : C[key]()), cls: "content" });
    },
    openFromObject(o) {
      State.markSeen(o.id);
      const a = o.action;
      const map = { panel: [a.panel], skill: ["skill", a.id], project: ["project", a.id], experience: ["experienceItem", a.id], education: ["educationItem", a.id], certificate: ["certificate", a.id], testimonial: ["testimonial", a.id], contact: ["channel", a.id] };
      const args = map[a.kind];
      if (args) this.openContent(args[0], args[1]);
    },
    handleForm(e) {
      const form = e.target.closest(".contact-form"); if (!form) return;
      e.preventDefault();
      const st = $(".form-status", form);
      const name = form.name.value.trim(), email = form.email.value.trim(), message = form.message.value.trim();
      if (!name || !/^\S+@\S+\.\S+$/.test(email) || !message) { st.textContent = "Preencha nome, um e-mail válido e a mensagem."; st.className = "form-status err"; return; }
      State.markSeen("contact-form");
      const cfg = D().contact.form || {};
      if (cfg.formEndpoint) {
        st.textContent = "Enviando…"; st.className = "form-status";
        fetch(cfg.formEndpoint, { method: "POST", headers: { Accept: "application/json" }, body: new FormData(form) })
          .then((r) => { if (!r.ok) throw new Error(); st.textContent = "Mensagem enviada! Obrigado pelo contato."; st.className = "form-status ok"; form.reset(); })
          .catch(() => { st.textContent = "Não foi possível enviar agora. Tente pelo e-mail ou WhatsApp."; st.className = "form-status err"; });
        return;
      }
      const subject = encodeURIComponent(`Contato pelo portfólio — ${name}`);
      const body = encodeURIComponent(`${message}\n\n${name}\n${email}`);
      window.location.href = `mailto:${D().contact.email}?subject=${subject}&body=${body}`;
      st.textContent = "Abrindo seu aplicativo de e-mail com a mensagem pronta…"; st.className = "form-status ok";
    },

    /** Lista "Mais no GitHub" carregada da API pública do GitHub (como no site original). */
    loadRepos(root) {
      const boxes = root.querySelectorAll("[data-repos]"); if (!boxes.length) return;
      const featured = D().projects.map((p) => (p.repo || "").toLowerCase());
      const render = (list) => boxes.forEach((b) => {
        if (!list) { b.innerHTML = `<p class="muted">Não foi possível carregar os repositórios agora. ${linkBtn(D().githubProfile, "Abrir o GitHub", { icon: "ext" })}</p>`; return; }
        const items = list.filter((r) => !r.fork && !featured.includes(r.html_url.toLowerCase())).slice(0, 9);
        b.innerHTML = items.length ? items.map((r) => `<a class="repo" href="${esc(r.html_url)}" target="_blank" rel="noopener noreferrer"><strong>${esc(r.name)}</strong><span>${esc(r.description || "Sem descrição")}</span><small>${esc(r.language || "")}${r.stargazers_count ? " · ★ " + r.stargazers_count : ""}</small></a>`).join("") : `<p class="muted">Nenhum outro repositório público.</p>`;
      });
      if (this._repos !== undefined) return render(this._repos);
      if (!this._reposP) {
        this._reposP = fetch(`https://api.github.com/users/${encodeURIComponent(D().githubUser)}/repos?sort=updated&per_page=30`)
          .then((r) => (r.ok ? r.json() : null)).catch(() => null).then((j) => (this._repos = Array.isArray(j) ? j : null));
      }
      this._reposP.then(render);
    },

    /* ------------------------------------------------ janelas do sistema */
    openPause() {
      if (this.menuOpen || this.classicOpen) return;
      this.openModal({ title: "Pausa", color: "#4fe3c1", cls: "pause", body: `
        <nav class="pause-menu">
          <button class="btn btn-primary" data-action="resume" autofocus>Continuar</button>
          <button class="btn" data-action="map">${ICON.map}<span>Mapa e navegação</span></button>
          <button class="btn" data-action="quests">${ICON.quest}<span>Missões e conquistas</span></button>
          <button class="btn" data-action="controls">Controles</button>
          <button class="btn" data-action="settings">${ICON.gear}<span>Configurações</span></button>
          <button class="btn" data-classic>${ICON.book}<span>Portfólio tradicional</span></button>
          <button class="btn" data-action="menu">Voltar ao menu inicial</button>
        </nav>` });
    },
    modalAction(a) {
      GameAudio.play("select");
      if (a === "resume") return this.closeModal(true);
      if (a === "map") return this.openMap();
      if (a === "quests") return this.openQuests();
      if (a === "controls") return this.openControls();
      if (a === "settings") return this.openSettings();
      if (a === "menu") { this.closeModal(true); return Main.showMenu(); }
      if (a === "reset") {
        const b = this.modalBody.querySelector('[data-action="reset"]');
        if (!b.dataset.armed) { b.dataset.armed = "1"; b.textContent = "Clique de novo para confirmar"; return; }
        State.reset(); Game.teleport(WorldMap.SPAWN.x, WorldMap.SPAWN.y, "up"); Game.currentZone = undefined; this.updateHud();
        b.textContent = "Progresso zerado"; return;
      }
    },
    openControls() {
      this.openModal({ title: "Controles", color: "#f6c35b", body: `
        <table class="keys"><tbody>
          <tr><td><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> ou <kbd>↑</kbd><kbd>←</kbd><kbd>↓</kbd><kbd>→</kbd></td><td>Andar</td></tr>
          <tr><td><kbd>E</kbd> / <kbd>Enter</kbd></td><td>Interagir · avançar diálogo</td></tr>
          <tr><td><kbd>ESC</kbd></td><td>Pausa · fechar janelas</td></tr>
          <tr><td><kbd>M</kbd></td><td>Mapa, viagem rápida e índice de conteúdo</td></tr>
          <tr><td><kbd>Q</kbd></td><td>Missões e conquistas</td></tr>
        </tbody></table>
        <h3>No celular e tablet</h3>
        <p>Arraste o <strong>joystick</strong> no canto inferior esquerdo para andar e toque no botão <strong>E</strong> para interagir. O botão de pausa fica ao lado.</p>
        <h3>Sem jogar</h3>
        <p>Tudo o que existe no mapa também está no <button class="linklike" data-action="map">índice do mapa</button> e no <button class="linklike" data-classic>portfólio tradicional</button>.</p>` });
    },
    openSettings() {
      const s = State.data.settings;
      this.openModal({ title: "Configurações", color: "#b892ff", body: `
        <form class="settings" onsubmit="return false">
          <label class="toggle"><input type="checkbox" name="sfx" ${s.sfx ? "checked" : ""}><span>Efeitos sonoros</span></label>
          <label class="toggle"><input type="checkbox" name="music" ${s.music ? "checked" : ""}><span>Música</span></label>
          <label class="range"><span>Volume</span><input type="range" name="volume" min="0" max="1" step="0.05" value="${s.volume}"></label>
          <label class="toggle"><input type="checkbox" name="reduceMotion" ${s.reduceMotion ? "checked" : ""}><span>Reduzir movimento e animações</span></label>
          <label class="select"><span>Controles de toque</span><select name="touch">
            <option value="auto" ${s.touch === "auto" ? "selected" : ""}>Automático</option>
            <option value="always" ${s.touch === "always" ? "selected" : ""}>Sempre mostrar</option>
            <option value="never" ${s.touch === "never" ? "selected" : ""}>Nunca mostrar</option></select></label>
          <button type="button" class="btn btn-danger" data-action="reset">Zerar progresso salvo</button>
          <p class="muted">O progresso fica salvo apenas neste navegador.</p>
        </form>`,
        after: (root) => root.querySelector("form").addEventListener("change", (e) => {
          const f = e.currentTarget; const st = State.data.settings;
          st.sfx = f.sfx.checked; st.music = f.music.checked; st.reduceMotion = f.reduceMotion.checked; st.touch = f.touch.value; st.volume = parseFloat(f.volume.value);
          Main.applySettings(); State.save(); this.updateHud();
        }),
      });
    },
    toggleAudio() {
      const s = State.data.settings; const on = !(s.sfx || s.music);
      s.sfx = on; s.music = on; Main.applySettings(); State.save(); this.updateHud();
      this.toast(`<b>Áudio ${on ? "ativado" : "desativado"}</b><span>Ajuste fino em Configurações.</span>`, on ? "♪" : "×");
    },
    openQuests() {
      this.openModal({ title: "Missões e conquistas", color: "#f6c35b", body: () => {
        const d = State.data; const pct = Math.round(State.progress() * 100);
        return `<p class="muted">Exploração: <strong>${pct}%</strong> · Áreas: <strong>${d.visited.length}/7</strong> · Conquistas: <strong>${d.achievements.length}/${ACHIEVEMENTS.length}</strong></p>
          <ul class="quests">${QUESTS.map((q) => { const done = d.questsDone.includes(q.id); return `<li class="${done ? "done" : ""}"><span class="check" aria-hidden="true">${done ? "✓" : ""}</span><div><strong>${esc(q.title)}</strong><span>${esc(q.desc)}${q.count && !done ? " · " + q.count(d) : ""}</span></div><span class="sr-only">${done ? "concluída" : "pendente"}</span></li>`; }).join("")}</ul>
          <h3>Conquistas</h3>
          <ul class="achievements">${ACHIEVEMENTS.map((a) => { const on = d.achievements.includes(a.id); return `<li class="${on ? "on" : ""}"><span class="ach-badge">${on ? esc(a.badge) : "?"}</span><div><strong>${on ? esc(a.title) : "Bloqueada"}</strong><span>${esc(a.desc)}</span></div></li>`; }).join("")}</ul>`;
      } });
    },
    openMap() {
      if (this.menuOpen) return;
      const groups = WorldMap.ZONES.map((z) => {
        const items = WorldMap.objects.filter((o) => o.zone === z.id && o.interactive);
        const visited = State.hasVisited(z.id);
        return `<section class="map-zone" style="--c:${z.color}">
          <header><span class="zone-n">${z.n}</span><div><h3>${esc(z.title)}</h3><p class="muted">${esc(z.place)} ${visited ? "· visitada" : "· não visitada"}</p></div>
          <button class="btn btn-small" data-goto="${z.id}">Ir até lá</button></header>
          <ul>${items.map((o) => `<li><button class="linklike" data-obj="${esc(o.id)}">${State.hasSeen(o.id) ? "✓" : "•"} ${esc(o.label)}</button></li>`).join("")}</ul></section>`;
      }).join("");
      this.openModal({ title: "Mapa e navegação", color: "#4ea8ff", cls: "wide", body: `
        <div class="map-wrap"><canvas id="bigmap" aria-label="Mapa do mundo com as 7 áreas e a sua posição"></canvas></div>
        <p class="muted">Use <strong>Ir até lá</strong> para viajar instantaneamente, ou abra qualquer conteúdo direto pela lista — sem precisar andar.</p>
        <div class="map-zones">${groups}</div>
        <div class="actions"><button class="btn" data-goto="plaza">Voltar à praça central</button><button class="btn" data-classic>${ICON.book}<span>Portfólio tradicional</span></button></div>`,
        after: (root) => {
          const cv = root.querySelector("#bigmap");
          cv.width = this.miniBase.width * 3; cv.height = this.miniBase.height * 3;
          this.drawMinimap(cv, true);
          root.querySelectorAll("[data-obj]").forEach((b) => b.addEventListener("click", () => {
            const o = WorldMap.objects.find((x) => x.id === b.dataset.obj); GameAudio.play("select");
            if (o.action.kind === "panel" || ["skill", "project", "experience", "education", "certificate", "testimonial", "contact"].includes(o.action.kind)) this.openFromObject(o);
            else { this.closeModal(true); Interactions.trigger(o); }
          }));
        } });
    },
    travel(zoneId) {
      const go = () => {
        if (zoneId === "plaza") Game.teleport(WorldMap.SPAWN.x, WorldMap.SPAWN.y, "up");
        else { const e = WorldMap.zoneEntry(zoneId); Game.teleport(e.x, e.y, e.dir); }
      };
      this.closeModal(true);
      GameAudio.play("warp");
      this.fade(go);
    },
    fade(mid) {
      if (State.data.settings.reduceMotion) { mid(); return; }
      this.fadeEl.classList.add("on");
      setTimeout(() => { mid(); setTimeout(() => this.fadeEl.classList.remove("on"), 60); }, 260);
    },

    /* ----------------------------------------------- ação do botão E */
    actionKey() {
      if (this.dialogState) return this.advanceDialog();
      if (this.isBlocking()) return;
      if (Game.target) Interactions.trigger(Game.target);
    },

    /* =========================================== PORTFÓLIO TRADICIONAL */
    renderClassic() {
      const d = D(), p = d.profile, c = d.contact;
      const sec = (id, eyebrow, title, html) => `<section id="${id}" class="c-section" aria-labelledby="${id}-t"><p class="c-eyebrow">${eyebrow}</p><h2 id="${id}-t">${title}</h2>${html}</section>`;
      const photo = !isPending(p.photo) ? `<img class="c-photo" src="${esc(p.photo)}" alt="Foto de ${esc(p.name)}" onerror="this.parentElement.classList.add('no-photo');this.remove()">` : "";
      const aboutBody = `<div class="c-about">${photo}<div>${para(p.about)}<div class="chips">${(p.chips || []).map((x) => `<span class="chip-soft">${esc(x)}</span>`).join("")}</div></div></div>${C.stats()}${C.trajectory()}${C.goals()}`;
      const navLinks = [["c-sobre", "Sobre"], ["c-projetos", "Projetos"], ["c-habilidades", "Habilidades"], ["c-experiencia", "Experiência"], ["c-formacao", "Formação"], ["c-depoimentos", "Depoimentos"], ["c-contato", "Contato"]];
      $("#classic").innerHTML = `
        <header class="c-header">
          <nav class="c-nav" aria-label="Seções">
            <a class="c-brand" href="#c-top">${esc(p.name)}<b>.</b></a>
            <ul>${navLinks.map(([h, l]) => `<li><a href="#${h}">${l}</a></li>`).join("")}</ul>
            <button class="btn btn-small c-theme" data-theme aria-label="Alternar tema claro/escuro">☀ / ☾</button>
            <button class="btn btn-small" data-menu>Menu do jogo</button>
            <button class="btn btn-primary btn-small" data-play>▶ Jogar</button>
          </nav>
          <div class="c-hero" id="c-top">
            <div class="c-hero-text">
              <div class="c-pills">${(p.roles || [p.role]).map((r) => `<span class="pill">${esc(r)}</span>`).join("")}</div>
              <h1>${esc(p.name)}</h1>
              <p class="c-headline">${esc(p.headline)}</p>
              <p class="lead">${esc(p.intro)}</p>
              <div class="actions"><a class="btn btn-primary" href="#c-contato">Fale comigo</a>${linkBtn(d.resume.url, "Baixar currículo", { icon: "down", download: d.resume.fileName || true })}<a class="btn" href="#c-projetos">Ver projetos</a></div>
            </div>
            <div class="c-hero-media">${p.codeCard ? C.codeCard() : `<canvas data-avatar class="c-avatar" width="18" height="26" aria-hidden="true"></canvas>`}</div>
          </div>
        </header>
        <div class="c-main">
          ${sec("c-sobre", "Sobre mim", esc(p.aboutTitle || "Sobre mim"), aboutBody)}
          ${sec("c-projetos", "Projetos", "Coisas que eu construí.", C.projects())}
          ${sec("c-habilidades", "Habilidades", "O que eu faço.", C.skills())}
          ${sec("c-experiencia", "Experiência", "Onde coloco a mão na massa.", C.experience())}
          ${sec("c-formacao", "Formação", "Sempre aprendendo.", C.education())}
          ${sec("c-depoimentos", "Depoimentos", "Quem já trabalhou comigo.", C.testimonials().replace(/^<p class="lead">.*?<\/p>/, ""))}
          ${sec("c-contato", "Contato", esc(c.title || "Contato"), C.contact())}
        </div>
        <footer class="c-footer">
          <div class="c-footer-grid">
            <div><h4>Navegar</h4><ul>${navLinks.slice(0, 5).map(([h, l]) => `<li><a href="#${h}">${l}</a></li>`).join("")}</ul></div>
            <div><h4>Redes</h4><ul><li><a href="${esc(c.github)}" target="_blank" rel="noopener">GitHub</a></li><li><a href="${esc(c.instagram.url)}" target="_blank" rel="noopener">Instagram</a></li>${!isPending(c.linkedin) ? `<li><a href="${esc(c.linkedin)}" target="_blank" rel="noopener">LinkedIn</a></li>` : ""}</ul></div>
            <div><h4>Contato</h4><ul><li><a href="mailto:${esc(c.email)}">${esc(c.email)}</a></li>${whatsappUrl() ? `<li><a href="${esc(whatsappUrl())}" target="_blank" rel="noopener">${esc(c.whatsapp.display)}</a></li>` : ""}</ul></div>
            <div><h4>Localização</h4><ul><li>Cajamar, São Paulo, Brasil</li></ul></div>
          </div>
          <div class="c-footer-bottom"><span>Copyright © ${new Date().getFullYear()} ${esc(p.name)}. Todos os direitos reservados.</span><span>Feito com código e café no Brasil.</span></div>
          <button class="btn" data-play>▶ Explorar a versão em jogo</button>
        </footer>`;
      const root = $("#classic");
      try { if (localStorage.getItem("mar-classic-theme") === "light") root.classList.add("light"); } catch (e) {}
      root.querySelectorAll("canvas[data-avatar]").forEach((cv) => this.drawAvatar(cv));
      root.addEventListener("click", (e) => {
        if (e.target.closest("[data-play]")) { this.closeClassic(); Main.startGame(); }
        if (e.target.closest("[data-menu]")) { this.closeClassic(); Main.showMenu(); }
        if (e.target.closest("[data-theme]")) { root.classList.toggle("light"); try { localStorage.setItem("mar-classic-theme", root.classList.contains("light") ? "light" : "dark"); } catch (er) {} }
        const o = e.target.closest("[data-open]"); if (o) { const a = document.querySelector("#c-" + ({ contact: "contato", trajectory: "sobre" }[o.dataset.open] || "sobre")); if (a) a.scrollIntoView(); }
        const cl = e.target.closest("[data-classic]"); if (cl) e.preventDefault();
        const nav = e.target.closest('a[href^="#c-"]'); if (nav) { e.preventDefault(); const t = document.querySelector(nav.getAttribute("href")); if (t) { t.scrollIntoView({ behavior: State.data.settings.reduceMotion ? "auto" : "smooth" }); const h = t.querySelector("h2, h1"); if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); } } }
      });
      root.addEventListener("submit", (e) => this.handleForm(e));
      root.querySelectorAll(".c-section h2").forEach((h) => (h.tabIndex = -1));
      this._classicReposLoaded = false;
    },
    openClassic() {
      this.closeModal(true);
      this.classicOpen = true;
      $("#classic").hidden = false; $("#app").hidden = true;
      document.body.classList.add("classic-mode");
      window.scrollTo(0, 0);
      if (location.hash !== "#portfolio") history.replaceState(null, "", "#portfolio");
      $("#classic h1").setAttribute("tabindex", "-1"); $("#classic h1").focus({ preventScroll: true });
      if (!this._classicReposLoaded) { this._classicReposLoaded = true; this.loadRepos($("#classic")); }
      this.sync();
    },
    closeClassic() {
      this.classicOpen = false;
      $("#classic").hidden = true; $("#app").hidden = false;
      document.body.classList.remove("classic-mode");
      if (location.hash) history.replaceState(null, "", location.pathname + location.search);
      this.sync();
    },
  };

  window.UI = UI;
  window.Content = C;
})();
