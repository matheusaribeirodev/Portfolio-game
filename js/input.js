/* ==========================================================================
   input.js — Teclado (WASD / setas) e joystick virtual para toque
   ========================================================================== */

(function () {
  "use strict";

  const keys = new Set();
  const MAP = {
    KeyW: "up", ArrowUp: "up", KeyS: "down", ArrowDown: "down",
    KeyA: "left", ArrowLeft: "left", KeyD: "right", ArrowRight: "right",
  };
  const Input = {
    joy: { x: 0, y: 0, active: false },
    dirs: { up: false, down: false, left: false, right: false },
    enabled: true,
    vector() {
      let x = 0, y = 0;
      if (this.enabled) {
        if (this.dirs.left) x -= 1; if (this.dirs.right) x += 1;
        if (this.dirs.up) y -= 1; if (this.dirs.down) y += 1;
        if (this.joy.active) { x += this.joy.x; y += this.joy.y; }
      }
      const len = Math.hypot(x, y);
      if (len > 1) { x /= len; y /= len; }
      return { x, y };
    },
    clear() { keys.clear(); Object.keys(this.dirs).forEach((k) => (this.dirs[k] = false)); this.joy.x = this.joy.y = 0; this.joy.active = false; resetKnob(); },
    isMoveKey(code) { return code in MAP; },
    keyDown(code) { if (MAP[code]) { keys.add(code); this._sync(); } },
    keyUp(code) { if (MAP[code]) { keys.delete(code); this._sync(); } },
    _sync() { Object.keys(this.dirs).forEach((k) => (this.dirs[k] = false)); keys.forEach((c) => (this.dirs[MAP[c]] = true)); },
  };

  window.addEventListener("blur", () => Input.clear());

  /* --------------------------------------------------- joystick virtual */
  let knob = null, base = null, pid = null, cx = 0, cy = 0, radius = 46;
  function resetKnob() { if (knob) knob.style.transform = "translate(-50%, -50%)"; }
  Input.bindJoystick = function (baseEl, knobEl) {
    base = baseEl; knob = knobEl;
    const start = (e) => {
      if (pid !== null) return;
      pid = e.pointerId; base.setPointerCapture(pid);
      const r = base.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2; radius = r.width * 0.42;
      Input.joy.active = true; move(e); e.preventDefault();
    };
    const move = (e) => {
      if (e.pointerId !== pid) return;
      let dx = e.clientX - cx, dy = e.clientY - cy;
      const len = Math.hypot(dx, dy);
      if (len > radius) { dx = (dx / len) * radius; dy = (dy / len) * radius; }
      const nx = dx / radius, ny = dy / radius;
      const dead = 0.18; const m = Math.hypot(nx, ny);
      Input.joy.x = m < dead ? 0 : nx; Input.joy.y = m < dead ? 0 : ny;
      knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
      e.preventDefault();
    };
    const end = (e) => { if (e.pointerId !== pid) return; pid = null; Input.joy.active = false; Input.joy.x = Input.joy.y = 0; resetKnob(); };
    base.addEventListener("pointerdown", start);
    base.addEventListener("pointermove", move);
    base.addEventListener("pointerup", end);
    base.addEventListener("pointercancel", end);
  };

  window.Input = Input;
})();
