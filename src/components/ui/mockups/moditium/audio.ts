import type { Vector } from "./engine";

/**
 * The player, synthesised.
 *
 * Streaming the real catalogue would need a MusicKit developer token and a
 * signed-in listener, and shipping copies of real recordings is not something
 * a portfolio gets to do. So the audio is generated from the same nine feature
 * values the recommender reasons about — tempo sets the clock, valence picks
 * major or minor, energy opens the filter, danceability decides how busy the
 * rhythm is, acousticness swaps the timbre. Move a slider and you hear the
 * feature move, which is the honest version of "plays what the filter says".
 *
 * Everything is scheduled ahead of the clock rather than fired from timers:
 * setInterval drifts by tens of milliseconds, which at 140 BPM is audible.
 */

const LOOKAHEAD_MS = 25;
const SCHEDULE_AHEAD = 0.12;

const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const MINOR = [0, 2, 3, 5, 7, 8, 10];

/** Four-bar progressions, as scale degrees. */
const PROGRESSION_BRIGHT = [0, 5, 3, 4];
const PROGRESSION_DARK = [0, 3, 5, 4];

export interface SynthState {
  step: number;
  bar: number;
}

export class ModitiumSynth {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private delay: DelayNode | null = null;
  private feedback: GainNode | null = null;

  private timer: number | null = null;
  private nextNoteTime = 0;
  private step = 0;
  private features: Vector;
  private root = 220;

  playing = false;
  onStep: ((s: SynthState) => void) | null = null;

  constructor(features: Vector) {
    this.features = features;
  }

  private get bpm() {
    return 68 + this.features.tempo * 80;
  }

  private get isMajor() {
    return this.features.valence >= 0.5;
  }

  private ensureContext() {
    if (this.ctx) return this.ctx;

    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctor();

    const master = ctx.createGain();
    master.gain.value = 0;

    // One shared low-pass is the "energy" control — opening it is what makes a
    // track read as more driven without simply getting louder.
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.Q.value = 0.8;

    // Feedback delay stands in for reverb; a convolver would need an impulse
    // response file and this ships nothing.
    const delay = ctx.createDelay(1.0);
    const feedback = ctx.createGain();
    const wet = ctx.createGain();
    wet.gain.value = 0.22;

    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -8;
    limiter.ratio.value = 12;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.15;

    filter.connect(master);
    filter.connect(delay);
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(wet);
    wet.connect(master);
    master.connect(limiter);
    limiter.connect(ctx.destination);

    this.ctx = ctx;
    this.master = master;
    this.filter = filter;
    this.delay = delay;
    this.feedback = feedback;
    this.applyFeatures();
    return ctx;
  }

  /** Push the current feature vector onto the live signal path. */
  private applyFeatures() {
    const ctx = this.ctx;
    if (!ctx || !this.filter || !this.delay || !this.feedback) return;
    const t = ctx.currentTime;
    const f = this.features;

    this.filter.frequency.setTargetAtTime(380 + f.energy * 4600, t, 0.12);
    this.delay.delayTime.setTargetAtTime(60 / this.bpm / 1.5, t, 0.2);
    this.feedback.gain.setTargetAtTime(0.18 + f.instrumentalness * 0.28, t, 0.2);
  }

  update(features: Vector) {
    this.features = features;
    this.applyFeatures();
  }

  /** Root pitch varies per track so consecutive previews do not blur together. */
  setRoot(hz: number) {
    this.root = hz;
  }

  private noteHz(degree: number, octave = 0) {
    const scale = this.isMajor ? MAJOR : MINOR;
    const idx = ((degree % 7) + 7) % 7;
    const oct = Math.floor(degree / 7) + octave;
    return this.root * Math.pow(2, scale[idx] / 12 + oct);
  }

  private env(node: GainNode, at: number, peak: number, attack: number, release: number) {
    node.gain.cancelScheduledValues(at);
    node.gain.setValueAtTime(0.0001, at);
    node.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), at + attack);
    node.gain.exponentialRampToValueAtTime(0.0001, at + attack + release);
  }

  private tone(
    at: number,
    hz: number,
    dur: number,
    peak: number,
    type: OscillatorType,
    detune = 0,
  ) {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(hz, at);
    osc.detune.setValueAtTime(detune, at);
    osc.connect(gain);
    gain.connect(this.filter!);
    this.env(gain, at, peak, Math.min(0.02, dur * 0.2), dur);
    osc.start(at);
    osc.stop(at + dur + 0.1);
  }

  private noise(at: number, dur: number, peak: number, hp: number) {
    const ctx = this.ctx!;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);

    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const band = ctx.createBiquadFilter();
    band.type = "highpass";
    band.frequency.value = hp;
    const gain = ctx.createGain();
    gain.gain.value = peak;
    src.connect(band);
    band.connect(gain);
    gain.connect(this.filter!);
    src.start(at);
  }

  private kick(at: number, peak: number) {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(120, at);
    osc.frequency.exponentialRampToValueAtTime(42, at + 0.11);
    osc.connect(gain);
    gain.connect(this.master!); // bypass the filter so the low end always lands
    this.env(gain, at, peak, 0.004, 0.22);
    osc.start(at);
    osc.stop(at + 0.4);
  }

  private scheduleStep(step: number, at: number) {
    const f = this.features;
    const bar = Math.floor(step / 16) % 4;
    const inBar = step % 16;

    const progression = this.isMajor ? PROGRESSION_BRIGHT : PROGRESSION_DARK;
    const degree = progression[bar];

    // Timbre: acoustic material gets triangle waves, electronic gets saw.
    const padType: OscillatorType = f.acousticness > 0.55 ? "triangle" : "sawtooth";
    const leadType: OscillatorType = f.acousticness > 0.7 ? "sine" : "triangle";

    const level = 0.16 + f.loudness * 0.22;

    // Pad — one sustained chord per bar.
    if (inBar === 0) {
      const dur = (60 / this.bpm) * 4 * 0.92;
      const spread = 6 + f.energy * 8;
      this.tone(at, this.noteHz(degree, -1), dur, level * 0.5, padType, -spread);
      this.tone(at, this.noteHz(degree + 2, -1), dur, level * 0.38, padType, spread);
      this.tone(at, this.noteHz(degree + 4, -1), dur, level * 0.32, padType, 0);
    }

    // Bass — root on the downbeat, with a push on the "and" when danceable.
    if (inBar === 0 || (inBar === 10 && f.danceability > 0.5)) {
      this.tone(at, this.noteHz(degree, -2), 0.34, level * 0.9, "sine");
    }

    // Kick — four on the floor once the track is energetic enough.
    const fourOnFloor = f.energy > 0.45 && f.danceability > 0.45;
    if (fourOnFloor ? inBar % 4 === 0 : inBar === 0 || inBar === 8) {
      this.kick(at, 0.5 + f.energy * 0.4);
    }

    // Hats — density rides danceability directly.
    const hatEvery = f.danceability > 0.72 ? 1 : f.danceability > 0.45 ? 2 : 4;
    if (inBar % hatEvery === 0) {
      this.noise(at, 0.03 + f.liveness * 0.03, 0.05 + f.energy * 0.09, 6500 - f.acousticness * 2500);
    }

    // Snare/clap on the backbeat.
    if (inBar === 4 || inBar === 12) {
      this.noise(at, 0.09, 0.07 + f.energy * 0.1, 1800);
    }

    // Melody — an arpeggio whose note count follows danceability and energy.
    const density = 0.2 + f.danceability * 0.5 + f.energy * 0.25;
    const melodySteps = [0, 3, 6, 8, 11, 14];
    if (melodySteps.includes(inBar) && this.rand(step) < density) {
      const shape = [0, 2, 4, 2, 6, 4][melodySteps.indexOf(inBar)];
      this.tone(at, this.noteHz(degree + shape, 1), 0.26, level * 0.34, leadType);
    }

    // Speech-like blips: a short, dry, mid-range tick.
    if (f.speechiness > 0.15 && inBar === 14) {
      this.noise(at, 0.04, 0.05, 900);
    }
  }

  /** Deterministic per-step jitter, so the same settings play the same way. */
  private rand(step: number) {
    const x = Math.sin(step * 12.9898 + 78.233) * 43758.5453;
    return x - Math.floor(x);
  }

  private tick = () => {
    const ctx = this.ctx;
    if (!ctx) return;
    const secondsPerStep = 60 / this.bpm / 4;

    while (this.nextNoteTime < ctx.currentTime + SCHEDULE_AHEAD) {
      this.scheduleStep(this.step, this.nextNoteTime);
      this.onStep?.({ step: this.step % 16, bar: Math.floor(this.step / 16) % 4 });
      this.step++;
      this.nextNoteTime += secondsPerStep;
    }
  };

  async start() {
    const ctx = this.ensureContext();
    if (ctx.state === "suspended") await ctx.resume();

    this.step = 0;
    this.nextNoteTime = ctx.currentTime + 0.06;
    this.playing = true;
    this.master!.gain.cancelScheduledValues(ctx.currentTime);
    this.master!.gain.setValueAtTime(0.0001, ctx.currentTime);
    this.master!.gain.linearRampToValueAtTime(0.9, ctx.currentTime + 0.25);

    this.timer = window.setInterval(this.tick, LOOKAHEAD_MS);
    this.tick();
  }

  stop() {
    this.playing = false;
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
    const ctx = this.ctx;
    if (ctx && this.master) {
      // Fade rather than cut — stopping a running oscillator bank instantly
      // produces a click on every voice.
      this.master.gain.cancelScheduledValues(ctx.currentTime);
      this.master.gain.setValueAtTime(this.master.gain.value, ctx.currentTime);
      this.master.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.12);
    }
  }

  dispose() {
    this.stop();
    this.ctx?.close();
    this.ctx = null;
  }
}
