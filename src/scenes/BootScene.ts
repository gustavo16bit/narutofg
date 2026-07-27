import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT, UI } from "../config";
import { ROSTER } from "../data";
import { enrichRosterFromApi } from "../api";
import { queueSpriteLoads, createFighterAnimations } from "../sprites";

// Cena de boot: enriquece o roster pela API (com timeout) e carrega os retratos.
// Tudo com fallback para nao travar caso a rede/CORS falhe.
export class BootScene extends Phaser.Scene {
  constructor() {
    super("Boot");
  }

  preload() {
    this.load.crossOrigin = "anonymous";
  }

  async create() {
    this.cameras.main.setBackgroundColor(UI.bg);

    const title = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 20, "NARUTO FIGHTER", {
        fontFamily: "Impact, sans-serif",
        fontSize: "48px",
        color: "#ff7a18"
      })
      .setOrigin(0.5);
    title.setStroke("#000000", 6);

    const status = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 40, "Carregando dados ninja...", {
        fontFamily: "Segoe UI, sans-serif",
        fontSize: "18px",
        color: "#b9beea"
      })
      .setOrigin(0.5);

    let started = false;
    const goTitle = () => {
      if (started) return;
      started = true;
      // cria animacoes dos chars com spritesheet (blindado, nunca lanca)
      for (const char of ROSTER) createFighterAnimations(this, char.id);
      this.scene.start("Title");
    };

    // TRAVA DE SEGURANCA (timer do browser, independente do Phaser e da rede)
    window.setTimeout(goTitle, 6000);

    // API com teto rigido de tempo (onrender pode estar cold/lento) - nunca trava o boot
    const ok = await Promise.race<boolean>([
      enrichRosterFromApi().catch(() => false),
      new Promise<boolean>((r) => window.setTimeout(() => r(false), 3500))
    ]);
    if (started) return; // a trava ja disparou
    status.setText(ok ? "Dados carregados. Preparando assets..." : "Usando dados locais.");

    // 2) enfileira retratos remotos (fallback tratado no SelectScene)
    for (const char of ROSTER) {
      if (char.portraitUrl) {
        this.load.image(`portrait-${char.id}`, char.portraitUrl);
      }
    }

    // 3) enfileira spritesheets locais (public/sprites/<id>.png). Ausentes usam ninja desenhado.
    queueSpriteLoads(this);

    this.load.once(Phaser.Loader.Events.COMPLETE, goTitle);
    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: Phaser.Loader.File) => {
      console.warn("[boot] asset ausente/ignorado:", file.key);
    });

    this.load.start();
  }
}
