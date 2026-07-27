// Pipeline de spritesheets (opcional).
// Cada personagem pode ter um spritesheet em public/sprites/<id>.png.
// Se o arquivo existir, o Fighter usa o sprite animado; senao, cai no ninja desenhado por codigo.
//
// COMO ADICIONAR SEUS SPRITES:
// 1) Exporte o char do MUGEN/Spriters como um spritesheet PNG em GRADE (frames do mesmo tamanho).
// 2) Salve em: public/sprites/<id>.png  (ex.: public/sprites/naruto.png)
// 3) Ajuste aqui em SPRITE_OVERRIDES o frameWidth/frameHeight do SEU sheet e os indices
//    de frame de cada animacao (idle, walk, punch, ...). O indice 0 e o primeiro frame,
//    contando da esquerda pra direita, de cima pra baixo.
// 4) Recarregue o jogo. Pronto.

import Phaser from "phaser";
import { ROSTER } from "./data";

export type AnimKey =
  | "idle"
  | "walk"
  | "crouch"
  | "jump"
  | "punch"
  | "kick"
  | "special"
  | "hit"
  | "block"
  | "ko";

export interface AnimDef {
  frames: number[]; // indices de frame no sheet
  frameRate: number;
  repeat: number; // -1 = loop infinito, 0 = toca uma vez
}

export interface SpriteConfig {
  frameWidth: number;
  frameHeight: number;
  scale: number; // escala de renderizacao
  originY: number; // 0..1 - onde ficam os pes no frame (1 = base do frame)
  flipDefault: boolean; // true se o sprite "olha" para a esquerda por padrao
  anims: Record<AnimKey, AnimDef>;
}

// Config padrao (assume grade de 64x64, 24 frames em sequencia).
// Ajuste conforme o SEU sheet em SPRITE_OVERRIDES.
export const DEFAULT_SPRITE_CONFIG: SpriteConfig = {
  frameWidth: 64,
  frameHeight: 64,
  scale: 2.2,
  originY: 0.96,
  flipDefault: false,
  anims: {
    idle: { frames: [0, 1, 2, 3], frameRate: 6, repeat: -1 },
    walk: { frames: [4, 5, 6, 7], frameRate: 10, repeat: -1 },
    crouch: { frames: [8], frameRate: 1, repeat: -1 },
    jump: { frames: [9], frameRate: 1, repeat: 0 },
    punch: { frames: [10, 11, 12], frameRate: 18, repeat: 0 },
    kick: { frames: [13, 14, 15], frameRate: 16, repeat: 0 },
    special: { frames: [16, 17, 18, 19], frameRate: 14, repeat: 0 },
    hit: { frames: [20], frameRate: 1, repeat: 0 },
    block: { frames: [21], frameRate: 1, repeat: -1 },
    ko: { frames: [22, 23], frameRate: 6, repeat: 0 }
  }
};

// Overrides por personagem. Deixe {} para usar o padrao.
// Ex.: naruto: { frameWidth: 80, frameHeight: 80, anims: { punch: { frames:[10,11], frameRate:16, repeat:0 } } }
export const SPRITE_OVERRIDES: Record<string, Partial<SpriteConfig>> = {
  naruto: {},
  sasuke: {},
  sakura: {},
  rocklee: {},
  gaara: {},
  kakashi: {}
};

export function getSpriteConfig(charId: string): SpriteConfig {
  const ov = SPRITE_OVERRIDES[charId] ?? {};
  return {
    ...DEFAULT_SPRITE_CONFIG,
    ...ov,
    anims: { ...DEFAULT_SPRITE_CONFIG.anims, ...(ov.anims ?? {}) }
  };
}

export function spriteTextureKey(charId: string): string {
  return `sheet-${charId}`;
}

// Enfileira o carregamento dos spritesheets de todo o roster.
// Arquivos ausentes simplesmente disparam erro de load (tratado) e o char usa o modo desenhado.
export function queueSpriteLoads(scene: Phaser.Scene) {
  for (const char of ROSTER) {
    const cfg = getSpriteConfig(char.id);
    scene.load.spritesheet(spriteTextureKey(char.id), `sprites/${char.id}.png`, {
      frameWidth: cfg.frameWidth,
      frameHeight: cfg.frameHeight
    });
  }
}

// Cria as animacoes de um personagem, se o spritesheet foi carregado corretamente.
// Retorna true se o char tem sprite disponivel. Blindado: nunca lanca excecao.
export function createFighterAnimations(scene: Phaser.Scene, charId: string): boolean {
  const key = spriteTextureKey(charId);
  if (!scene.textures.exists(key)) return false;

  try {
    const tex = scene.textures.get(key);
    // Phaser adiciona um frame __BASE; total real = frameTotal - 1
    const totalFrames = tex.frameTotal - 1;
    // textura quebrada (ex.: arquivo ausente/HTML) nao tem frames validos
    if (!totalFrames || totalFrames < 1) {
      scene.textures.remove(key);
      return false;
    }

    const cfg = getSpriteConfig(charId);

    (Object.keys(cfg.anims) as AnimKey[]).forEach((animKey) => {
      const fullKey = `${charId}-${animKey}`;
      if (scene.anims.exists(fullKey)) return;

      const def = cfg.anims[animKey];
      // filtra frames que realmente existem no sheet (evita erro se o sheet for menor)
      const valid = def.frames.filter((f) => f < totalFrames);
      const use = valid.length > 0 ? valid : [0];

      scene.anims.create({
        key: fullKey,
        frames: scene.anims.generateFrameNumbers(key, { frames: use }),
        frameRate: def.frameRate,
        repeat: def.repeat
      });
    });

    return true;
  } catch (err) {
    console.warn(`[sprites] spritesheet invalido para ${charId}, usando ninja desenhado.`, err);
    return false;
  }
}
