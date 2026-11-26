/* ==========================================================================
   audio.js — Efeitos sonoros e trilha chiptune gerados com Web Audio API
   (sem arquivos de áudio; tudo é sintetizado em tempo real)
   ========================================================================== */

(function () {
  "use strict";

  const A = {
    ctx: null, master: null, sfxGain: null, musicGain: null,
    sfxOn: true, musicOn: true, volume: 0.7,
    _timer: null, _step: 0, _next: 0,

    init() {
      if (this.ctx) { if (this.ctx.state === "suspended") this.ctx.resume(); return; }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain(); this.master.gain.value = this.volume; this.master.connect(this.ctx.destination);
      this.sfxGain = this.ctx.createGain(); this.sfxGain.gain.value = this.sfxOn ? 0.5 : 0; this.sfxGain.connect(this.master);
      this.musicGain = this.ctx.createGain(); this.musicGain.gain.value = 0; this.musicGain.connect(this.master);
      const len = this.ctx.sampleRate * 0.4;
      this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noise.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      if (this.musicOn) this.startMusic();
    },
    setSfx(on) { this.sfxOn = on; if (this.sfxGain) this.sfxGain.gain.setTargetAtTime(on ? 0.5 : 0, this.ctx.currentTime, 0.02); },
    setMusic(on) { this.musicOn = on; if (!this.ctx) return; if (on) this.startMusic(); else this.stopMusic(); },
    setVolume(v) { this.volume = v; if (this.master) this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05); },

    tone(freq, dur, type = "square", vol = 0.2, when = 0, slide = 0, dest) {
      if (!this.ctx) return;
      const t = this.ctx.currentTime + when;
      const o = this.ctx.createOscillator(); const g = this.ctx.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(dest || this.sfxGain); o.start(t); o.stop(t + dur + 0.02);
    },
    noiseBurst(dur, vol, freq = 1200, when = 0) {
      if (!this.ctx) return;
      const t = this.ctx.currentTime + when;
      const s = this.ctx.createBufferSource(); s.buffer = this.noise;
      const f = this.ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = freq;
      const g = this.ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.connect(f); f.connect(g); g.connect(this.sfxGain); s.start(t); s.stop(t + dur + 0.02);
    },
    play(name) {
      if (!this.ctx || !this.sfxOn) return;
      switch (name) {
        case "step": this.noiseBurst(0.05, 0.05, 700); break;
        case "blip": this.tone(880, 0.07, "square", 0.08); this.tone(1320, 0.08, "square", 0.06, 0.05); break;
        case "type": this.tone(1500 + Math.random() * 300, 0.02, "square", 0.025); break;
        case "open": this.tone(523, 0.08, "triangle", 0.18); this.tone(784, 0.12, "triangle", 0.16, 0.06); break;
        case "close": this.tone(660, 0.07, "triangle", 0.14); this.tone(440, 0.1, "triangle", 0.12, 0.05); break;
        case "select": this.tone(700, 0.05, "square", 0.06); break;
        case "zone": [392, 523, 659].forEach((f, i) => this.tone(f, 0.16, "triangle", 0.14, i * 0.07)); break;
        case "achievement": [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.16, "square", 0.08, i * 0.08)); this.tone(1568, 0.35, "triangle", 0.12, 0.34); break;
        case "quest": [659, 880, 1175].forEach((f, i) => this.tone(f, 0.12, "triangle", 0.15, i * 0.09)); break;
        case "warp": this.tone(220, 0.35, "sawtooth", 0.06, 0, 880); this.noiseBurst(0.3, 0.06, 2400); break;
        case "bump": this.tone(110, 0.06, "square", 0.05); break;
        case "dash": this.noiseBurst(0.16, 0.09, 3200); this.tone(320, 0.12, "triangle", 0.06, 0, 360); break;
        case "jump": this.tone(330, 0.12, "square", 0.05, 0, 330); break;
        case "land": this.noiseBurst(0.08, 0.08, 500); this.tone(90, 0.08, "triangle", 0.1); break;
        case "beam": this.tone(180, 0.6, "sawtooth", 0.04, 0, 900); this.tone(1200, 0.4, "triangle", 0.05, 0.3, -600); this.noiseBurst(0.5, 0.05, 4000, 0.1); break;
        case "reveal": [523, 784, 1046].forEach((f, i) => this.tone(f, 0.25, "triangle", 0.09, i * 0.06)); break;
        case "pop": this.tone(900, 0.05, "square", 0.05); this.tone(1400, 0.05, "square", 0.04, 0.04); break;
      }
    },

    /* ------------------------------------------------------- trilha */
    startMusic() {
      if (!this.ctx || this._timer) return;
      this.musicGain.gain.setTargetAtTime(0.22, this.ctx.currentTime, 0.8);
      this._next = this.ctx.currentTime + 0.1;
      this._timer = setInterval(() => this._schedule(), 30);
    },
    stopMusic() {
      if (!this._timer) return;
      clearInterval(this._timer); this._timer = null;
      this.musicGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.2);
    },
    _schedule() {
      const bpm = 84, step = 60 / bpm / 2; // colcheias
      // Am – F – C – G (lo-fi chiptune tranquilo)
      const chords = [[57, 60, 64, 69], [53, 57, 60, 65], [48, 52, 55, 60], [55, 59, 62, 67]];
      const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
      while (this._next < this.ctx.currentTime + 0.2) {
        const s = this._step % 64, bar = Math.floor(s / 16), beat = s % 16;
        const ch = chords[bar];
        const when = this._next - this.ctx.currentTime;
        if (beat % 8 === 0) this.tone(mtof(ch[0] - 12), step * 3.5, "triangle", 0.22, when, 0, this.musicGain);
        if (beat % 8 === 4) this.tone(mtof(ch[0] - 12 + 7), step * 1.5, "triangle", 0.14, when, 0, this.musicGain);
        const arp = [0, 1, 2, 3, 2, 1, 2, 3][beat % 8];
        this.tone(mtof(ch[arp] + 12), step * 0.9, "square", 0.028, when, 0, this.musicGain);
        if (beat === 6 || beat === 14) this.tone(mtof(ch[3] + 24), step * 2, "triangle", 0.03, when, 0, this.musicGain);
        this._next += step; this._step++;
      }
    },
  };

  window.GameAudio = A;
})();
