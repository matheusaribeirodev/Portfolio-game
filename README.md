# Matheus Augusto Ribeiro — Developer Portfolio (versão jogo 2D)

Portfólio profissional transformado em um jogo 2D de exploração em pixel art.
O visitante controla um personagem, anda por 7 áreas e conhece o portfólio
interagindo com objetos. Quem não quiser jogar tem o **Portfólio Tradicional**
(menu inicial, pausa ou o link `#portfolio`) e o **índice do mapa** (tecla `M`).

Tudo é HTML5 + CSS3 + JavaScript puro com Canvas 2D. Não há frameworks,
dependências nem etapa de build. Sprites e sons são gerados por código, então
não existem arquivos de imagem ou áudio para carregar.

---

## Conteúdo

Todo o conteúdo do `index.html` original e do currículo em PDF já está em
**`js/portfolio-data.js`**: apresentação, sobre, números, as 9 tecnologias e as
4 áreas de atuação, os projetos (EtiquetaFlow, Forninho da Lili e Loja Virtual,
este último vindo do currículo), a lista "Mais no GitHub" carregada
automaticamente da API, as experiências, a formação, os 9 cursos, os idiomas, os
depoimentos, os contatos (WhatsApp, e-mail, GitHub, Instagram), o formulário, o
currículo para download, os metadados e o tema claro/escuro (na versão
tradicional).

### Antes de publicar

1. **Imagens:** copie do projeto original a pasta `img/` (`foto.webp`,
   `etiquetaflow.webp`, `forninho.webp`) e o `og-image.jpg` para a raiz. Se
   alguma imagem faltar, ela simplesmente não aparece, sem quebrar a página.
2. **Formulário:** o original estava em modo demonstração no Formspree. Sem
   endpoint, o envio abre o app de e-mail do visitante com a mensagem pronta.
   Para receber direto, cole o link do Formspree em `contact.form.formEndpoint`.
3. **LinkedIn:** quando tiver, preencha `contact.linkedin`. O terminal aparece
   sozinho no mapa.

Ao adicionar itens em `skills`, `projects`, `experience`, `education`,
`certificates` ou `testimonials`, **o mapa cria automaticamente** uma nova
estação, terminal, mesa, estante ou quadro para cada item.

---

## Como executar localmente

Não precisa instalar nada:

1. Abra `index.html` direto no navegador (duplo clique), **ou**
2. Sirva a pasta para testar como em produção:
   ```bash
   cd portfolio-game
   python3 -m http.server 8080      # ou: npx serve .
   ```
   e acesse <http://localhost:8080>.

## Como publicar

É um site estático. Envie a pasta inteira para qualquer host:

- **Render** (o site atual): *New → Static Site*, aponte para o repositório,
  deixe o build command vazio e use `.` como publish directory.
- **GitHub Pages**: envie para um repositório → *Settings → Pages* →
  branch `main`, pasta `/root`.
- **Netlify / Vercel**: arraste a pasta ou conecte o repositório (sem build).

## Controles

| Ação | Teclado | Toque |
|---|---|---|
| Andar | `W A S D` ou setas | joystick virtual |
| Dash | `Shift` | botão **»** |
| Pular | `Espaço` | botão **⤒** |
| Interagir / avançar diálogo | `E` ou `Enter` | botão **E** ou tocar na caixa |
| Pular cutscene | `ESC`, `E`, `Enter` ou `Espaço` | botão **Pular ▸▸** |
| Pausa / fechar janela | `ESC` | botão **II** |
| Mapa + viagem rápida + índice | `M` | ícone de mapa / minimapa |
| Missões e conquistas | `Q` | ícone de lista |

## Estrutura

```
portfolio-game/
├── index.html              # estrutura, metadados, menu, HUD, janelas
├── css/
│   ├── style.css           # base, componentes e portfólio tradicional
│   └── game.css            # menu, HUD, diálogos, modais, toque
├── js/
│   ├── portfolio-data.js   # ← TODO o conteúdo do portfólio
│   ├── sprites.js          # pixel art procedural (tiles, personagem, objetos)
│   ├── map.js              # geração do mundo e posicionamento das 7 áreas
│   ├── player.js           # movimento com game feel, squash & stretch, dash, pulo, idle
│   ├── game.js             # loop, câmera, luz, partículas e renderização
│   ├── interactions.js     # o que cada objeto faz ao apertar E
│   ├── cutscene.js         # diretor de cutscenes: abertura, áreas e foco em objetos
│   ├── ui.js               # HUD, diálogos, janelas, mapa, portfólio tradicional
│   ├── state.js            # progresso, missões, conquistas, save (localStorage)
│   ├── audio.js            # efeitos e trilha chiptune (Web Audio API)
│   ├── input.js            # teclado e joystick virtual
│   └── main.js             # inicialização, menu animado, atalhos
├── assets/                 # currículo PDF, favicon e pastas livres
├── img/                    # copie aqui as imagens do site original
└── README.md
```

## Game feel e cutscenes

- **Inércia:** o personagem acelera, freia deslizando e derrapa ao inverter a
  direção. Os valores ficam em `TUNING`, no topo de `js/player.js`.
- **Squash & stretch:** deformação com mola amortecida ao largar, parar, virar,
  dar dash, pular e aterrissar.
- **Partículas:** poeira nos passos, na largada, na parada, na derrapagem, no
  dash (com rastro de fantasmas) e anel de poeira na aterrissagem, além de uma
  leve tremida de câmera.
- **Idle com personalidade:** respira, pisca (às vezes duas vezes), olha para
  os lados após 5 s, se espreguiça aos 14 s e cochila com "Zzz" aos 22 s.
- **Câmera:** olha um pouco à frente do movimento e faz zoom nas cutscenes.
- **Cutscene de abertura:** a câmera desliza pelo mapa até a praça, um feixe de
  luz teletransporta o personagem, ele aterrissa, olha em volta e o Byte o
  recebe. Quem volta ao jogo vê uma versão curta.
- **Cutscenes de área:** na primeira visita a cada área, o controle trava por
  cerca de 2 s, a câmera vai até o objeto principal, que ganha um destaque, e
  um balão apresenta a área.
- **Cutscenes de interação:** na primeira vez que você ativa um projeto ou um
  painel importante, há um foco rápido com balão antes de o conteúdo abrir.
- Toda cutscene pode ser pulada e pode ser desligada em Configurações. Com
  "reduzir movimento", cutscenes, squash e partículas ficam desligados.

## Recursos

- Mapa 80×60 tiles com praça central e 7 áreas: Sobre Mim (casa-escritório),
  Habilidades (laboratório), Projetos (centro de desenvolvimento), Experiência
  (escritório), Formação e Certificados (biblioteca), Depoimentos (galeria) e
  Contato (central de comunicação).
- Personagem com caminhada e repouso nas 4 direções, colisão com deslize em
  quinas, câmera suave e renderização em escala inteira (pixels nítidos).
- Iluminação dinâmica, vagalumes, hologramas, telas e LEDs animados.
- Byte, o robô assistente, faz o tutorial e sugere a próxima área.
- 9 missões, 11 conquistas, indicador de exploração, minimapa e marcadores "!".
- Progresso e configurações salvos no navegador.
- Formulário de contato: sem backend, abre o e-mail do visitante com a mensagem
  pronta. Para envio direto, informe um endpoint (Formspree etc.) em
  `contact.form.formEndpoint`.
- Acessibilidade: portfólio tradicional semântico, índice de conteúdo no mapa,
  navegação por teclado com foco preso nas janelas, link "pular para o
  conteúdo", `prefers-reduced-motion` respeitado (e opção nas configurações).
