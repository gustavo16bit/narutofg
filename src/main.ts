import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT, UI } from "./config";
import { BootScene } from "./scenes/BootScene";
import { TitleScene } from "./scenes/TitleScene";
import { SelectScene } from "./scenes/SelectScene";
import { FightScene } from "./scenes/FightScene";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "game",
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: UI.bg,
  pixelArt: true,
  roundPixels: true,
  render: {
    // permite que ferramentas externas capturem o frame renderizado
    preserveDrawingBuffer: true
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [BootScene, TitleScene, SelectScene, FightScene]
};

// eslint-disable-next-line no-new
const game = new Phaser.Game(config);
// exposto para debug/testes automatizados
(window as unknown as { game: Phaser.Game }).game = game;
