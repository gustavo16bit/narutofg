import Phaser from "phaser";
import { WORLD_LEFT, WORLD_RIGHT } from "../config";

export type ProjectileStyle = "rasengan" | "sand" | "lightning" | "generic";

// Projetil de jutsu (Rasengan, Shuriken de Areia, Lamina Relampago...).
export class Projectile {
  public alive = true;
  private g: Phaser.GameObjects.Graphics;
  private t = 0;

  constructor(
    private scene: Phaser.Scene,
    public x: number,
    public y: number,
    public vx: number,
    public owner: number, // 1 ou 2 (dono do golpe)
    public damage: number,
    public knockback: number,
    public hitstun: number,
    private color: number,
    private style: ProjectileStyle,
    private radius = 20
  ) {
    this.g = scene.add.graphics();
    this.g.setDepth(20);
  }

  update(dt: number) {
    if (!this.alive) return;
    this.t += dt;
    this.x += this.vx * dt;

    if (this.x < WORLD_LEFT - 60 || this.x > WORLD_RIGHT + 60) {
      this.destroy();
      return;
    }
    this.draw();
  }

  getBounds(): Phaser.Geom.Rectangle {
    return new Phaser.Geom.Rectangle(
      this.x - this.radius,
      this.y - this.radius,
      this.radius * 2,
      this.radius * 2
    );
  }

  private draw() {
    const g = this.g;
    g.clear();
    const dir = Math.sign(this.vx) || 1;
    const spin = this.t * 14;

    if (this.style === "rasengan") {
      g.fillStyle(this.color, 0.25);
      g.fillCircle(this.x, this.y, this.radius + 8);
      g.fillStyle(this.color, 0.6);
      g.fillCircle(this.x, this.y, this.radius);
      g.fillStyle(0xffffff, 0.9);
      g.fillCircle(this.x, this.y, this.radius * 0.5);
      // linhas em espiral
      g.lineStyle(2, 0xffffff, 0.8);
      for (let i = 0; i < 3; i++) {
        const a = spin + (i * Math.PI * 2) / 3;
        g.beginPath();
        g.arc(this.x, this.y, this.radius * 0.8, a, a + 1.6);
        g.strokePath();
      }
    } else if (this.style === "sand") {
      g.fillStyle(this.color, 0.9);
      // shuriken de areia (4 pontas)
      for (let i = 0; i < 4; i++) {
        const a = spin + (i * Math.PI) / 2;
        const x2 = this.x + Math.cos(a) * this.radius;
        const y2 = this.y + Math.sin(a) * this.radius;
        const x3 = this.x + Math.cos(a + 0.5) * (this.radius * 0.4);
        const y3 = this.y + Math.sin(a + 0.5) * (this.radius * 0.4);
        g.fillTriangle(this.x, this.y, x2, y2, x3, y3);
      }
      g.fillStyle(0x000000, 0.5);
      g.fillCircle(this.x, this.y, 4);
    } else if (this.style === "lightning") {
      g.fillStyle(this.color, 0.3);
      g.fillCircle(this.x, this.y, this.radius + 6);
      g.lineStyle(3, 0xffffff, 0.95);
      let px = this.x - dir * this.radius;
      let py = this.y;
      for (let i = 0; i < 5; i++) {
        const nx = px + dir * (this.radius * 0.5);
        const ny = this.y + (Math.random() - 0.5) * this.radius;
        g.lineBetween(px, py, nx, ny);
        px = nx;
        py = ny;
      }
      g.fillStyle(this.color, 0.8);
      g.fillCircle(this.x, this.y, this.radius * 0.5);
    } else {
      g.fillStyle(this.color, 0.85);
      g.fillCircle(this.x, this.y, this.radius);
    }
  }

  hitSpark() {
    // pequeno flash no ponto de impacto
    const spark = this.scene.add.graphics();
    spark.setDepth(25);
    spark.fillStyle(this.color, 0.9);
    spark.fillCircle(this.x, this.y, this.radius);
    this.scene.tweens.add({
      targets: spark,
      alpha: 0,
      duration: 180,
      onComplete: () => spark.destroy()
    });
  }

  destroy() {
    this.alive = false;
    this.g.destroy();
  }
}
