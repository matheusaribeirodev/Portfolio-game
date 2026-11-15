# 🎮 Matheus Augusto Ribeiro — Developer Portfolio (versão jogo 2D)

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Canvas 2D](https://img.shields.io/badge/Canvas_2D-0f1226?style=for-the-badge)

Portfólio profissional transformado em um **jogo 2D de exploração em pixel art**. O visitante controla um personagem, anda por 7 áreas e conhece o portfólio interagindo com objetos. Quem não quiser jogar tem o **Portfólio Tradicional** (menu inicial, pausa ou o link `#portfolio`) e o **índice do mapa** (tecla `M`).

Tudo é **HTML5 + CSS3 + JavaScript puro com Canvas 2D**. Não há frameworks, dependências nem etapa de build. Sprites e sons são gerados por código, então não existem arquivos de imagem ou áudio pesados para carregar.

🔗 **Acesse online:** [quem-e-matheus.onrender.com](https://portfolio-game-y2e3.onrender.com/)

---

## 📋 Conteúdo

Todo o conteúdo do `index.html` original e do currículo em PDF já está centralizado em **`js/portfolio-data.js`**:
- Apresentação, sobre e números;
- As 9 tecnologias e as 4 áreas de atuação;
- Projetos (**EtiquetaFlow**, **Forninho da Lili** e **Loja Virtual**, este último vindo do currículo) + lista *"Mais no GitHub"* carregada automaticamente da API;
- Experiências, formação, 9 cursos e idiomas;
- Depoimentos, contatos (WhatsApp, e-mail, GitHub, Instagram), formulário e currículo para download;
- Metadados e tema claro/escuro (na versão tradicional).

> 💡 **Geração Dinâmica no Mapa:** Ao adicionar itens em `skills`, `projects`, `experience`, `education`, `certificates` ou `testimonials`, **o mapa cria automaticamente** uma nova estação, terminal, mesa, estante ou quadro para cada item.

### ⚠️ Checklist antes de publicar

1. **Imagens:** copie do projeto original a pasta `img/` (`foto.webp`, `etiquetaflow.webp`, `forninho.webp`) e o `og-image.jpg` para a raiz. Se alguma imagem faltar, ela simplesmente não aparece, sem quebrar a página.
2. **Formulário:** o original estava em modo demonstração no Formspree. Sem endpoint, o envio abre o app de e-mail do visitante com a mensagem pronta. Para receber direto, cole o link do Formspree em `contact.form.formEndpoint`.
3. **LinkedIn:** quando tiver, preencha `contact.linkedin`. O terminal aparece sozinho no mapa.

---

## 🚀 Como executar localmente

Não precisa instalar nada:

1. Abra `index.html` direto no navegador (duplo clique), **ou**
2. Sirva a pasta para testar como em produção:
   ```bash
   cd portfolio-game
   python3 -m http.server 8080      # ou: npx serve .
