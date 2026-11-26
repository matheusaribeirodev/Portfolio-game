/* ==========================================================================
   state.js — Progresso, missões, conquistas e configurações
   Tudo é salvo no localStorage do navegador.
   ========================================================================== */

(function () {
  "use strict";

  const KEY = "mar-portfolio-game-v1";
  const reduceDefault = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const defaults = () => ({
    v: 1,
    started: false,
    tutorialDone: false,
    visited: [],
    seen: [],
    achievements: [],
    questsDone: [],
    player: null,
    settings: { sfx: true, music: true, reduceMotion: reduceDefault, touch: "auto", volume: 0.7, cutscenes: true },
  });

  const State = {
    data: defaults(),
    listeners: [],
    load() {
      try {
        const raw = localStorage.getItem(KEY);
        if (raw) {
          const d = JSON.parse(raw);
          this.data = Object.assign(defaults(), d);
          this.data.settings = Object.assign(defaults().settings, d.settings || {});
        }
      } catch (e) { /* localStorage indisponível: segue sem salvar */ }
      return this.data;
    },
    save() {
      try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) { /* ignora */ }
    },
    reset() {
      const settings = this.data.settings;
      this.data = defaults();
      this.data.settings = settings;
      this.save();
      this.emit("reset");
    },
    on(fn) { this.listeners.push(fn); },
    emit(type, payload) { this.listeners.forEach((fn) => fn(type, payload)); },

    hasSeen(id) { return this.data.seen.includes(id); },
    markSeen(id) {
      if (this.hasSeen(id)) return false;
      this.data.seen.push(id);
      this.save();
      this.emit("seen", id);
      this.evaluate();
      return true;
    },
    hasVisited(z) { return this.data.visited.includes(z); },
    markVisited(z) {
      if (this.hasVisited(z)) return false;
      this.data.visited.push(z);
      this.save();
      this.emit("visited", z);
      this.unlock("a-zone-" + z);
      this.evaluate();
      return true;
    },
    unlock(id) {
      if (this.data.achievements.includes(id)) return;
      const a = ACHIEVEMENTS.find((x) => x.id === id);
      if (!a) return;
      this.data.achievements.push(id);
      this.save();
      this.emit("achievement", a);
    },
    /** Reavalia missões e conquistas derivadas. */
    evaluate() {
      QUESTS.forEach((q) => {
        if (this.data.questsDone.includes(q.id)) return;
        if (q.progress(this.data, window.PORTFOLIO) >= 1) {
          this.data.questsDone.push(q.id);
          this.save();
          this.emit("quest", q);
        }
      });
      if (this.data.visited.length >= 7) this.unlock("a-explorer");
      if (this.data.seen.length >= 10) this.unlock("a-curious");
      if (this.data.questsDone.length >= QUESTS.length) this.unlock("a-quests");
      if (this.progressTotal && this.progress() >= 1) this.unlock("a-complete");
    },
    progressTotal: 0,
    progressIds: [],
    progress() {
      if (!this.progressIds.length) return 0;
      const n = this.progressIds.filter((id) => this.hasSeen(id)).length;
      return n / this.progressIds.length;
    },
  };

  const seenAny = (d, prefix) => d.seen.some((s) => s.startsWith(prefix));
  const seenCount = (d, prefix) => d.seen.filter((s) => s.startsWith(prefix)).length;

  const QUESTS = [
    { id: "q-byte", title: "Primeiros passos", desc: "Converse com o Byte, o assistente da praça central.", progress: (d) => (d.seen.includes("byte") ? 1 : 0) },
    { id: "q-about", title: "Quem é Matheus?", desc: "Use o computador da casa-escritório (Área 1).", progress: (d) => (d.seen.includes("about-pc") ? 1 : 0) },
    { id: "q-skills", title: "Arsenal técnico", desc: "Analise 3 estações no laboratório (Área 2).", progress: (d) => Math.min(1, seenCount(d, "skill-") / 3), count: (d) => `${Math.min(3, seenCount(d, "skill-"))}/3` },
    { id: "q-project", title: "Code review", desc: "Abra um projeto no centro de desenvolvimento (Área 3).", progress: (d) => (seenAny(d, "project-") ? 1 : 0) },
    { id: "q-exp", title: "Linha do tempo", desc: "Consulte uma missão no escritório (Área 4).", progress: (d) => (seenAny(d, "exp-") ? 1 : 0) },
    { id: "q-edu", title: "Estudante dedicado", desc: "Leia um item da biblioteca (Área 5).", progress: (d) => (seenAny(d, "edu-") || seenAny(d, "cert-") ? 1 : 0) },
    { id: "q-testi", title: "Boas referências", desc: "Leia um depoimento na galeria (Área 6).", progress: (d) => (seenAny(d, "testi-") ? 1 : 0) },
    { id: "q-contact", title: "Vamos conversar?", desc: "Acesse um canal na central de comunicação (Área 7).", progress: (d) => (seenAny(d, "contact-") ? 1 : 0) },
    { id: "q-explorer", title: "Explorador", desc: "Visite as 7 áreas do mapa.", progress: (d) => d.visited.length / 7, count: (d) => `${d.visited.length}/7` },
  ];

  const ACHIEVEMENTS = [
    { id: "a-zone-about", title: "Lar, doce código", desc: "Descobriu a Área 1 — Sobre Mim.", badge: "1" },
    { id: "a-zone-skills", title: "Cientista da stack", desc: "Descobriu a Área 2 — Habilidades.", badge: "2" },
    { id: "a-zone-projects", title: "Git push", desc: "Descobriu a Área 3 — Projetos.", badge: "3" },
    { id: "a-zone-exp", title: "Expediente aberto", desc: "Descobriu a Área 4 — Experiência.", badge: "4" },
    { id: "a-zone-edu", title: "Rato de biblioteca", desc: "Descobriu a Área 5 — Formação e Certificados.", badge: "5" },
    { id: "a-zone-testi", title: "Curador", desc: "Descobriu a Área 6 — Depoimentos.", badge: "6" },
    { id: "a-zone-contact", title: "Sinal recebido", desc: "Descobriu a Área 7 — Contato.", badge: "7" },
    { id: "a-explorer", title: "Explorador completo", desc: "Visitou todas as 7 áreas.", badge: "★" },
    { id: "a-curious", title: "Curioso", desc: "Interagiu com 10 objetos.", badge: "?" },
    { id: "a-quests", title: "Missão cumprida", desc: "Concluiu todas as missões.", badge: "✓" },
    { id: "a-complete", title: "Completista", desc: "Descobriu 100% do portfólio.", badge: "%" },
  ];

  window.State = State;
  window.QUESTS = QUESTS;
  window.ACHIEVEMENTS = ACHIEVEMENTS;
})();
