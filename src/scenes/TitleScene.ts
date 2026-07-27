import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT } from "../config";

// Tela de titulo + selecao de modo (1P vs CPU ou 2P local).
export class TitleScene extends Phaser.Scene {
  private modeIndex = 0;
  private modes = ["1 JOGADOR (vs CPU)", "2 JOGADORES (local)"];
  private modeTexts: Phaser.GameObjects.Text[] = [];
  private blink!: Phaser.Time.TimerEvent;

  constructor() {
    super("Title");
  }

  create() {
    this.modeIndex = 0;
    this.modeTexts = [];
    this.buildBackground();

    const title = this.add
      .text(GAME_WIDTH / 2, 130, "NARUTO FIGHTER", {
        fontFamily: "Impact, sans-serif",
        fontSize: "64px",
        color: "#ff7a18"
      })
      .setOrigin(0.5);
    title.setStroke("#000000", 8);
    title.setShadow(0, 6, "#00000088", 8, true, true);

    this.add
      .text(GAME_WIDTH / 2, 185, "NINJA BATTLE", {
        fontFamily: "Impact, sans-serif",
        fontSize: "26px",
        color: "#48b3ff"
      })
      .setOrigin(0.5)
      .setStroke("#000000", 5);

    this.modes.forEach((label, i) => {
      const t = this.add
        .text(GAME_WIDTH / 2, 290 + i * 52, label, {
          fontFamily: "Segoe UI, sans-serif",
          fontSize: "26px",
          color: "#ffffff"
        })
        .setOrigin(0.5);
      this.modeTexts.push(t);
    });

    const hint = this.add
      .text(GAME_WIDTH / 2, 470, "W/S ou setas para escolher  -  ENTER para confirmar", {
        fontFamily: "Segoe UI, sans-serif",
        fontSize: "16px",
        color: "#b9beea"
      })
      .setOrigin(0.5);
    this.blink = this.time.addEvent({
      delay: 500,
      loop: true,
      callback: () => hint.setVisible(!hint.visible)
    });

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 22, "Fan game nao-comercial para estudo. Naruto (c) Masashi Kishimoto / Shueisha.", {
        fontFamily: "Segoe UI, sans-serif",
        fontSize: "12px",
        color: "#6a6f96"
      })
      .setOrigin(0.5);

    this.refresh();
    this.bindInput();
  }

  private bindInput() {
    const kb = this.input.keyboard!;
    kb.on("keydown-W", () => this.move(-1));
    kb.on("keydown-UP", () => this.move(-1));
    kb.on("keydown-S", () => this.move(1));
    kb.on("keydown-DOWN", () => this.move(1));
    kb.on("keydown-ENTER", () => this.confirm());
    kb.on("keydown-SPACE", () => this.confirm());
  }

  private move(dir: number) {
    this.modeIndex = Phaser.Math.Wrap(this.modeIndex + dir, 0, this.modes.length);
    this.refresh();
  }

  private refresh() {
    this.modeTexts.forEach((t, i) => {
      if (!t || !t.active) return;
      const on = i === this.modeIndex;
      t.setColor(on ? "#ffcc00" : "#ffffff");
      t.setFontSize(on ? 30 : 26);
      t.setText((on ? "> " : "  ") + this.modes[i] + (on ? " <" : "  "));
    });
  }

  private confirm() {
    const vsCpu = this.modeIndex === 0;
    this.registry.set("vsCpu", vsCpu);
    this.blink.remove();
    this.cameras.main.fadeOut(250, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start("Select");
    });
  }

  private buildBackground() {
    const g = this.add.graphics();
    g.fillGradientStyle(0x1a1030, 0x1a1030, 0x2a1a10, 0x3a1a08, 1);
    g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // "sol" laranja estilo por do sol ninja
    g.fillStyle(0xff7a18, 0.18);
    g.fillCircle(GAME_WIDTH / 2, 160, 220);
    g.fillStyle(0xff7a18, 0.12);
    g.fillCircle(GAME_WIDTH / 2, 160, 320);
  }
}
