// Constantes globais do jogo (dimensoes, fisica, regras de luta)

export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;

// Chao onde os pes dos lutadores ficam
export const GROUND_Y = 470;

// Fisica manual (estilo fighting game classico, sem arcade physics)
export const GRAVITY = 1900; // px/s^2
export const WORLD_LEFT = 40;
export const WORLD_RIGHT = GAME_WIDTH - 40;

// Regras de partida
export const ROUND_TIME = 60; // segundos
export const ROUNDS_TO_WIN = 2; // melhor de 3

// Barra de chakra
export const CHAKRA_MAX = 100;
export const CHAKRA_REGEN = 12; // por segundo
export const CHAKRA_ON_HIT = 8; // ganho ao acertar
export const CHAKRA_ON_TAKE = 5; // ganho ao tomar dano

// Cores da UI
export const UI = {
  bg: 0x0b0d17,
  panel: 0x141830,
  accent: 0xff7a18,
  accent2: 0x48b3ff,
  ink: 0xf5f6ff,
  danger: 0xff3b3b,
  healthHi: 0x3ad46b,
  healthMid: 0xffcc00,
  healthLo: 0xff3b3b
};
