import Phaser from "phaser";
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  GROUND_Y,
  ROUND_TIME,
  ROUNDS_TO_WIN,
  CHAKRA_MAX,
  CHAKRA_REGEN,
  UI
} from "../config";
import { getCharById, getStageById } from "../data";
import { Fighter, FighterInput, emptyInput } from "../objects/Fighter";
import { Projectile, ProjectileStyle } from "../objects/Projectile";

type Phase = "intro" | "fight" | "roundEnd" | "matchEnd";

const STYLE_MAP: Record<string, ProjectileStyle> = {
  naruto: "rasengan",
  gaara: "sand",
  kakashi: "lightning"
};

export class FightScene extends Phaser.Scene {
  private f1!: Fighter;
  private f2!: Fighter;
  private vsCpu = true;
  private projectiles: Projectile[] = [];

  private phase: Phase = "intro";
  private roundNum = 1;
  private timeLeft = ROUND_TIME;
  private timerAccum = 0;

  // camadas de desenho
  private bg!: Phaser.GameObjects.Graphics;
  private hud!: Phaser.GameObjects.Graphics;
  private centerText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;

  // teclado
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;

  // IA
  private aiTimer = 0;
  private aiDecision: FighterInput = emptyInput();

  constructor() {
    super("Fight");
  }

  create() {
    this.vsCpu = this.registry.get("vsCpu") ?? true;
    const c1 = getCharById(this.registry.get("p1Char") ?? "naruto");
    const c2 = getCharById(this.registry.get("p2Char") ?? "sasuke");
    const stage = getStageById(this.registry.get("stage") ?? "konoha");

    this.projectiles = [];
    this.phase = "intro";
    this.roundNum = 1;

    this.cameras.main.fadeIn(250, 0, 0, 0);

    // fundo (cenario)
    this.bg = this.add.graphics().setDepth(0);
    this.drawStage(stage.skyTop, stage.skyBottom, stage.groundColor, stage.accent);

    // lutadores
    this.f1 = new Fighter(this, c1, 300, 1, 1);
    this.f2 = new Fighter(this, c2, 660, -1, 2);
    this.f1.onSpawnProjectile = (f) => this.spawnProjectile(f);
    this.f2.onSpawnProjectile = (f) => this.spawnProjectile(f);

    // HUD
    this.hud = this.add.graphics().setDepth(30);
    this.add
      .text(30, 20, c1.name.toUpperCase(), hudNameStyle())
      .setDepth(31);
    this.add
      .text(GAME_WIDTH - 30, 20, c2.name.toUpperCase() + (this.vsCpu ? " (CPU)" : ""), hudNameStyle())
      .setOrigin(1, 0)
      .setDepth(31);

    this.timerText = this.add
      .text(GAME_WIDTH / 2, 24, `${ROUND_TIME}`, {
        fontFamily: "Impact, sans-serif",
        fontSize: "40px",
        color: "#ffffff"
      })
      .setOrigin(0.5, 0)
      .setDepth(31)
      .setStroke("#000000", 6);

    this.centerText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 30, "", {
        fontFamily: "Impact, sans-serif",
        fontSize: "72px",
        color: "#ffcc00"
      })
      .setOrigin(0.5)
      .setDepth(32)
      .setStroke("#000000", 8);

    this.setupKeys();
    this.startRound();
  }

  private setupKeys() {
    const kb = this.input.keyboard!;
    const K = Phaser.Input.Keyboard.KeyCodes;
    this.keys = {
      // P1
      p1_left: kb.addKey(K.A),
      p1_right: kb.addKey(K.D),
      p1_up: kb.addKey(K.W),
      p1_down: kb.addKey(K.S),
      p1_punch: kb.addKey(K.F),
      p1_kick: kb.addKey(K.G),
      p1_special: kb.addKey(K.H),
      // P2
      p2_left: kb.addKey(K.LEFT),
      p2_right: kb.addKey(K.RIGHT),
      p2_up: kb.addKey(K.UP),
      p2_down: kb.addKey(K.DOWN),
      p2_punch: kb.addKey(K.K),
      p2_kick: kb.addKey(K.L),
      p2_special: kb.addKey(186) // ; (ponto e virgula)
    };
    kb.on("keydown-ESC", () => this.scene.start("Title"));
  }

  private startRound() {
    this.phase = "intro";
    this.timeLeft = ROUND_TIME;
    this.timerAccum = 0;
    this.f1.resetForRound(300, 1);
    this.f2.resetForRound(660, -1);
    this.projectiles.forEach((p) => p.destroy());
    this.projectiles = [];

    this.centerText.setText(`ROUND ${this.roundNum}`);
    this.centerText.setScale(1);
    this.centerText.setAlpha(1);

    this.time.delayedCall(900, () => {
      this.centerText.setText("LUTEM!");
      this.tweens.add({
        targets: this.centerText,
        scale: 1.4,
        alpha: 0,
        duration: 700,
        onComplete: () => {
          this.centerText.setText("");
          this.centerText.setAlpha(1);
          this.centerText.setScale(1);
          this.phase = "fight";
        }
      });
    });
  }

  update(_time: number, delta: number) {
    const dt = Math.min(delta / 1000, 1 / 30);

    // olhar um pro outro
    if (this.phase !== "matchEnd") {
      this.f1.faceTowards(this.f2.x);
      this.f2.faceTowards(this.f1.x);
    }

    // entradas
    if (this.phase === "fight") {
      this.f1.setInput(this.readInput(1));
      this.f2.setInput(this.vsCpu ? this.runAI(dt) : this.readInput(2));
    } else {
      this.f1.setInput(emptyInput());
      this.f2.setInput(emptyInput());
    }

    this.f1.update(dt);
    this.f2.update(dt);

    this.resolveSeparation();
    this.resolveMelee();
    this.updateProjectiles(dt);

    if (this.phase === "fight") {
      this.regenChakra(dt);
      this.updateTimer(dt);
      this.checkKO();
    }

    this.drawHud();
  }

  // ---------- entradas ----------

  private readInput(player: number): FighterInput {
    const k = this.keys;
    const p = player === 1 ? "p1" : "p2";
    const JD = (key: Phaser.Input.Keyboard.Key) => Phaser.Input.Keyboard.JustDown(key);
    return {
      left: k[`${p}_left`].isDown,
      right: k[`${p}_right`].isDown,
      up: k[`${p}_up`].isDown,
      down: k[`${p}_down`].isDown,
      punch: JD(k[`${p}_punch`]),
      kick: JD(k[`${p}_kick`]),
      special: JD(k[`${p}_special`])
    };
  }

  // IA simples com cooldown de decisao
  private runAI(dt: number): FighterInput {
    this.aiTimer -= dt;
    const me = this.f2;
    const foe = this.f1;
    const dist = Math.abs(foe.x - me.x);
    const dirToFoe = foe.x < me.x ? "left" : "right";

    if (this.aiTimer <= 0) {
      this.aiTimer = Phaser.Math.FloatBetween(0.12, 0.35);
      const inp = emptyInput();

      // bloqueio reativo se o oponente esta atacando de perto
      if (foe.state === "attack" && dist < 130 && Math.random() < 0.55) {
        inp[dirToFoe === "left" ? "right" : "left"] = true; // segura pra tras
        this.aiDecision = inp;
        return inp;
      }

      if (dist > 150) {
        // aproxima
        inp[dirToFoe] = true;
        if (Math.random() < 0.15) inp.up = true;
      } else if (dist > 80) {
        // media distancia: jutsu as vezes, ou aproxima
        if (me.chakra >= me.char.special.chakraCost && Math.random() < 0.4) {
          inp.special = true;
        } else {
          inp[dirToFoe] = true;
        }
      } else {
        // perto: soco/chute/jutsu
        const r = Math.random();
        if (me.chakra >= me.char.special.chakraCost && r < 0.2) inp.special = true;
        else if (r < 0.6) inp.punch = true;
        else if (r < 0.85) inp.kick = true;
        else inp.up = true;
      }
      this.aiDecision = inp;
      return inp;
    }

    // mantem direcao entre decisoes, mas nao repete os botoes (edge)
    return {
      left: this.aiDecision.left,
      right: this.aiDecision.right,
      up: false,
      down: this.aiDecision.down,
      punch: false,
      kick: false,
      special: false
    };
  }

  // ---------- combate ----------

  private resolveSeparation() {
    // impede sobreposicao dos corpos
    const a = this.f1.getHurtbox();
    const b = this.f2.getHurtbox();
    if (Phaser.Geom.Rectangle.Overlaps(a, b)) {
      const overlap = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      const push = overlap / 2 + 0.5;
      if (this.f1.x < this.f2.x) {
        this.f1.x -= push;
        this.f2.x += push;
      } else {
        this.f1.x += push;
        this.f2.x -= push;
      }
    }
  }

  private resolveMelee() {
    this.tryHit(this.f1, this.f2);
    this.tryHit(this.f2, this.f1);
  }

  private tryHit(attacker: Fighter, defender: Fighter) {
    const hb = attacker.getActiveHitbox();
    if (!hb) return;
    if (!Phaser.Geom.Rectangle.Overlaps(hb.rect, defender.getHurtbox())) return;

    const dir = attacker.facing;
    const res = defender.receiveHit(hb.move.damage, dir, hb.move.knockback, hb.move.hitstun);
    attacker.consumeHit();
    if (res === "hit" || res === "block") {
      attacker.onDealtHit();
      this.spawnSpark(
        hb.rect.centerX,
        hb.rect.centerY,
        res === "block" ? 0x9ad0e6 : 0xffe08a
      );
      this.cameras.main.shake(70, res === "block" ? 0.003 : 0.006);
    }
  }

  private spawnProjectile(f: Fighter) {
    const sp = f.char.special;
    const style = STYLE_MAP[f.char.id] ?? "generic";
    const radius = style === "sand" ? 18 : style === "lightning" ? 16 : 20;
    const px = f.x + f.facing * 40;
    const py = GROUND_Y - 90;
    this.projectiles.push(
      new Projectile(
        this,
        px,
        py,
        f.facing * sp.speed,
        f.playerId,
        sp.damage,
        sp.knockback,
        sp.hitstun,
        sp.color,
        style,
        radius
      )
    );
  }

  private updateProjectiles(dt: number) {
    for (const p of this.projectiles) {
      p.update(dt);
      if (!p.alive) continue;
      const target = p.owner === 1 ? this.f2 : this.f1;
      if (target.dead) continue;
      if (Phaser.Geom.Rectangle.Overlaps(p.getBounds(), target.getHurtbox())) {
        const dir = Math.sign(p.vx) || 1;
        target.receiveHit(p.damage, dir, p.knockback, p.hitstun);
        const owner = p.owner === 1 ? this.f1 : this.f2;
        owner.onDealtHit();
        p.hitSpark();
        p.destroy();
        this.cameras.main.shake(90, 0.008);
      }
    }
    this.projectiles = this.projectiles.filter((p) => p.alive);
  }

  private spawnSpark(x: number, y: number, color: number) {
    const g = this.add.graphics().setDepth(22);
    g.fillStyle(color, 0.95);
    g.fillCircle(x, y, 14);
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(x, y, 6);
    this.tweens.add({
      targets: g,
      alpha: 0,
      scale: 1.8,
      duration: 200,
      onComplete: () => g.destroy()
    });
  }

  private regenChakra(dt: number) {
    this.f1.gainChakra(CHAKRA_REGEN * dt);
    this.f2.gainChakra(CHAKRA_REGEN * dt);
  }

  private updateTimer(dt: number) {
    this.timerAccum += dt;
    if (this.timerAccum >= 1) {
      this.timerAccum -= 1;
      this.timeLeft = Math.max(0, this.timeLeft - 1);
      if (this.timeLeft <= 0) this.endRoundByTime();
    }
    this.timerText.setText(`${this.timeLeft}`);
  }

  private checkKO() {
    if (this.f1.dead || this.f2.dead) {
      this.endRound();
    }
  }

  private endRoundByTime() {
    // quem tiver mais vida vence o round
    if (this.f1.health > this.f2.health) this.f1.roundWins++;
    else if (this.f2.health > this.f1.health) this.f2.roundWins++;
    else {
      this.f1.roundWins++;
      this.f2.roundWins++;
    }
    this.finishRound("TEMPO!");
  }

  private endRound() {
    if (this.f1.dead && !this.f2.dead) this.f2.roundWins++;
    else if (this.f2.dead && !this.f1.dead) this.f1.roundWins++;
    else {
      this.f1.roundWins++;
      this.f2.roundWins++;
    }
    this.finishRound("K.O.");
  }

  private finishRound(label: string) {
    if (this.phase !== "fight") return;
    this.phase = "roundEnd";
    this.f1.freeze();
    this.f2.freeze();
    this.centerText.setText(label);
    this.cameras.main.shake(200, 0.01);

    this.time.delayedCall(1400, () => {
      if (this.f1.roundWins >= ROUNDS_TO_WIN || this.f2.roundWins >= ROUNDS_TO_WIN) {
        this.matchEnd();
      } else {
        this.roundNum++;
        this.startRound();
      }
    });
  }

  private matchEnd() {
    this.phase = "matchEnd";
    const winner = this.f1.roundWins > this.f2.roundWins ? this.f1 : this.f2;
    this.centerText.setText(`${winner.char.name.toUpperCase()} VENCE!`);
    this.time.delayedCall(2600, () => {
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        this.scene.start("Title");
      });
    });
  }

  // ---------- HUD ----------

  private drawHud() {
    const g = this.hud;
    g.clear();

    this.drawHealthBar(g, 30, 46, 380, this.f1.health / this.f1.maxHealth, false);
    this.drawHealthBar(g, GAME_WIDTH - 30 - 380, 46, 380, this.f2.health / this.f2.maxHealth, true);

    this.drawChakraBar(g, 30, 74, 300, this.f1.chakra / CHAKRA_MAX, false);
    this.drawChakraBar(g, GAME_WIDTH - 30 - 300, 74, 300, this.f2.chakra / CHAKRA_MAX, true);

    this.drawRoundPips(g, 30, 92, this.f1.roundWins, false);
    this.drawRoundPips(g, GAME_WIDTH - 30, 92, this.f2.roundWins, true);
  }

  private drawHealthBar(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    w: number,
    ratio: number,
    mirror: boolean
  ) {
    const h = 22;
    ratio = Phaser.Math.Clamp(ratio, 0, 1);
    g.fillStyle(0x000000, 0.6);
    g.fillRect(x - 3, y - 3, w + 6, h + 6);
    g.fillStyle(0x2a2f52, 1);
    g.fillRect(x, y, w, h);

    const color = ratio > 0.5 ? UI.healthHi : ratio > 0.22 ? UI.healthMid : UI.healthLo;
    const fillW = w * ratio;
    g.fillStyle(color, 1);
    if (mirror) g.fillRect(x + (w - fillW), y, fillW, h);
    else g.fillRect(x, y, fillW, h);

    g.lineStyle(2, 0xffffff, 0.8);
    g.strokeRect(x, y, w, h);
  }

  private drawChakraBar(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    w: number,
    ratio: number,
    mirror: boolean
  ) {
    const h = 8;
    ratio = Phaser.Math.Clamp(ratio, 0, 1);
    g.fillStyle(0x101430, 1);
    g.fillRect(x, y, w, h);
    const fillW = w * ratio;
    g.fillStyle(0x48b3ff, 1);
    if (mirror) g.fillRect(x + (w - fillW), y, fillW, h);
    else g.fillRect(x, y, fillW, h);
    g.lineStyle(1, 0x6fd0ff, 0.6);
    g.strokeRect(x, y, w, h);
  }

  private drawRoundPips(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    wins: number,
    mirror: boolean
  ) {
    for (let i = 0; i < ROUNDS_TO_WIN; i++) {
      const cx = mirror ? x - i * 22 - 8 : x + i * 22 + 8;
      g.lineStyle(2, 0xffffff, 0.8);
      g.strokeCircle(cx, y, 7);
      if (i < wins) {
        g.fillStyle(UI.accent, 1);
        g.fillCircle(cx, y, 5);
      }
    }
  }

  // ---------- cenario ----------

  private drawStage(skyTop: number, skyBottom: number, ground: number, accent: number) {
    const g = this.bg;
    g.clear();
    g.fillGradientStyle(skyTop, skyTop, skyBottom, skyBottom, 1);
    g.fillRect(0, 0, GAME_WIDTH, GROUND_Y + 10);

    // silhuetas de fundo (montanhas/predios simples)
    g.fillStyle(accent, 0.5);
    for (let i = 0; i < 6; i++) {
      const bx = 60 + i * 160;
      const bh = 120 + ((i * 53) % 90);
      g.fillTriangle(bx - 90, GROUND_Y, bx, GROUND_Y - bh, bx + 90, GROUND_Y);
    }

    // chao
    g.fillStyle(ground, 1);
    g.fillRect(0, GROUND_Y, GAME_WIDTH, GAME_HEIGHT - GROUND_Y);
    g.fillStyle(accent, 1);
    g.fillRect(0, GROUND_Y, GAME_WIDTH, 8);
  }
}

function hudNameStyle(): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: "Impact, sans-serif",
    fontSize: "20px",
    color: "#ffffff",
    stroke: "#000000",
    strokeThickness: 4
  };
}
