/* ==========================================================================
   player.js — Personagem controlável com "game feel"
   - Inércia: aceleração, frenagem e virada com derrapagem
   - Squash & stretch com mola amortecida (largada, parada, virada, dash, pulo)
   - Dash (Shift) com rastro de fantasmas e pulo (Espaço) com sombra dinâmica
   - Idle com personalidade: respiração, piscadas, olhar para os lados,
     espreguiçar e cochilar
   Todos os ajustes ficam no objeto TUNING, para calibrar à vontade.
   ========================================================================== */

(function () {
  "use strict";

  const TUNING = {
    speed: 92,        // px/s andando
    accel: 11,        // resposta ao acelerar
    decel: 7,         // frenagem (menor = desliza mais)
    turn: 20,         // resposta ao inverter direção (derrapagem)
    dashSpeed: 255, dashTime: 0.15, dashCooldown: 0.5,
    jumpVel: 150, gravity: 640,
    springK: 340, springD: 15, // mola do squash & stretch
  };
  const HB = { w: 10, h: 6 };
  const LOOK = ["left", "down", "right", "down"];

  class Player {
    constructor(world, palette) {
      this.world = world;
      this.pal = Object.assign({ id: "player" }, palette);
      this.x = world.SPAWN.x; this.y = world.SPAWN.y;
      this.vx = 0; this.vy = 0;
      this.dir = "up";
      this.t = 0; this.walkT = 0; this.frame = 0; this.lastFrame = 0;
      this.walking = false; this.visible = true;
      // squash & stretch
      this.sx = 1; this.sy = 1; this.svx = 0; this.svy = 0;
      // pulo e dash
      this.z = 0; this.vz = 0; this.dashT = 0; this.dashCd = 0; this.dashDir = { x: 0, y: 0 }; this.ghostT = 0; this.ghosts = [];
      // idle
      this.idleT = 0; this.blinkT = 2 + Math.random() * 3; this.blinkHold = 0; this.lookDir = null; this.stretched = false; this.zzzT = 0;
      this.wasMoving = false; this.turnCd = 0; this.stopFx = false;
      this.fx = () => {}; this.onStep = null; this.onLand = null;
      this.reduced = () => false;
    }
    get hitbox() { return { x: this.x - HB.w / 2, y: this.y - HB.h, w: HB.w, h: HB.h }; }
    get sleeping() { return this.idleT > 22; }
    place(x, y, dir) { this.x = x; this.y = y; this.vx = this.vy = 0; this.z = this.vz = 0; this.dashT = 0; if (dir) this.dir = dir; this.wake(); }
    collides(x, y) { return this.world.rectHitsSolid(x - HB.w / 2, y - HB.h, HB.w, HB.h); }

    squash(sx, sy) { if (this.reduced()) return; this.sx = sx; this.sy = sy; this.svx = this.svy = 0; }
    wake() { this.idleT = 0; this.lookDir = null; this.stretched = false; }

    /* ---------------------------------------------------------- ações */
    dash(input) {
      if (this.dashCd > 0 || this.dashT > 0) return false;
      let dx = input.x, dy = input.y;
      if (!dx && !dy) { const v = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[this.dir]; dx = v[0]; dy = v[1]; }
      const len = Math.hypot(dx, dy) || 1;
      this.dashDir = { x: dx / len, y: dy / len };
      this.dashT = TUNING.dashTime; this.dashCd = TUNING.dashCooldown; this.ghostT = 0;
      if (Math.abs(dx) > Math.abs(dy)) this.squash(1.35, 0.78); else this.squash(0.8, 1.28);
      this.fx("dash", this.x, this.y, -this.dashDir.x, -this.dashDir.y);
      this.wake();
      return true;
    }
    jump() {
      if (this.z > 0.5) return false;
      this.vz = TUNING.jumpVel; this.z = 0.01;
      this.squash(0.78, 1.28);
      this.fx("jump", this.x, this.y, 0, 0);
      this.wake();
      return true;
    }

    /* ---------------------------------------------------------- update */
    update(dt, input) {
      this.t += dt;
      const red = this.reduced();
      const moving = Math.abs(input.x) > 0.01 || Math.abs(input.y) > 0.01;

      // mola do squash & stretch
      this.svx += ((1 - this.sx) * TUNING.springK - this.svx * TUNING.springD) * dt;
      this.svy += ((1 - this.sy) * TUNING.springK - this.svy * TUNING.springD) * dt;
      this.sx += this.svx * dt; this.sy += this.svy * dt;

      this.dashCd = Math.max(0, this.dashCd - dt); this.turnCd = Math.max(0, this.turnCd - dt);

      // velocidade
      if (this.dashT > 0) {
        this.dashT -= dt;
        this.vx = this.dashDir.x * TUNING.dashSpeed; this.vy = this.dashDir.y * TUNING.dashSpeed;
        this.ghostT -= dt;
        if (this.ghostT <= 0 && !red) { this.ghostT = 0.028; this.ghosts.push({ x: this.x, y: this.y, z: this.z, dir: this.dir, frame: this.frame, walking: this.walking, life: 0.22, max: 0.22 }); }
        if (Math.random() < 0.6) this.fx("trail", this.x, this.y, -this.dashDir.x, -this.dashDir.y);
        if (this.dashT <= 0) { this.vx *= 0.42; this.vy *= 0.42; this.squash(1.16, 0.86); this.fx("stop", this.x, this.y, this.dashDir.x, this.dashDir.y); }
      } else {
        const tx = input.x * TUNING.speed, ty = input.y * TUNING.speed;
        const sp = Math.hypot(this.vx, this.vy);
        const dot = sp > 1 && moving ? (this.vx * input.x + this.vy * input.y) / sp : 1;
        let k = moving ? TUNING.accel : TUNING.decel;
        if (moving && dot < -0.2 && sp > 45) {
          k = TUNING.turn;
          if (this.turnCd <= 0) {
            this.turnCd = 0.3;
            if (Math.abs(input.x) > Math.abs(input.y)) this.squash(0.84, 1.14); else this.squash(1.14, 0.86);
            this.fx("skid", this.x, this.y, this.vx / sp, this.vy / sp);
          }
        }
        const a = 1 - Math.exp(-k * dt);
        this.vx += (tx - this.vx) * a; this.vy += (ty - this.vy) * a;
        if (!moving && Math.hypot(this.vx, this.vy) < 3) { this.vx = 0; this.vy = 0; }
      }

      // largada / parada
      if (moving && !this.wasMoving && this.z <= 0) {
        if (Math.abs(input.x) > Math.abs(input.y)) this.squash(1.12, 0.9); else this.squash(0.9, 1.12);
        this.fx("start", this.x, this.y, -input.x, -input.y);
        this.stopFx = true;
      }
      if (!moving && this.wasMoving) this.stopFx = Math.hypot(this.vx, this.vy) > 50;
      if (this.stopFx && !moving && Math.hypot(this.vx, this.vy) < 25 && this.dashT <= 0) {
        this.stopFx = false; this.squash(1.12, 0.9);
        const sp = Math.hypot(this.vx, this.vy) || 1; this.fx("stop", this.x, this.y, this.vx / sp, this.vy / sp);
      }
      this.wasMoving = moving;

      // pulo
      if (this.z > 0 || this.vz > 0) {
        this.vz -= TUNING.gravity * dt; this.z += this.vz * dt;
        if (this.z <= 0) {
          const impact = Math.min(1, Math.abs(this.vz) / 220);
          this.z = 0; this.vz = 0;
          this.squash(1 + 0.32 * impact + 0.05, 1 - 0.28 * impact - 0.04);
          this.fx("land", this.x, this.y, 0, 0);
          if (this.onLand) this.onLand(impact);
        }
      }

      this.move(dt);

      // direção
      if (moving && this.dashT <= 0) {
        if (Math.abs(input.x) > Math.abs(input.y) + 0.05) this.dir = input.x > 0 ? "right" : "left";
        else if (Math.abs(input.y) > 0.01) this.dir = input.y > 0 ? "down" : "up";
      }

      // animação
      const speed = Math.hypot(this.vx, this.vy);
      this.walking = speed > 12 || this.z > 0;
      if (this.z > 0) { this.frame = this.vz > 0 ? 1 : 3; }
      else if (speed > 12) {
        this.walkT += dt * Math.max(0.5, speed / TUNING.speed) * 9;
        this.frame = Math.floor(this.walkT) % 4;
        if (this.frame !== this.lastFrame && (this.frame === 1 || this.frame === 3)) { if (this.onStep) this.onStep(this); this.fx("step", this.x, this.y, -this.vx / speed, -this.vy / speed); }
      } else { this.walkT = 0; this.frame = Math.floor(this.t * 1.6) % 2; }
      this.lastFrame = this.frame;

      // idle com personalidade
      if (!moving && speed < 5 && this.z <= 0 && this.dashT <= 0) this.idleT += dt; else this.wake();
      this.updateIdle(dt);

      for (let i = this.ghosts.length - 1; i >= 0; i--) { this.ghosts[i].life -= dt; if (this.ghosts[i].life <= 0) this.ghosts.splice(i, 1); }
    }

    updateIdle(dt) {
      // piscar (às vezes piscada dupla)
      this.blinkHold = Math.max(0, this.blinkHold - dt);
      this.blinkT -= dt;
      if (this.blinkT <= 0) { this.blinkHold = 0.12; this.blinkT = Math.random() < 0.25 ? 0.22 : 2.2 + Math.random() * 3.5; }
      if (this.idleT > 5 && this.idleT < 14) this.lookDir = LOOK[Math.floor((this.idleT - 5) / 1.3) % LOOK.length];
      else if (this.idleT >= 14) this.lookDir = "down";
      if (this.idleT > 14 && !this.stretched) { this.stretched = true; this.squash(0.86, 1.2); this.fx("sparkle", this.x, this.y - 22, 0, 0); }
      if (this.sleeping) { this.zzzT -= dt; if (this.zzzT <= 0) { this.zzzT = 1.3; this.fx("zzz", this.x + 6, this.y - 26, 0, 0); } }
    }

    move(dt) {
      let nx = this.x + this.vx * dt;
      if (this.collides(nx, this.y)) {
        let slid = false;
        if (Math.abs(this.vy) < Math.abs(this.vx) * 0.5 && this.vx) {
          for (let o = 1; o <= 5 && !slid; o++) for (const s of [-1, 1]) if (!this.collides(nx, this.y + s * o) && !this.collides(this.x, this.y + s * o)) { this.y += s * Math.min(o, 60 * dt); slid = true; break; }
        }
        if (!slid) { while (!this.collides(this.x + Math.sign(this.vx) * 0.5, this.y) && Math.abs(nx - this.x) > 0.5) this.x += Math.sign(this.vx) * 0.5; if (this.dashT > 0) { this.dashT = 0; this.squash(0.82, 1.15); this.fx("bump", this.x, this.y, Math.sign(this.vx), 0); } this.vx = 0; }
      } else this.x = nx;
      let ny = this.y + this.vy * dt;
      if (this.collides(this.x, ny)) {
        let slid = false;
        if (Math.abs(this.vx) < Math.abs(this.vy) * 0.5 && this.vy) {
          for (let o = 1; o <= 5 && !slid; o++) for (const s of [-1, 1]) if (!this.collides(this.x + s * o, ny) && !this.collides(this.x + s * o, this.y)) { this.x += s * Math.min(o, 60 * dt); slid = true; break; }
        }
        if (!slid) { while (!this.collides(this.x, this.y + Math.sign(this.vy) * 0.5) && Math.abs(ny - this.y) > 0.5) this.y += Math.sign(this.vy) * 0.5; if (this.dashT > 0) { this.dashT = 0; this.squash(1.15, 0.82); this.fx("bump", this.x, this.y, 0, Math.sign(this.vy)); } this.vy = 0; }
      } else this.y = ny;
    }

    front(dist = 12) {
      const v = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[this.dir];
      return { x: this.x + v[0] * dist, y: this.y - 3 + v[1] * dist };
    }

    /* ---------------------------------------------------------- render */
    sprite(dir, frame, walking, closed) { return Sprites.charFrame(this.pal, dir, frame, walking, closed); }

    draw(ctx, camX, camY) {
      if (!this.visible) return;
      const x = Math.round(this.x - camX), y = Math.round(this.y - camY);
      const red = this.reduced();

      // rastro do dash
      for (const g of this.ghosts) {
        const spr = ghostSprite(this.sprite(g.dir, g.frame, g.walking, false));
        ctx.globalAlpha = (g.life / g.max) * 0.55;
        ctx.drawImage(spr, Math.round(g.x - camX) - 8 + spr.ox, Math.round(g.y - camY - g.z) - 24 + spr.oy);
      }
      ctx.globalAlpha = 1;

      // sombra (encolhe no ar)
      const air = Math.min(1, this.z / 22);
      ctx.fillStyle = `rgba(10,8,20,${(0.35 - air * 0.18).toFixed(2)})`;
      ctx.beginPath(); ctx.ellipse(x, y - 1, 6 * (1 - air * 0.35) * (red ? 1 : this.sx), 2.5 * (1 - air * 0.3), 0, 0, Math.PI * 2); ctx.fill();

      // respiração (mais funda quando cochila)
      let bx = 1, by = 1;
      if (!red && this.idleT > 0.4) { const deep = this.sleeping ? 0.045 : 0.018; const w = Math.sin(this.t * (this.sleeping ? 1.6 : 2.4)); by = 1 + w * deep; bx = 1 - w * deep * 0.5; }

      const dir = this.lookDir || this.dir;
      const closed = this.blinkHold > 0 || this.sleeping;
      const spr = this.sprite(dir, this.frame, this.walking, closed);
      const sx = red ? 1 : this.sx * bx, sy = red ? 1 : this.sy * by;
      if (sx === 1 && sy === 1) { ctx.drawImage(spr, x - 8 + spr.ox, Math.round(y - this.z) - 24 + spr.oy); return; }
      ctx.save();
      ctx.translate(x, Math.round(y - this.z));
      ctx.scale(sx, sy);
      ctx.drawImage(spr, -8 + spr.ox, -24 + spr.oy);
      ctx.restore();
    }
  }

  const ghostCache = new WeakMap();
  function ghostSprite(spr) {
    if (ghostCache.has(spr)) return ghostCache.get(spr);
    const c = Sprites.canvas(spr.width, spr.height); const g = c.getContext("2d");
    g.drawImage(spr, 0, 0); g.globalCompositeOperation = "source-in"; g.fillStyle = "#4fe3c1"; g.fillRect(0, 0, c.width, c.height);
    c.ox = spr.ox; c.oy = spr.oy; ghostCache.set(spr, c); return c;
  }

  Player.TUNING = TUNING;
  window.Player = Player;
})();
