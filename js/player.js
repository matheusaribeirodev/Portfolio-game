/* ==========================================================================
   player.js — Personagem controlável
   Movimento suave (aceleração/atrito), colisão por eixo com deslize em
   quinas, animações de caminhada e repouso nas 4 direções.
   ========================================================================== */

(function () {
  "use strict";

  const SPEED = 92;          // px/s
  const ACCEL = 14;          // resposta do movimento
  const HB = { w: 10, h: 6 }; // hitbox nos pés

  class Player {
    constructor(world, palette) {
      this.world = world;
      this.pal = Object.assign({ id: "player" }, palette);
      this.x = world.SPAWN.x; this.y = world.SPAWN.y;
      this.vx = 0; this.vy = 0;
      this.dir = "up";
      this.t = 0; this.walkT = 0; this.frame = 0; this.lastFrame = 0;
      this.walking = false;
      this.onStep = null;
    }
    get hitbox() { return { x: this.x - HB.w / 2, y: this.y - HB.h, w: HB.w, h: HB.h }; }
    place(x, y, dir) { this.x = x; this.y = y; this.vx = this.vy = 0; if (dir) this.dir = dir; }

    collides(x, y) { return this.world.rectHitsSolid(x - HB.w / 2, y - HB.h, HB.w, HB.h); }

    update(dt, input) {
      this.t += dt;
      const k = 1 - Math.exp(-ACCEL * dt);
      this.vx += (input.x * SPEED - this.vx) * k;
      this.vy += (input.y * SPEED - this.vy) * k;
      if (Math.abs(this.vx) < 0.5 && !input.x) this.vx = 0;
      if (Math.abs(this.vy) < 0.5 && !input.y) this.vy = 0;

      // eixo X
      let nx = this.x + this.vx * dt;
      if (this.collides(nx, this.y)) {
        // deslize em quinas: tenta contornar até 5px na vertical
        let slid = false;
        if (Math.abs(input.y) < 0.3 && input.x) {
          for (let o = 1; o <= 5 && !slid; o++) {
            for (const s of [-1, 1]) if (!this.collides(nx, this.y + s * o) && !this.collides(this.x, this.y + s * o)) { this.y += s * Math.min(o, 60 * dt); slid = true; break; }
          }
        }
        if (!slid) { while (!this.collides(this.x + Math.sign(this.vx) * 0.5, this.y) && Math.abs(nx - this.x) > 0.5) this.x += Math.sign(this.vx) * 0.5; this.vx = 0; }
      } else this.x = nx;
      // eixo Y
      let ny = this.y + this.vy * dt;
      if (this.collides(this.x, ny)) {
        let slid = false;
        if (Math.abs(input.x) < 0.3 && input.y) {
          for (let o = 1; o <= 5 && !slid; o++) {
            for (const s of [-1, 1]) if (!this.collides(this.x + s * o, ny) && !this.collides(this.x + s * o, this.y)) { this.x += s * Math.min(o, 60 * dt); slid = true; break; }
          }
        }
        if (!slid) { while (!this.collides(this.x, this.y + Math.sign(this.vy) * 0.5) && Math.abs(ny - this.y) > 0.5) this.y += Math.sign(this.vy) * 0.5; this.vy = 0; }
      } else this.y = ny;

      // direção e animação
      if (Math.abs(input.x) > 0.01 || Math.abs(input.y) > 0.01) {
        if (Math.abs(input.x) > Math.abs(input.y) + 0.05) this.dir = input.x > 0 ? "right" : "left";
        else if (Math.abs(input.y) > 0.01) this.dir = input.y > 0 ? "down" : "up";
      }
      const speed = Math.hypot(this.vx, this.vy);
      this.walking = speed > 12;
      if (this.walking) {
        this.walkT += dt * (speed / SPEED) * 9;
        this.frame = Math.floor(this.walkT) % 4;
        if (this.frame !== this.lastFrame && (this.frame === 1 || this.frame === 3) && this.onStep) this.onStep(this);
      } else {
        this.walkT = 0;
        this.frame = Math.floor(this.t * 1.6) % 2;
      }
      this.lastFrame = this.frame;
    }

    /** Ponto à frente do personagem (usado para interação). */
    front(dist = 12) {
      const v = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[this.dir];
      return { x: this.x + v[0] * dist, y: this.y - 3 + v[1] * dist };
    }

    draw(ctx, camX, camY) {
      const x = Math.round(this.x - camX), y = Math.round(this.y - camY);
      ctx.fillStyle = "rgba(10,8,20,0.35)";
      ctx.beginPath(); ctx.ellipse(x, y - 1, 6, 2.5, 0, 0, Math.PI * 2); ctx.fill();
      const spr = Sprites.charFrame(this.pal, this.dir, this.frame, this.walking);
      ctx.drawImage(spr, x - 8 + spr.ox, y - 24 + spr.oy);
    }
  }

  window.Player = Player;
})();
