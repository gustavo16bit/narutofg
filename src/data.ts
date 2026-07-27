// Roster e definicoes de golpes.
// Dados embutidos (fallback), enriquecidos em runtime pela Dattebayo API quando disponivel.

export type SpecialType = "projectile" | "dash" | "shockwave";

export interface MoveDef {
  name: string;
  damage: number;
  startup: number; // frames ate ficar ativo
  active: number; // frames com hitbox ativa
  recovery: number; // frames de recuperacao
  range: number; // alcance horizontal do hitbox
  reach: number; // altura do hitbox
  knockback: number;
  hitstun: number; // frames que o oponente fica travado ao ser atingido
}

export interface SpecialDef {
  name: string;
  type: SpecialType;
  damage: number;
  chakraCost: number;
  color: number; // cor do efeito
  speed: number; // velocidade do projetil (se aplicavel)
  knockback: number;
  hitstun: number;
  startup: number;
  active: number;
  recovery: number;
}

export interface CharColors {
  primary: number; // roupa principal
  secondary: number; // detalhe
  skin: number;
  hair: number;
  headband: number; // faixa (tecido)
}

export interface CharDef {
  id: string;
  name: string;
  title: string;
  apiName: string; // nome usado pra casar com a Dattebayo API
  colors: CharColors;
  speed: number; // velocidade de andar (px/s)
  jump: number; // impulso de pulo (px/s)
  maxHealth: number;
  punch: MoveDef;
  kick: MoveDef;
  special: SpecialDef;
  // preenchido em runtime pela API (opcional)
  portraitUrl?: string;
  jutsuList?: string[];
}

const basePunch: MoveDef = {
  name: "Soco",
  damage: 6,
  startup: 4,
  active: 4,
  recovery: 9,
  range: 60,
  reach: 40,
  knockback: 120,
  hitstun: 14
};

const baseKick: MoveDef = {
  name: "Chute",
  damage: 9,
  startup: 7,
  active: 5,
  recovery: 15,
  range: 78,
  reach: 55,
  knockback: 220,
  hitstun: 20
};

export const ROSTER: CharDef[] = [
  {
    id: "naruto",
    name: "Naruto",
    title: "O Ninja Numero 1 Hiperativo",
    apiName: "Naruto Uzumaki",
    colors: {
      primary: 0xff7a18, // laranja
      secondary: 0x1b3a6b, // azul
      skin: 0xffcc99,
      hair: 0xffd83d,
      headband: 0x2b3a67
    },
    speed: 250,
    jump: 720,
    maxHealth: 200,
    punch: { ...basePunch },
    kick: { ...baseKick },
    special: {
      name: "Rasengan",
      type: "projectile",
      damage: 20,
      chakraCost: 45,
      color: 0x59c3ff,
      speed: 520,
      knockback: 420,
      hitstun: 34,
      startup: 12,
      active: 6,
      recovery: 22
    }
  },
  {
    id: "sasuke",
    name: "Sasuke",
    title: "Ultimo dos Uchiha",
    apiName: "Sasuke Uchiha",
    colors: {
      primary: 0x1c2749, // azul escuro
      secondary: 0xffffff,
      skin: 0xffe0bd,
      hair: 0x21252e,
      headband: 0x2b3a67
    },
    speed: 275,
    jump: 760,
    maxHealth: 190,
    punch: { ...basePunch, damage: 6 },
    kick: { ...baseKick, damage: 9 },
    special: {
      name: "Chidori",
      type: "dash",
      damage: 24,
      chakraCost: 50,
      color: 0x9fdcff,
      speed: 700,
      knockback: 320,
      hitstun: 30,
      startup: 8,
      active: 12,
      recovery: 20
    }
  },
  {
    id: "sakura",
    name: "Sakura",
    title: "Punho de Chakra",
    apiName: "Sakura Haruno",
    colors: {
      primary: 0xd83b6b, // vermelho/rosa
      secondary: 0xf6d1de,
      skin: 0xffe0bd,
      hair: 0xff8fb3,
      headband: 0xd83b6b
    },
    speed: 245,
    jump: 700,
    maxHealth: 205,
    punch: { ...basePunch, damage: 8 },
    kick: { ...baseKick, damage: 10, knockback: 260 },
    special: {
      name: "Impacto Sakura",
      type: "shockwave",
      damage: 26,
      chakraCost: 55,
      color: 0xff7ab0,
      speed: 0,
      knockback: 480,
      hitstun: 36,
      startup: 12,
      active: 6,
      recovery: 26
    }
  },
  {
    id: "rocklee",
    name: "Rock Lee",
    title: "Fera Verde de Konoha",
    apiName: "Rock Lee",
    colors: {
      primary: 0x1f8f3a, // verde
      secondary: 0xff7a18,
      skin: 0xffcc99,
      hair: 0x1a1a1a,
      headband: 0x1f8f3a
    },
    speed: 300,
    jump: 800,
    maxHealth: 195,
    punch: { ...basePunch, damage: 7, startup: 3, recovery: 8 },
    kick: { ...baseKick, damage: 11, startup: 6 },
    special: {
      name: "Furacao da Folha",
      type: "dash",
      damage: 22,
      chakraCost: 45,
      color: 0x8fe39a,
      speed: 640,
      knockback: 360,
      hitstun: 28,
      startup: 6,
      active: 12,
      recovery: 18
    }
  },
  {
    id: "gaara",
    name: "Gaara",
    title: "Deserto da Areia",
    apiName: "Gaara",
    colors: {
      primary: 0x7a3b2e, // marrom avermelhado
      secondary: 0xd9c27a,
      skin: 0xffe0bd,
      hair: 0xc0392b,
      headband: 0x6b4a2a
    },
    speed: 220,
    jump: 660,
    maxHealth: 215,
    punch: { ...basePunch, damage: 6, range: 66 },
    kick: { ...baseKick, damage: 9 },
    special: {
      name: "Shuriken de Areia",
      type: "projectile",
      damage: 18,
      chakraCost: 40,
      color: 0xe0c98a,
      speed: 460,
      knockback: 380,
      hitstun: 30,
      startup: 10,
      active: 6,
      recovery: 20
    }
  },
  {
    id: "kakashi",
    name: "Kakashi",
    title: "Ninja Copiador",
    apiName: "Kakashi Hatake",
    colors: {
      primary: 0x2b3a52, // azul acinzentado
      secondary: 0x8a95a5,
      skin: 0xffe0bd,
      hair: 0xd7dbe0,
      headband: 0x2b3a67
    },
    speed: 260,
    jump: 740,
    maxHealth: 195,
    punch: { ...basePunch },
    kick: { ...baseKick },
    special: {
      name: "Lamina Relampago",
      type: "projectile",
      damage: 21,
      chakraCost: 48,
      color: 0xbfe4ff,
      speed: 560,
      knockback: 400,
      hitstun: 32,
      startup: 11,
      active: 6,
      recovery: 20
    }
  }
];

export function getCharById(id: string): CharDef {
  return ROSTER.find((c) => c.id === id) ?? ROSTER[0];
}

// Cenarios (stages) desenhados por codigo
export interface StageDef {
  id: string;
  name: string;
  skyTop: number;
  skyBottom: number;
  groundColor: number;
  accent: number;
}

export const STAGES: StageDef[] = [
  { id: "konoha", name: "Vila da Folha", skyTop: 0x2a5a9c, skyBottom: 0x9ad0e6, groundColor: 0x3a7a3a, accent: 0x2f5f2f },
  { id: "suna", name: "Deserto de Suna", skyTop: 0xe8a24a, skyBottom: 0xf7d79a, groundColor: 0xd9b877, accent: 0xc0a060 },
  { id: "valley", name: "Vale do Fim", skyTop: 0x33405e, skyBottom: 0x7d8aa8, groundColor: 0x4a5568, accent: 0x2f3646 }
];

export function getStageById(id: string): StageDef {
  return STAGES.find((s) => s.id === id) ?? STAGES[0];
}
