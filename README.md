# Naruto Fighter — Ninja Battle

> Fan game de luta 2D estilo **Street Fighter (SNES)** com temática **Naruto**, feito com **Phaser 3 + TypeScript + Vite**.
>
> ⚠️ Projeto **não-comercial**, feito para estudo e diversão. Naruto e seus personagens são propriedade de Masashi Kishimoto / Shueisha / TV Tokyo / Studio Pierrot. Este projeto **não é afiliado nem endossado** pelos detentores dos direitos.

---

## ✨ Sobre o projeto

Um jogo de luta versus (melhor de 3) rodando 100% no navegador. A física é manual (estilo fighting game clássico, sem arcade physics), com barra de vida, barra de chakra, projéteis e jutsus especiais por personagem.

Os lutadores usam **spritesheets PNG** quando disponíveis em `public/sprites/`, ou um **ninja desenhado por código** como fallback — então o jogo roda mesmo sem nenhum asset externo.

## 🎮 Controles

| Ação    | Player 1        | Player 2 |
| ------- | --------------- | -------- |
| Mover   | `A` / `D`       | `←` / `→` |
| Pular   | `W`             | `↑`      |
| Abaixar | `S`             | `↓`      |
| Soco    | `F`             | `K`      |
| Chute   | `G`             | `L`      |
| Jutsu   | `H`             | `;`      |

Menus: `ENTER` confirma · `ESC` volta.

## 🧩 Stack

- [Phaser 3](https://phaser.io/) — engine de jogo 2D
- [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vitejs.dev/) — dev server e build
- Enriquecimento opcional de dados via [Dattebayo API](https://docs.api-onepiece.com/) (fallback embutido)

## 🚀 Rodando localmente

Pré-requisitos: **Node.js 18+**.

```bash
# instalar dependências
npm install

# ambiente de desenvolvimento (http://localhost:5173)
npm run dev

# build de produção (gera a pasta dist/)
npm run build

# pré-visualizar o build (http://localhost:4173)
npm run preview
```

## 🗂️ Estrutura

```
index.html            # shell + moldura CRT
vite.config.ts        # config do Vite (base relativa, outDir dist)
wrangler.json         # config de deploy no Cloudflare Pages
public/
  sprites/            # spritesheets PNG opcionais dos personagens
src/
  main.ts             # bootstrap do jogo Phaser
  config.ts           # constantes (dimensões, física, regras)
  data.ts             # roster, golpes e jutsus
  api.ts              # integração opcional com a Dattebayo API
  sprites.ts          # carregamento e overrides de spritesheets
  objects/
    Fighter.ts        # lutador (estados, física, golpes)
    Projectile.ts     # projéteis / jutsus
  scenes/
    BootScene.ts      # carregamento de assets
    TitleScene.ts     # tela de título
    SelectScene.ts    # seleção de personagens
    FightScene.ts     # a luta em si
```

## 🎨 Adicionando sprites

O jogo procura automaticamente um spritesheet PNG por personagem em `public/sprites/` (ex.: `naruto.png`, `sasuke.png`, `sakura.png`, `rocklee.png`, `gaara.png`, `kakashi.png`).

- **Se o arquivo existir** → o lutador usa o sprite animado.
- **Se não existir** → o lutador usa o ninja desenhado por código (fallback).

Formato: PNG único com frames em **grade regular** (todos do mesmo tamanho, ex.: 64×64), fundo transparente, ordem esquerda→direita, cima→baixo. Depois ajuste `frameWidth`/`frameHeight` e os índices das animações em [src/sprites.ts](src/sprites.ts). Veja o guia completo em [public/sprites/LEIA-ME.txt](public/sprites/LEIA-ME.txt).

## ☁️ Deploy no Cloudflare Pages

O projeto já vem com [wrangler.json](wrangler.json) configurado para Cloudflare Pages (saída em `dist`).

**Pela dashboard do Cloudflare:**
- Build command: `npm run build`
- Build output directory: `dist`

**Pela CLI (Wrangler):**

```bash
npm run build
npx wrangler pages deploy dist
```

## 🤝 Contribuindo

Contribuições são bem-vindas! Abra uma issue para discutir mudanças maiores antes de enviar um PR. Sugestões de personagens, golpes, correções de física e novos spritesheets são especialmente úteis.

## 📄 Licença

Código-fonte disponibilizado sob a licença **MIT** (veja `LICENSE`).

Todos os personagens, nomes e a marca **Naruto** pertencem aos seus respectivos detentores de direitos. Nenhum asset com direitos autorais é distribuído neste repositório — os spritesheets são fornecidos por você, localmente. Este é um projeto de fã, sem fins lucrativos.
