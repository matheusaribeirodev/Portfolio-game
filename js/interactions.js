/* ==========================================================================
   interactions.js — O que acontece quando o jogador aperta E num objeto
   ========================================================================== */

(function () {
  "use strict";

  const D = () => window.PORTFOLIO;

  /** Falas curtas antes de abrir cada painel (dão o "clima" de RPG). */
  const INTRO = {
    about: "O monitor acende. Uma apresentação está aberta na tela…",
    profile: "Um quadro com a ficha do personagem.",
    goals: "Bilhetes coloridos presos no mural.",
    trajectory: "Um diário de bordo entre os livros da estante.",
    resume: "A impressora imprime uma folha quentinha: o currículo!",
    skills: "O painel lista todo o arsenal técnico do laboratório.",
    projects: "O painel mostra todos os repositórios publicados.",
    experience: "Uma linha do tempo desenhada no quadro branco.",
    education: "Um diploma emoldurado na parede da biblioteca.",
    languages: "O globo gira devagar…",
    contact: "A antena capta todos os canais de contato.",
    form: "O rádio está pronto para transmitir sua mensagem.",
  };

  const Interactions = {
    trigger(obj) {
      if (!obj) return;
      const first = State.markSeen(obj.id);
      if (first) Game.burst(obj.cx, obj.wall ? obj.y + 8 : obj.sy + 4, "rgba(246,195,91,");
      if (obj.type === "npc") { obj.faceUntil = Game.t + 4; obj.faceDir = faceToward(obj, Game.player); }
      GameAudio.play("blip");
      const a = obj.action || {};
      const d = D();
      switch (a.kind) {
        case "guide": return UI.guideDialog();
        case "dialog": return UI.dialog(a.lines);
        case "map": return UI.openMap();
        case "quests": return UI.openQuests();
        case "zoneinfo": {
          const z = WorldMap.zone(a.zone);
          return UI.dialog([{ who: "Placa", text: `Área ${z.n} — ${z.title}. ${z.place}.` }], () => {});
        }
        case "panel":
          return UI.dialog([{ who: "Sistema", text: INTRO[a.panel] || "…" }], () => UI.openContent(a.panel));
        case "skill": {
          const s = d.skills.find((x) => x.id === a.id);
          return UI.dialog([{ who: "Estação", text: `Estação de ${s.name} ativada. Carregando dados…` }], () => UI.openContent("skill", a.id));
        }
        case "project": {
          const p = d.projects.find((x) => x.id === a.id);
          return UI.dialog([{ who: "Terminal", text: `git clone ${p.name}… pronto!` }], () => UI.openContent("project", a.id));
        }
        case "experience": {
          const i = d.experience.findIndex((x) => x.id === a.id);
          return UI.dialog([{ who: "Missão " + (i + 1), text: "Uma pasta com o relatório da missão está sobre a mesa." }], () => UI.openContent("experienceItem", a.id));
        }
        case "education": return UI.dialog([{ who: "Biblioteca", text: "Um livro aberto brilha sobre o púlpito." }], () => UI.openContent("educationItem", a.id));
        case "certificate": return UI.dialog([{ who: "Biblioteca", text: "Um volume dourado se destaca na estante." }], () => UI.openContent("certificate", a.id));
        case "testimonial": return UI.dialog([{ who: "Galeria", text: "Uma placa sob o quadro traz um depoimento." }], () => UI.openContent("testimonial", a.id));
        case "contact": return UI.openContent("channel", a.id);
      }
    },
  };

  function faceToward(npc, p) {
    const dx = p.x - npc.cx, dy = p.y - npc.baseY;
    if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? "right" : "left";
    return dy > 0 ? "down" : "up";
  }

  window.Interactions = Interactions;
})();
