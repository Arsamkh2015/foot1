// ------------------------------------------------------------------
// Tiny WebAudio synth for match + UI sound effects.
// Everything is generated — no audio assets.
// ------------------------------------------------------------------

type SfxName =
  | "click"
  | "hover"
  | "whistle"
  | "whistleLong"
  | "whistleFull"
  | "kick"
  | "pass"
  | "cross"
  | "skill"
  | "bounce"
  | "post"
  | "catch"
  | "tackle"
  | "goal"
  | "save"
  | "select";

class AudioFX {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private crowdGain: GainNode | null = null;
  private crowdSrc: AudioBufferSourceNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  volume = 0.8;
  muted = false;

  /** Must be called from a user gesture at least once. */
  ensure() {
    if (!this.ctx) {
      const AC: typeof AudioContext | undefined =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : this.volume;
      this.master.connect(this.ctx.destination);
      const len = this.ctx.sampleRate * 2;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < len; i++) {
        const white = Math.random() * 2 - 1;
        last = (last + 0.02 * white) / 1.02; // brown-ish
        d[i] = last * 3.2;
      }
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  setVolume(v: number) {
    this.volume = v;
    if (this.master && this.ctx)
      this.master.gain.setTargetAtTime(this.muted ? 0 : v, this.ctx.currentTime, 0.05);
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.master && this.ctx)
      this.master.gain.setTargetAtTime(m ? 0 : this.volume, this.ctx.currentTime, 0.05);
  }

  private tone(
    type: OscillatorType,
    f0: number,
    f1: number,
    dur: number,
    gain: number,
    delay = 0
  ) {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  private noise(dur: number, gain: number, freq: number, q = 1, delay = 0) {
    if (!this.ctx || !this.master || !this.noiseBuf) return;
    const t = this.ctx.currentTime + delay;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = freq;
    f.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(this.master);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  play(name: SfxName) {
    if (!this.ctx || this.muted) return;
    switch (name) {
      case "click":
        this.tone("square", 240, 160, 0.07, 0.16);
        break;
      case "hover":
        this.tone("square", 340, 300, 0.035, 0.05);
        break;
      case "select":
        this.tone("square", 300, 520, 0.09, 0.14);
        this.tone("square", 600, 900, 0.08, 0.08, 0.06);
        break;
      case "whistle":
        this.tone("triangle", 2350, 2250, 0.28, 0.22);
        this.noise(0.28, 0.1, 2400, 6);
        break;
      case "whistleLong":
        this.tone("triangle", 2350, 2150, 0.75, 0.22);
        this.noise(0.75, 0.1, 2400, 6);
        break;
      case "whistleFull":
        [0, 0.45, 0.95].forEach((d, i) => {
          this.tone("triangle", 2350, i === 2 ? 1900 : 2250, i === 2 ? 1.0 : 0.32, 0.22, d);
          this.noise(i === 2 ? 1.0 : 0.32, 0.1, 2400, 6, d);
        });
        break;
      case "kick":
        this.tone("sine", 150, 45, 0.14, 0.5);
        this.noise(0.09, 0.3, 900, 1.4);
        break;
      case "pass":
        this.tone("sine", 170, 70, 0.09, 0.3);
        this.noise(0.06, 0.16, 1100, 1.6);
        break;
      case "cross":
        this.tone("sine", 140, 55, 0.16, 0.4);
        this.noise(0.14, 0.2, 1500, 1.2);
        break;
      case "skill":
        this.tone("square", 500, 820, 0.07, 0.12);
        this.tone("square", 820, 1180, 0.07, 0.1, 0.05);
        break;
      case "bounce":
        this.tone("sine", 130, 60, 0.07, 0.18);
        break;
      case "post":
        this.tone("square", 620, 610, 0.3, 0.2);
        this.tone("square", 1240, 1230, 0.25, 0.08);
        break;
      case "catch":
        this.noise(0.12, 0.24, 500, 1.2);
        break;
      case "tackle":
        this.noise(0.12, 0.3, 350, 1);
        this.tone("sine", 110, 50, 0.1, 0.22);
        break;
      case "save":
        this.noise(0.16, 0.3, 700, 1.2);
        this.tone("sine", 140, 60, 0.12, 0.3);
        break;
      case "goal":
        // crowd roar + stadium horn
        this.crowdSwell();
        this.tone("sawtooth", 392, 392, 0.7, 0.12, 0.05);
        this.tone("sawtooth", 494, 494, 0.7, 0.1, 0.05);
        this.tone("sawtooth", 587, 587, 0.9, 0.08, 0.12);
        break;
    }
  }

  crowd(on: boolean) {
    if (!this.ctx || !this.master || !this.noiseBuf) return;
    if (on && !this.crowdSrc) {
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuf;
      src.loop = true;
      const f = this.ctx.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = 850;
      const g = this.ctx.createGain();
      g.gain.value = 0;
      g.gain.setTargetAtTime(0.045, this.ctx.currentTime, 1.2);
      src.connect(f).connect(g).connect(this.master);
      src.start();
      this.crowdSrc = src;
      this.crowdGain = g;
    } else if (!on && this.crowdSrc) {
      const src = this.crowdSrc;
      if (this.crowdGain)
        this.crowdGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.4);
      window.setTimeout(() => {
        try {
          src.stop();
        } catch {
          /* already stopped */
        }
      }, 1500);
      this.crowdSrc = null;
      this.crowdGain = null;
    }
  }

  crowdSwell() {
    if (!this.ctx || !this.master || !this.noiseBuf) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const f = this.ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.setValueAtTime(500, t);
    f.frequency.linearRampToValueAtTime(2600, t + 0.5);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.02, t);
    g.gain.linearRampToValueAtTime(0.32, t + 0.35);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2.6);
    src.connect(f).connect(g).connect(this.master);
    src.start(t);
    src.stop(t + 2.8);
  }
}

export const sfx = new AudioFX();
