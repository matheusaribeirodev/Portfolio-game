/* ==========================================================================
   portfolio-data.js — TODO O CONTEÚDO DO PORTFÓLIO FICA AQUI
   --------------------------------------------------------------------------
   Conteúdo extraído do index.html original e do currículo em PDF.
   O jogo e a versão tradicional são gerados a partir deste arquivo.

   REGRAS
   - Valores que começam com "⚠" (ou null / "") aparecem como PENDENTES,
     destacados em âmbar; links pendentes nunca viram botões quebrados.
   - Ao adicionar itens em skills / projects / experience / education /
     certificates / testimonials, o mapa cria sozinho um objeto interativo.
   ========================================================================== */

(function () {
  "use strict";

  window.PORTFOLIO = {
    /* ---------------------------------------------------------------- META */
    meta: {
      title: "Matheus Augusto Ribeiro — Desenvolvedor Full Stack & UI Designer",
      description: "Portfólio de Matheus Augusto Ribeiro, desenvolvedor Full Stack e UI Designer de Cajamar (SP). Sites, sistemas e automações.",
      siteUrl: "https://quem-e-matheus.onrender.com",
      ogImage: "og-image.jpg", // imagem de compartilhamento 1200x630 (mesmo arquivo do site original)
    },

    /* ------------------------------------------------------------- PERFIL */
    profile: {
      name: "Matheus Augusto Ribeiro",
      shortName: "Matheus",
      role: "Desenvolvedor Full Stack & UI Designer",
      roles: ["Desenvolvedor Full Stack", "Dev & UI Designer"],
      education: "Estudante de Análise e Desenvolvimento de Sistemas — SENAI",
      location: "Cajamar, São Paulo",
      headline: "Transformo ideias em sistemas que funcionam.",
      intro: "Sou Matheus, estudante de Análise e Desenvolvimento de Sistemas no SENAI. Crio sites, sistemas e automações do começo ao fim, do protótipo no Figma até o código no ar.",
      aboutTitle: "Código, design e um pé no e-commerce.",
      about: [
        "Sou o Matheus Augusto Ribeiro, de Cajamar (SP). Comecei a programar há cerca de um ano e, desde então, já são mais de 20 projetos, de sites a automações em Python.",
        "Antes do código veio o e-commerce. Ainda gerencio minha própria loja online, e foi lá que aprendi a ver a tecnologia como ferramenta para resolver problemas reais, como a impressão de etiquetas que deu origem ao EtiquetaFlow.",
        "Hoje curso Análise e Desenvolvimento de Sistemas no SENAI e junto desenvolvimento e UI design para criar produtos bonitos, simples de usar e que funcionam de verdade.",
      ],
      chips: ["📍 Cajamar, São Paulo", "🎓 ADS · SENAI", "🇺🇸 Inglês B2"],
      stats: [
        { value: "1", label: "Ano programando" },
        { value: "20+", label: "Projetos feitos" },
        { value: "9", label: "Tecnologias e ferramentas" },
        { value: "1", label: "Loja de e-commerce gerenciada" },
      ],
      // Trajetória: montada a partir das seções Sobre e Experiência do site original
      trajectory: [
        "2024 — começa a trabalhar com e-commerce na JGM E-commerce, cuidando de catálogo, pedidos, etiquetas, anúncios e atendimento.",
        "Cerca de um ano atrás — começa a programar; desde então, mais de 20 projetos, de sites a automações em Python.",
        "2026 — cria o EtiquetaFlow, projeto independente nascido de um problema real da loja: a impressão de etiquetas.",
        "Hoje — cursa Análise e Desenvolvimento de Sistemas no SENAI (2º semestre), unindo desenvolvimento e UI design.",
      ],
      goals: [
        "Criar produtos bonitos, simples de usar e que funcionam de verdade.",
        "Tem um projeto, uma vaga ou uma ideia? Me chama, respondo rapidinho.",
      ],
      available: true,
      photo: "img/foto.webp", // mesma foto do site original (quadrada, mín. 800x800)
      codeCard: true, // mostra a "janela de código" matheus.js do topo do site original
      avatar: {
        hair: "#2a1d17", hairLight: "#4a3326", skin: "#c98f6b", skinShade: "#a8714f",
        hoodie: "#24304f", hoodieLight: "#33446e", accent: "#4fe3c1", pants: "#3b3f52", shoes: "#e9e6df",
      },
    },

    /* ---------------------------------------------------------- CURRÍCULO */
    resume: {
      url: "assets/Curriculo_Matheus_Augusto_Ribeiro.pdf",
      fileName: "Curriculo_Matheus_Augusto_Ribeiro.pdf",
      label: "Currículo — Matheus Augusto Ribeiro (PDF)",
    },

    /* ---------------------------------------------------------- HABILIDADES */
    // Áreas de atuação (cards "O que eu faço." do site original)
    skillAreas: [
      { id: "web", title: "Desenvolvimento web", description: "Sites e páginas responsivos, rápidos e bem estruturados, que funcionam bem no celular e no computador.", tech: "HTML5 · CSS3 · JavaScript" },
      { id: "backend", title: "Back-end e automações", description: "Scripts e sistemas que eliminam tarefas repetitivas, com banco de dados, integrações e deploy em containers.", tech: "Python · SQLite · Docker" },
      { id: "design", title: "UI/UX design", description: "Interfaces limpas e intuitivas, prototipadas antes de virar código, para o usuário encontrar tudo sem esforço.", tech: "Figma · Canva" },
      { id: "ecommerce", title: "Soluções para e-commerce", description: "Experiência real com loja online: integrações com marketplaces, automação de pedidos e envio.", tech: "Shopee · TikTok Shop · Mercado Livre" },
    ],
    // As 9 tecnologias e ferramentas do site original. Cada uma vira uma estação no laboratório.
    // icon: até 3 caracteres (A–Z, 0–9, < > / . #) desenhados em pixel art.
    skills: [
      { id: "python", name: "Python", icon: "PY", color: "#f6c35b", area: "backend", category: "Linguagem" },
      { id: "javascript", name: "JavaScript", icon: "JS", color: "#f7df1e", area: "web", category: "Linguagem" },
      { id: "html5", name: "HTML5", icon: "</>", color: "#ff7a45", area: "web", category: "Web" },
      { id: "css3", name: "CSS3", icon: "CSS", color: "#4ea8ff", area: "web", category: "Web" },
      { id: "sqlite", name: "SQLite", icon: "SQL", color: "#7cc4ff", area: "backend", category: "Banco de dados" },
      { id: "docker", name: "Docker", icon: "DK", color: "#2496ed", area: "backend", category: "Containers (Dockerfile)" },
      { id: "figma", name: "Figma", icon: "FIG", color: "#ff6fb5", area: "design", category: "Design / UI e UX" },
      { id: "canva", name: "Canva", icon: "CNV", color: "#38d6d6", area: "design", category: "Design / UI e UX" },
      { id: "portugol", name: "Portugol", icon: "P>", color: "#b892ff", area: null, category: "Lógica de programação" },
    ],

    /* ------------------------------------------------------------ PROJETOS */
    projects: [
      {
        id: "etiquetaflow",
        name: "EtiquetaFlow",
        tag: "Automação · E-commerce",
        description: "Automação de etiquetas de envio que reúne os pedidos da Shopee, do TikTok Shop e do Mercado Livre num só fluxo, sem precisar entrar em cada plataforma.",
        technologies: ["Python", "APIs", "Automação"],
        image: "img/etiquetaflow.webp",
        imageAlt: "Tela do EtiquetaFlow com 25 etiquetas pendentes",
        repo: "https://github.com/matheusaribeirodev/Projeto-EtiquetaFlow",
        demo: null,
      },
      {
        id: "forninho-da-lili",
        name: "Forninho da Lili",
        tag: "Site · Sistema web",
        description: "Site de várias páginas para uma confeitaria, com área administrativa (/admin) que tem login e cadastro completo dos produtos (CRUD).",
        technologies: ["HTML", "CSS", "JavaScript", "CRUD"],
        image: "img/forninho.webp",
        imageAlt: "Página inicial do site Forninho da Lili",
        repo: "https://github.com/matheusaribeirodev", // o original aponta para o perfil; troque pelo repositório se quiser
        demo: null, // ⚠ se o site estiver no ar, coloque o link aqui
      },
      {
        id: "projeto-loja",
        name: "Loja Virtual (E-commerce)",
        tag: "Back-end · Banco de dados",
        description: "Projeto de e-commerce com arquitetura moderna e leve: PHP combinado com a linguagem Hack (HHVM) para tipagem estática e alta performance, SQLite para o banco de dados sem dependências externas complexas e Docker para padronizar o ambiente de execução.",
        technologies: ["PHP", "Hack (HHVM)", "SQLite", "Docker"],
        image: null,
        repo: "https://github.com/matheusaribeirodev/Projeto-loja",
        demo: null,
        source: "currículo",
      },
    ],
    githubUser: "matheusaribeirodev",
    githubProfile: "https://github.com/matheusaribeirodev",
    // Lista "Mais no GitHub": carregada automaticamente da API do GitHub, como no site original
    autoRepos: true,

    /* --------------------------------------------------------- EXPERIÊNCIA */
    experience: [
      {
        id: "jgm",
        role: "Gerenciamento de Plataformas",
        company: "JGM E-commerce · São Paulo, SP",
        period: "2024 – Atual",
        description: null,
        tasks: [
          "Gerencio o catálogo de produtos nas plataformas, padronizando títulos, fotos e descrições.",
          "Opero o fluxo diário de pedidos, da separação à emissão de etiquetas.",
          "Crio peças visuais no Canva para anúncios.",
          "Analiso indicadores de vendas para apoiar decisões de preço e estoque.",
          "Faço o atendimento aos clientes.",
        ],
      },
      {
        id: "etiquetaflow-produto",
        role: "Desenvolvimento de Produto",
        company: "EtiquetaFlow · Projeto independente",
        period: "2026 – Atual",
        description: null,
        tasks: [
          "Mapeei o fluxo de etiquetas de pedidos da Shopee, do TikTok Shop e do Mercado Livre.",
          "Obtive aprovação de contas de desenvolvedor nas três plataformas para integrar as APIs.",
          "Comparei a integração própria com o UpSeller e adotei a ferramenta, que já conecta os três canais.",
        ],
      },
    ],

    /* ------------------------------------------------------------ FORMAÇÃO */
    education: [
      { id: "ads", course: "Análise e Desenvolvimento de Sistemas", institution: "SENAI Santana de Parnaíba", period: "2º semestre", status: "Em andamento" },
      { id: "ingles", course: "Inglês", institution: "LFG Idiomas", period: "3º semestre · Nível B2", status: "Em andamento" },
      { id: "ensino-medio", course: "Ensino Médio", institution: "SENAI Cajamar", period: "2º ano", status: "Em andamento" },
    ],
    languages: [
      { id: "pt", name: "Português", level: "Nativo" },
      { id: "en", name: "Inglês", level: "B2 (Intermediário Avançado)" },
    ],
    certificates: [
      { id: "marketing-digital", name: "Marketing Digital", issuer: "Prefeitura de Cajamar / Fly Cow" },
      { id: "fluenciai", name: "FluênciAI: Fundamentos da IA", issuer: "SENAI (EAD)" },
      { id: "etica-ia", name: "Ética na Inteligência Artificial", issuer: "SENAI (EAD)" },
      { id: "seguranca-cibernetica", name: "Por Dentro da Segurança Cibernética", issuer: "SENAI (EAD)" },
      { id: "excel", name: "Excel Básico", issuer: "SENAI (EAD)" },
      { id: "seguranca-trabalho", name: "Segurança no Trabalho", issuer: "SENAI (EAD)" },
      { id: "descarbonizacao", name: "Desvendando a Descarbonização", issuer: "SENAI (EAD)" },
      { id: "economia-circular", name: "Fundamentos e Ações da Economia Circular", issuer: "SENAI (EAD)" },
      { id: "ciclos-retorno", name: "Ciclos de Retorno para a Economia Circular", issuer: "SENAI (EAD)" },
    ],

    /* --------------------------------------------------------- DEPOIMENTOS */
    testimonials: [
      { id: "daniel-petinice", name: "Daniel Petinice", role: "Professor · SENAI", text: "O Matheus é dedicado e curioso. Não se contenta em fazer funcionar: quer entender o porquê e entregar bem-feito." },
      { id: "jaqueline-lourenco", name: "Jaqueline Lourenço", role: "CEO", text: "Ele automatizou um processo que tomava horas do nosso dia. Prático, rápido e sempre disposto a ajudar." },
      { id: "joao-torres", name: "João Torres", role: "Colega de curso · ADS SENAI", text: "Trabalhar em grupo com o Matheus é tranquilo: ele organiza as tarefas, cuida do visual e não deixa nada pela metade." },
      { id: "lavinia-roberta", name: "Lavínia Roberta", role: "Namorada", text: "Junta bom gosto no design com cuidado no código. O resultado é um site bonito que funciona de verdade." },
    ],

    /* ------------------------------------------------------------- CONTATO */
    contact: {
      title: "Vamos conversar?",
      intro: "Tem um projeto, uma vaga ou uma ideia? Me chama, respondo rapidinho.",
      email: "matheus.a.ribeiroo@gmail.com",
      whatsapp: { number: "5511972181449", display: "(11) 97218-1449", message: "" },
      github: "https://github.com/matheusaribeirodev",
      instagram: { handle: "@ribeiir0x", url: "https://instagram.com/ribeiir0x" },
      linkedin: null, // o original ainda não tem; quando tiver, coloque o link e o terminal aparece no mapa
      // O formulário do original usa Formspree em modo demonstração ([SEU_ID]).
      // Sem endpoint, o envio abre o app de e-mail com a mensagem pronta.
      // Para receber direto: crie o formulário em formspree.io e cole o link aqui.
      form: { enabled: true, formEndpoint: null },
    },
  };

  /* Helpers globais de conteúdo pendente */
  window.isPending = function (v) {
    if (v === null || v === undefined) return true;
    if (Array.isArray(v)) return v.length === 0 || v.every(window.isPending);
    if (typeof v === "string") return v.trim() === "" || v.trim().startsWith("⚠");
    return false;
  };
})();
