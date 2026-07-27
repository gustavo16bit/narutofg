import Phaser from "phaser";
import { GROUND_Y, GRAVITY, WORLD_LEFT, WORLD_RIGHT, CHAKRA_MAX, CHAKRA_ON_HIT, CHAKRA_ON_TAKE } from "../config";
import { CharDef, MoveDef } from "../data";
import { AnimKey, SpriteConfig, getSpriteConfig, spriteTextureKey } from "../sprites";

// Entrada abstrata (vale tanto para teclado quanto para a IA)
export interface FighterInput {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  punch: boolean; // edge (apenas no frame que apertou)
  kick: boolean;
  special: boolean;
}

export type FighterState =
  | "idle"
  | "walk"
  | "crouch"
  | "jump"
  | "attack"
  | "hit"
  | "block"
  | "ko";

type AttackKind = "punch" | "kick" | "special";

const BODY_HALF = 22;

export class Fighter {
  public x: number;
  public y = GROUND_Y;
  public vx = 0;
  public vy = 0;
  public facing: 1 | -1 = 1;

  public health: number;
  public maxHealth: number;
  public chakra = 0;
  public roundWins = 0;

  public state: FighterState = "idle";
  public dead = false;

  private g: Phaser.GameObjects.Graphics;
  private grounded = true;
  private animTime = 0;
  private crouching = false;

  // modo sprite (usado quando ha spritesheet em public/sprites/<id>.png)
  private useSprite = false;
  private sprite?: Phaser.GameObjects.Sprite;
  private spriteCfg: SpriteConfig;
  private currentAnimKey = "";

  // ataque
  private attackKind: AttackKind = "punch";
  private attackFrame = 0; // em "frames" (60fps)
  private attackConsumed = false;

  // status
  private hitstun = 0; // segundos
  private hitFlash = 0;
  private input: FighterInput = emptyInput();

  // callback para spawnar projetil (setado pela FightScene)
  public onSpawnProjectile?: (fighter: Fighter) => void;

  constructor(
    private scene: Phaser.Scene,
    public readonly char: CharDef,
    startX: number,
    facing: 1 | -1,
    public readonly playerId: number
  ) {
    this.x = startX;
    this.facing = facing;
    this.maxHealth = char.maxHealth;
    this.health = char.maxHealth;
    this.g = scene.add.graphics();
    this.g.setDepth(10);

    this.spriteCfg = getSpriteConfig(char.id);
    // so usa sprite se a textura E as animacoes existem de fato (senao, ninja desenhado)
    if (scene.textures.exists(spriteTextureKey(char.id)) && scene.anims.exists(`${char.id}-idle`)) {
      this.useSprite = true;
      this.g.setDepth(9); // sombra/efeitos ficam abaixo do sprite
      this.sprite = scene.add.sprite(this.x, this.y, spriteTextureKey(char.id));
      this.sprite.setOrigin(0.5, this.spriteCfg.originY);
      this.sprite.setScale(this.spriteCfg.scale);
      this.sprite.setDepth(10);
    }
  }

  // ---------- API publica ----------

  faceTowards(targetX: number) {
    if (this.state === "attack" || this.hitstun > 0 || this.dead) return;
    this.facing = targetX >= this.x ? 1 : -1;
  }

  setInput(input: FighterInput) {
    this.input = input;
  }

  isActionable(): boolean {
    return (
      !this.dead &&
      this.grounded &&
      this.hitstun <= 0 &&
      this.state !== "attack"
    );
  }

  getHurtbox(): Phaser.Geom.Rectangle {
    const h = this.crouching ? 82 : 130;
    return new Phaser.Geom.Rectangle(this.x - BODY_HALF, this.y - h, BODY_HALF * 2, h);
  }

  // Retorna o hitbox ativo do ataque corpo-a-corpo, ou null
  getActiveHitbox(): { rect: Phaser.Geom.Rectangle; move: MoveDef | CharDef["special"] } | null {
    if (this.state !== "attack" || this.attackConsumed) return null;
    const move = this.currentMove();
    const startup = move.startup ?? 6;
    const active = move.active ?? 4;
    if (this.attackFrame < startup || this.attackFrame >= startup + active) return null;

    // jutsu do tipo projetil nao tem hitbox corpo-a-corpo
    if (this.attackKind === "special" && this.char.special.type === "projectile") return null;

    const range = (move as MoveDef).range ?? 90;
    const reach = (move as MoveDef).reach ?? 90;
    const top =
      this.attackKind === "kick"
        ? this.y - 92
        : this.attackKind === "special"
        ? this.y - 120
        : this.y - 118;
    const height = this.attackKind === "special" ? 100 : reach;
    const startX = this.facing > 0 ? this.x + BODY_HALF : this.x - BODY_HALF - range;
    return {
      rect: new Phaser.Geom.Rectangle(startX, top, range, height),
      move
    };
  }

  consumeHit() {
    this.attackConsumed = true;
  }

  // aplica dano (dir = sentido do knockback, +1 direita / -1 esquerda)
  receiveHit(damage: number, dir: number, knockback: number, hitstun: number): "hit" | "block" | "none" {
    if (this.dead) return "none";

    const blocking = this.isBlocking(dir);
    if (blocking) {
      const chip = Math.max(1, Math.round(damage * 0.15));
      this.health -= chip;
      this.vx = dir * knockback * 0.35;
      this.hitstun = Math.min(hitstun / 60, 0.18);
      this.state = "block";
      this.gainChakra(CHAKRA_ON_TAKE * 0.5);
      this.clampDeath();
      return "block";
    }

    this.health -= damage;
    this.vx = dir * knockback;
    this.vy = -160;
    this.grounded = false;
    this.hitstun = hitstun / 60;
    this.hitFlash = 0.12;
    this.state = "hit";
    // interrompe ataque em andamento
    this.attackFrame = 0;
    this.gainChakra(CHAKRA_ON_TAKE);
    this.clampDeath();
    return this.dead ? "none" : "hit";
  }

  onDealtHit() {
    this.gainChakra(CHAKRA_ON_HIT);
  }

  private clampDeath() {
    if (this.health <= 0) {
      this.health = 0;
      this.dead = true;
      this.state = "ko";
    }
  }

  gainChakra(amount: number) {
    this.chakra = Phaser.Math.Clamp(this.chakra + amount, 0, CHAKRA_MAX);
  }

  freeze() {
    // usado em fim de round / KO
    this.vx = 0;
    this.input = emptyInput();
  }

  resetForRound(x: number, facing: 1 | -1) {
    this.x = x;
    this.y = GROUND_Y;
    this.vx = 0;
    this.vy = 0;
    this.facing = facing;
    this.health = this.maxHealth;
    this.chakra = 0;
    this.dead = false;
    this.state = "idle";
    this.grounded = true;
    this.hitstun = 0;
    this.hitFlash = 0;
    this.attackFrame = 0;
    this.attackConsumed = false;
    this.crouching = false;
    this.currentAnimKey = "";
    this.input = emptyInput();
  }

  // ---------- update ----------

  update(dt: number) {
    this.animTime += dt;
    if (this.hitFlash > 0) this.hitFlash -= dt;

    if (this.dead) {
      this.applyPhysics(dt);
      this.draw();
      return;
    }

    if (this.hitstun > 0) {
      this.hitstun -= dt;
      this.applyPhysics(dt);
      if (this.hitstun <= 0 && this.grounded) this.state = "idle";
      this.draw();
      return;
    }

    if (this.state === "attack") {
      this.updateAttack(dt);
      this.applyPhysics(dt);
      this.draw();
      return;
    }

    this.handleLocomotion();
    this.applyPhysics(dt);
    this.draw();
  }

  private handleLocomotion() {
    const inp = this.input;

    // iniciar ataques (apenas no chao)
    if (this.grounded) {
      if (inp.special && this.chakra >= this.char.special.chakraCost) {
        this.startAttack("special");
        this.chakra -= this.char.special.chakraCost;
        return;
      }
      if (inp.punch) {
        this.startAttack("punch");
        return;
      }
      if (inp.kick) {
        this.startAttack("kick");
        return;
      }
    }

    // pulo
    if (inp.up && this.grounded) {
      this.vy = -this.char.jump;
      this.grounded = false;
      this.state = "jump";
    }

    this.crouching = this.grounded && inp.down && !inp.left && !inp.right;

    if (!this.grounded) {
      this.state = "jump";
      // controle aereo leve
      if (inp.left) this.vx = -this.char.speed * 0.6;
      else if (inp.right) this.vx = this.char.speed * 0.6;
      return;
    }

    if (this.crouching) {
      this.vx = 0;
      this.state = "crouch";
      return;
    }

    if (inp.left) {
      this.vx = -this.char.speed;
      this.state = "walk";
    } else if (inp.right) {
      this.vx = this.char.speed;
      this.state = "walk";
    } else {
      this.vx = 0;
      this.state = "idle";
    }
  }

  private startAttack(kind: AttackKind) {
    this.attackKind = kind;
    this.attackFrame = 0;
    this.attackConsumed = false;
    this.state = "attack";
    this.vx = 0;

    // dash (Chidori / Furacao da Folha): impulso pra frente
    if (kind === "special" && this.char.special.type === "dash") {
      this.vx = this.facing * this.char.special.speed;
    }
  }

  private updateAttack(dt: number) {
    this.attackFrame += dt * 60;
    const move = this.currentMove();
    const total = (move.startup ?? 6) + (move.active ?? 4) + (move.recovery ?? 10);

    // spawn de projetil no inicio da fase ativa
    if (
      this.attackKind === "special" &&
      this.char.special.type === "projectile" &&
      !this.attackConsumed &&
      this.attackFrame >= (move.startup ?? 6)
    ) {
      this.attackConsumed = true; // usa consumed pra garantir 1 spawn
      this.onSpawnProjectile?.(this);
    }

    // desacelera dash
    if (this.attackKind === "special" && this.char.special.type === "dash") {
      this.vx *= 0.86;
    }

    if (this.attackFrame >= total) {
      this.state = "idle";
      this.attackConsumed = false;
    }
  }

  private currentMove(): MoveDef | CharDef["special"] {
    if (this.attackKind === "punch") return this.char.punch;
    if (this.attackKind === "kick") return this.char.kick;
    return this.char.special;
  }

  private isBlocking(attackerDir: number): boolean {
    if (!this.grounded || this.state === "attack") return false;
    // bloqueia segurando a direcao oposta ao ataque que vem
    const holdingBack =
      (attackerDir > 0 && this.input.left) || (attackerDir < 0 && this.input.right);
    return holdingBack;
  }

  private applyPhysics(dt: number) {
    if (!this.grounded) {
      this.vy += GRAVITY * dt;
    }
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    if (this.y >= GROUND_Y) {
      this.y = GROUND_Y;
      this.vy = 0;
      if (!this.grounded) {
        this.grounded = true;
        if (!this.dead && this.hitstun <= 0 && this.state === "jump") this.state = "idle";
      }
    }

    // atrito no chao quando nao anda
    if (this.grounded && this.state !== "walk") {
      this.vx *= 0.8;
      if (Math.abs(this.vx) < 4) this.vx = 0;
    }

    this.x = Phaser.Math.Clamp(this.x, WORLD_LEFT, WORLD_RIGHT);
  }

  // ---------- desenho do ninja (por codigo) ----------

  private draw() {
    // se ha spritesheet carregado, usa o sprite animado
    if (this.useSprite && this.sprite) {
      this.drawSprite();
      return;
    }

    const g = this.g;
    g.clear();

    const c = this.char.colors;
    const f = this.facing;
    const t = this.animTime;

    // sombra no chao
    const shadowScale = Phaser.Math.Clamp(1 - (GROUND_Y - this.y) / 400, 0.4, 1);
    g.fillStyle(0x000000, 0.28);
    g.fillEllipse(this.x, GROUND_Y + 6, 60 * shadowScale, 16 * shadowScale);

    const H = this.crouching || this.state === "crouch" ? 82 : 130;
    const bob = this.state === "idle" ? Math.sin(t * 4) * 2 : 0;
    const baseY = this.y + bob;

    const hipY = baseY - H * 0.46;
    const neckY = baseY - H * 0.86;
    const headY = baseY - H * 0.99;
    const shoulderY = baseY - H * 0.8;
    const headR = H * 0.13;

    // ---- pernas ----
    let footFrontX = this.x + f * 12;
    let footBackX = this.x - f * 12;
    const footY = this.y;

    if (this.state === "walk") {
      const swing = Math.sin(t * 12) * 12;
      footFrontX = this.x + f * (12 + swing);
      footBackX = this.x - f * (12 + swing);
    } else if (this.state === "jump") {
      footFrontX = this.x + f * 8;
      footBackX = this.x - f * 4;
    }

    const hipX = this.x;
    // chute: perna da frente estende
    if (this.state === "attack" && this.attackKind === "kick") {
      const ext = this.kickExtension();
      this.limb(g, hipX, hipY, this.x + f * ext, hipY - 6, 10, c.primary);
      this.limb(g, hipX, hipY, footBackX, footY, 11, c.secondary);
    } else {
      this.limb(g, hipX, hipY, footFrontX, footY, 11, c.primary);
      this.limb(g, hipX, hipY, footBackX, footY, 11, c.secondary);
    }
    // pes
    g.fillStyle(0x1a1a1a, 1);
    g.fillCircle(footFrontX, footY, 5);
    g.fillCircle(footBackX, footY, 5);

    // ---- torso (colete) ----
    this.limb(g, hipX, hipY, this.x, neckY, 20, c.primary);
    // zíper/detalhe
    this.limb(g, hipX, hipY + 2, this.x, neckY, 4, c.secondary);

    // ---- bracos ----
    const shX = this.x;
    if (this.state === "attack" && (this.attackKind === "punch" || this.attackKind === "special")) {
      const ext = this.punchExtension();
      const handY = this.attackKind === "special" ? shoulderY + 6 : shoulderY + 4;
      this.limb(g, shX, shoulderY, this.x + f * ext, handY, 9, c.skin);
      // punho
      g.fillStyle(c.skin, 1);
      g.fillCircle(this.x + f * ext, handY, 7);
      // braco de tras
      this.limb(g, shX, shoulderY, this.x - f * 12, hipY - 4, 9, c.skin);
    } else if (this.state === "block") {
      this.limb(g, shX, shoulderY, this.x + f * 14, shoulderY + 10, 9, c.skin);
      this.limb(g, shX, shoulderY, this.x + f * 12, hipY - 6, 9, c.skin);
    } else {
      const armSwing = this.state === "walk" ? Math.sin(t * 12) * 8 : 0;
      this.limb(g, shX, shoulderY, this.x + f * 10 - armSwing, hipY - 2, 9, c.skin);
      this.limb(g, shX, shoulderY, this.x - f * 10 + armSwing, hipY - 2, 9, c.skin);
    }

    // ---- cabeca ----
    // cabelo atras
    g.fillStyle(c.hair, 1);
    g.fillCircle(this.x, headY - 2, headR + 4);
    // rosto
    g.fillStyle(c.skin, 1);
    g.fillCircle(this.x, headY, headR);
    // faixa (headband)
    g.fillStyle(c.headband, 1);
    g.fillRect(this.x - headR - 2, headY - headR + 3, (headR + 2) * 2, 8);
    // placa metalica
    g.fillStyle(0x9aa4b2, 1);
    g.fillRoundedRect(this.x - 8, headY - headR + 2, 16, 9, 2);
    // olho (voltado pro alvo)
    g.fillStyle(0x1a1a1a, 1);
    g.fillCircle(this.x + f * 5, headY + 3, 2.6);

    // ---- aura de chakra no jutsu ----
    if (this.state === "attack" && this.attackKind === "special") {
      const col = this.char.special.color;
      g.lineStyle(3, col, 0.8);
      g.strokeCircle(this.x, baseY - H * 0.5, 34 + Math.sin(t * 30) * 4);
      g.fillStyle(col, 0.15);
      g.fillCircle(this.x, baseY - H * 0.5, 40);
    }

    // ---- flash de dano ----
    if (this.hitFlash > 0) {
      g.fillStyle(0xffffff, 0.5);
      g.fillCircle(this.x, baseY - H * 0.5, 40);
    }

    // ---- KO: tomba ----
    if (this.dead) {
      this.g.setRotation(0);
      // simples: escurece
      g.fillStyle(0x000000, 0.15);
      g.fillCircle(this.x, baseY - H * 0.5, 44);
    }
  }

  private kickExtension(): number {
    const move = this.char.kick;
    const startup = move.startup;
    const active = move.active;
    if (this.attackFrame < startup) return 20 + (this.attackFrame / startup) * 20;
    if (this.attackFrame < startup + active) return move.range * 0.7;
    return 30;
  }

  private punchExtension(): number {
    const move = this.currentMove();
    const startup = move.startup ?? 4;
    const active = move.active ?? 4;
    const range = (move as MoveDef).range ?? this.char.punch.range;
    if (this.attackFrame < startup) return 16 + (this.attackFrame / startup) * 14;
    if (this.attackFrame < startup + active) return range * 0.7;
    return 24;
  }

  private limb(
    g: Phaser.GameObjects.Graphics,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    thickness: number,
    color: number
  ) {
    g.lineStyle(thickness, color, 1);
    g.lineBetween(x1, y1, x2, y2);
    // juntas arredondadas
    g.fillStyle(color, 1);
    g.fillCircle(x1, y1, thickness / 2);
    g.fillCircle(x2, y2, thickness / 2);
  }

  // ---------- modo sprite (spritesheet) ----------

  private getAnimKey(): AnimKey {
    if (this.dead) return "ko";
    if (this.state === "hit") return "hit";
    if (this.state === "block") return "block";
    if (this.state === "attack") return this.attackKind; // punch | kick | special
    if (!this.grounded || this.state === "jump") return "jump";
    if (this.state === "crouch" || this.crouching) return "crouch";
    if (this.state === "walk") return "walk";
    return "idle";
  }

  private drawSprite() {
    const sprite = this.sprite!;
    const g = this.g;
    g.clear();

    // sombra no chao
    const shadowScale = Phaser.Math.Clamp(1 - (GROUND_Y - this.y) / 400, 0.4, 1);
    g.fillStyle(0x000000, 0.28);
    g.fillEllipse(this.x, GROUND_Y + 6, 60 * shadowScale, 16 * shadowScale);

    // posicao e direcao
    sprite.setPosition(this.x, this.y);
    sprite.setFlipX(this.spriteCfg.flipDefault ? this.facing > 0 : this.facing < 0);

    // animacao
    const key = `${this.char.id}-${this.getAnimKey()}`;
    if (key !== this.currentAnimKey && this.scene.anims.exists(key)) {
      this.currentAnimKey = key;
      sprite.play(key, true);
    }

    // flash de dano
    if (this.hitFlash > 0) sprite.setTintFill(0xffffff);
    else sprite.clearTint();

    // aura de chakra no jutsu
    if (this.state === "attack" && this.attackKind === "special") {
      const col = this.char.special.color;
      g.lineStyle(3, col, 0.8);
      g.strokeCircle(this.x, this.y - 60, 34 + Math.sin(this.animTime * 30) * 4);
      g.fillStyle(col, 0.15);
      g.fillCircle(this.x, this.y - 60, 40);
    }
  }

  destroy() {
    this.g.destroy();
    this.sprite?.destroy();
  }
}

export function emptyInput(): FighterInput {
  return {
    left: false,
    right: false,
    up: false,
    down: false,
    punch: false,
    kick: false,
    special: false
  };
}
