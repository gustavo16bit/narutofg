import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT } from "../config";
import { ROSTER, STAGES, CharDef, CharColors } from "../data";

type Phase = "chars" | "stage";

interface Cursor {
  index: number;
  locked: boolean;
  color: number;
}

// Tela de selecao: personagens (P1 e P2/CPU) e depois cenario.
export class SelectScene extends Phaser.Scene {
  private cols = 3;
  private cellW = 150;
  private cellH = 150;
  private gridX = 0;
  private gridY = 0;

  private p1: Cursor = { index: 0, locked: false, color: 0x48b3ff };
  private p2: Cursor = { index: 1, locked: false, color: 0xff3b3b };
  private vsCpu = false;

  private phase: Phase = "chars";
  private stageIndex = 0;

  private cursorGfx!: Phaser.GameObjects.Graphics;
  private infoText!: Phaser.GameObjects.Text;
  private p1Label!: Phaser.GameObjects.Text;
  private p2Label!: Phaser.GameObjects.Text;
  private stageContainer!: Phaser.GameObjects.Container;

  constructor() {
    super("Select");
  }

  create() {
    this.vsCpu = this.registry.get("vsCpu") ?? true;
    this.p1 = { index: 0, locked: false, color: 0x48b3ff };
    this.p2 = { index: this.vsCpu ? Phaser.Math.Between(1, ROSTER.length - 1) : 1, locked: false, color: 0xff3b3b };
    this.phase = "chars";
    this.stageIndex = 0;

    this.cameras.main.fadeIn(250, 0, 0, 0);
    this.buildBackground();

    this.add
      .text(GAME_WIDTH / 2, 34, "ESCOLHA SEU NINJA", {
        fontFamily: "Impact, sans-serif",
        fontSize: "34px",
        color: "#ffcc00"
      })
      .setOrigin(0.5)
      .setStroke("#000000", 6);

    // grade de personagens
    const rows = Math.ceil(ROSTER.length / this.cols);
    const gridW = this.cols * this.cellW;
    const gridH = rows * this.cellH;
    this.gridX = (GAME_WIDTH - gridW) / 2;
    this.gridY = 90;

    ROSTER.forEach((char, i) => this.drawCell(char, i));

    this.cursorGfx = this.add.graphics();

    this.p1Label = this.add
      .text(this.gridX + 8, this.gridY + gridH + 14, "P1: escolha (A/D/W/S, F confirma)", {
        fontFamily: "Segoe UI, sans-serif",
        fontSize: "16px",
        color: "#8fd0ff"
      })
      .setOrigin(0, 0);

    this.p2Label = this.add
      .text(this.gridX + gridW - 8, this.gridY + gridH + 14, this.vsCpu ? "P2: CPU" : "P2: setas, K confirma", {
        fontFamily: "Segoe UI, sans-serif",
        fontSize: "16px",
        color: "#ff9d9d"
      })
      .setOrigin(1, 0);

    this.infoText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 26, "", {
        fontFamily: "Segoe UI, sans-serif",
        fontSize: "15px",
        color: "#b9beea"
      })
      .setOrigin(0.5);

    this.buildStageSelect();

    this.bindInput();
    this.updateCursors();

    // no modo CPU o P2 escolhe sozinho apos um instante
    if (this.vsCpu) {
      this.time.delayedCall(700, () => {
        this.p2.locked = true;
        this.updateCursors();
        this.checkPhaseAdvance();
      });
    }
  }

  private drawCell(char: CharDef, i: number) {
    const { x, y } = this.cellPos(i);
    const cx = x + this.cellW / 2;

    const bg = this.add.graphics();
    bg.fillStyle(0x141830, 0.9);
    bg.fillRoundedRect(x + 6, y + 6, this.cellW - 12, this.cellH - 12, 10);
    bg.lineStyle(2, 0x2a2f52, 1);
    bg.strokeRoundedRect(x + 6, y + 6, this.cellW - 12, this.cellH - 12, 10);

    // retrato: textura da API se existir, senao rosto desenhado
    const key = `portrait-${char.id}`;
    if (this.textures.exists(key)) {
      const img = this.add.image(cx, y + 62, key);
      const maxW = this.cellW - 30;
      const maxH = 84;
      const scale = Math.min(maxW / img.width, maxH / img.height);
      img.setScale(scale);
      img.setOrigin(0.5, 0.5);
    } else {
      this.drawFace(cx, y + 58, 64, char.colors);
    }

    this.add
      .text(cx, y + this.cellH - 28, char.name, {
        fontFamily: "Segoe UI, sans-serif",
        fontSize: "16px",
        color: "#ffffff",
        fontStyle: "bold"
      })
      .setOrigin(0.5);
  }

  // Desenha um rosto ninja estilizado (fallback quando nao ha retrato da API)
  private drawFace(cx: number, cy: number, size: number, colors: CharColors) {
    const g = this.add.graphics();
    const r = size / 2;

    // cabelo (atras)
    g.fillStyle(colors.hair, 1);
    g.fillCircle(cx, cy - 4, r + 6);

    // rosto
    g.fillStyle(colors.skin, 1);
    g.fillCircle(cx, cy, r);

    // faixa (headband) com placa metalica
    g.fillStyle(colors.headband, 1);
    g.fillRect(cx - r - 2, cy - r + 4, (r + 2) * 2, 12);
    g.fillStyle(0x9aa4b2, 1);
    g.fillRoundedRect(cx - 12, cy - r + 3, 24, 14, 3);
    g.lineStyle(2, 0x5a6472, 1);
    g.strokeRoundedRect(cx - 12, cy - r + 3, 24, 14, 3);
    // espiral estilizada na placa
    g.lineStyle(2, 0x33405e, 1);
    g.strokeCircle(cx, cy - r + 10, 4);

    // olhos
    g.fillStyle(0x1a1a1a, 1);
    g.fillCircle(cx - 9, cy + 4, 3.2);
    g.fillCircle(cx + 9, cy + 4, 3.2);
  }

  private cellPos(i: number) {
    const col = i % this.cols;
    const row = Math.floor(i / this.cols);
    return { x: this.gridX + col * this.cellW, y: this.gridY + row * this.cellH };
  }

  private bindInput() {
    const kb = this.input.keyboard!;
    // P1
    kb.on("keydown-A", () => this.moveCursor(this.p1, -1, 0));
    kb.on("keydown-D", () => this.moveCursor(this.p1, 1, 0));
    kb.on("keydown-W", () => this.moveCursor(this.p1, 0, -1));
    kb.on("keydown-S", () => this.moveCursor(this.p1, 0, 1));
    kb.on("keydown-F", () => this.confirm(this.p1));
    // P2 (so quando nao e CPU)
    kb.on("keydown-LEFT", () => this.onP2(-1, 0));
    kb.on("keydown-RIGHT", () => this.onP2(1, 0));
    kb.on("keydown-UP", () => this.onP2(0, -1));
    kb.on("keydown-DOWN", () => this.onP2(0, 1));
    kb.on("keydown-K", () => { if (!this.vsCpu) this.confirm(this.p2); });
    // geral
    kb.on("keydown-ENTER", () => this.onEnter());
    kb.on("keydown-ESC", () => this.onBack());
  }

  private onP2(dx: number, dy: number) {
    if (this.vsCpu) {
      // no modo CPU as setas controlam o cenario na fase de stage
      if (this.phase === "stage") this.moveStage(dx + dy);
      return;
    }
    this.moveCursor(this.p2, dx, dy);
  }

  private onEnter() {
    if (this.phase === "stage") this.startFight();
  }

  private onBack() {
    if (this.phase === "stage") {
      this.phase = "chars";
      this.p1.locked = false;
      this.p2.locked = this.vsCpu ? true : false;
      this.stageContainer.setVisible(false);
      this.updateCursors();
    } else {
      this.scene.start("Title");
    }
  }

  private moveCursor(cur: Cursor, dx: number, dy: number) {
    if (this.phase !== "chars" || cur.locked) return;
    const col = cur.index % this.cols;
    const row = Math.floor(cur.index / this.cols);
    const rows = Math.ceil(ROSTER.length / this.cols);
    let nc = Phaser.Math.Wrap(col + dx, 0, this.cols);
    let nr = Phaser.Math.Wrap(row + dy, 0, rows);
    let ni = nr * this.cols + nc;
    if (ni >= ROSTER.length) ni = ROSTER.length - 1;
    cur.index = ni;
    this.updateCursors();
  }

  private confirm(cur: Cursor) {
    if (this.phase !== "chars") return;
    cur.locked = !cur.locked;
    this.updateCursors();
    this.checkPhaseAdvance();
  }

  private checkPhaseAdvance() {
    if (this.p1.locked && this.p2.locked) {
      this.phase = "stage";
      this.stageContainer.setVisible(true);
      this.updateStage();
      this.infoText.setText("");
    }
  }

  private updateCursors() {
    this.cursorGfx.clear();
    if (this.phase !== "chars") {
      this.drawCursor(this.p1, 0);
      this.drawCursor(this.p2, 6);
      return;
    }
    this.drawCursor(this.p1, 0);
    this.drawCursor(this.p2, 6);

    const c1 = ROSTER[this.p1.index];
    const c2 = ROSTER[this.p2.index];
    this.p1Label.setText(`P1: ${c1.name}${this.p1.locked ? " [PRONTO]" : ""}`);
    this.p2Label.setText(this.vsCpu ? `P2 (CPU): ${c2.name}` : `P2: ${c2.name}${this.p2.locked ? " [PRONTO]" : ""}`);
    this.infoText.setText(`"${c1.title}"  -  Jutsu: ${c1.special.name}`);
  }

  private drawCursor(cur: Cursor, inset: number) {
    const { x, y } = this.cellPos(cur.index);
    this.cursorGfx.lineStyle(cur.locked ? 5 : 3, cur.color, 1);
    this.cursorGfx.strokeRoundedRect(
      x + 6 + inset,
      y + 6 + inset,
      this.cellW - 12 - inset * 2,
      this.cellH - 12 - inset * 2,
      10
    );
  }

  // ----- selecao de cenario -----
  private buildStageSelect() {
    this.stageContainer = this.add.container(0, 0).setVisible(false);

    const panel = this.add.graphics();
    panel.fillStyle(0x0b0d17, 0.82);
    panel.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.stageContainer.add(panel);

    const title = this.add
      .text(GAME_WIDTH / 2, 90, "ESCOLHA O CENARIO", {
        fontFamily: "Impact, sans-serif",
        fontSize: "34px",
        color: "#ffcc00"
      })
      .setOrigin(0.5)
      .setStroke("#000000", 6);
    this.stageContainer.add(title);

    this.stagePreview = this.add.graphics();
    this.stageContainer.add(this.stagePreview);

    this.stageName = this.add
      .text(GAME_WIDTH / 2, 400, "", {
        fontFamily: "Segoe UI, sans-serif",
        fontSize: "24px",
        color: "#ffffff",
        fontStyle: "bold"
      })
      .setOrigin(0.5);
    this.stageContainer.add(this.stageName);

    const hint = this.add
      .text(GAME_WIDTH / 2, 460, "A/D ou setas para trocar  -  ENTER para LUTAR", {
        fontFamily: "Segoe UI, sans-serif",
        fontSize: "16px",
        color: "#b9beea"
      })
      .setOrigin(0.5);
    this.stageContainer.add(hint);
  }

  private stagePreview!: Phaser.GameObjects.Graphics;
  private stageName!: Phaser.GameObjects.Text;

  private moveStage(dir: number) {
    if (this.phase !== "stage" || dir === 0) return;
    this.stageIndex = Phaser.Math.Wrap(this.stageIndex + Math.sign(dir), 0, STAGES.length);
    this.updateStage();
  }

  private updateStage() {
    const s = STAGES[this.stageIndex];
    const g = this.stagePreview;
    g.clear();
    const px = GAME_WIDTH / 2 - 220;
    const py = 140;
    const w = 440;
    const h = 230;
    // ceu
    g.fillGradientStyle(s.skyTop, s.skyTop, s.skyBottom, s.skyBottom, 1);
    g.fillRect(px, py, w, h - 50);
    // chao
    g.fillStyle(s.groundColor, 1);
    g.fillRect(px, py + h - 50, w, 50);
    g.fillStyle(s.accent, 1);
    g.fillRect(px, py + h - 50, w, 8);
    // moldura
    g.lineStyle(3, 0xffffff, 0.9);
    g.strokeRect(px, py, w, h);
    this.stageName.setText(s.name);
  }

  private startFight() {
    this.registry.set("p1Char", ROSTER[this.p1.index].id);
    this.registry.set("p2Char", ROSTER[this.p2.index].id);
    this.registry.set("stage", STAGES[this.stageIndex].id);
    this.registry.set("vsCpu", this.vsCpu);
    this.cameras.main.fadeOut(250, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start("Fight");
    });
  }

  private buildBackground() {
    const g = this.add.graphics();
    g.fillGradientStyle(0x11142a, 0x11142a, 0x1c1030, 0x1c1030, 1);
    g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  }
}
