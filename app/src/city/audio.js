// City ambience made entirely with the Web Audio API (no downloads): rain hiss, distant traffic rumble,
// cars passing left-to-right, and now and then a far-off two-tone siren. Off until the visitor turns it on.
export function createAmbience() {
  let ctx = null;
  let master = null;
  let rainGain = null;
  let timers = [];
  let on = false;
  let rain = true;
  let schedule = null; // starts the passing-car and siren timers

  function noiseBuffer(kind) {
    const len = ctx.sampleRate * 4;
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      let last = 0;
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1;
        if (kind === 'brown') {
          last = (last + 0.02 * w) / 1.02;
          d[i] = last * 3.5;
        } else d[i] = w;
      }
    }
    return buf;
  }
  function loop(buf) {
    const s = ctx.createBufferSource();
    s.buffer = buf;
    s.loop = true;
    s.start();
    return s;
  }

  function build() {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
    const white = noiseBuffer('white');
    const brown = noiseBuffer('brown');

    // rain: band-limited hiss
    rainGain = ctx.createGain();
    rainGain.gain.value = rain ? 0.09 : 0;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 900;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 7000;
    loop(white).connect(hp).connect(lp).connect(rainGain).connect(master);

    // traffic rumble with a slow swell
    const rumble = ctx.createGain();
    rumble.gain.value = 0.22;
    const rl = ctx.createBiquadFilter();
    rl.type = 'lowpass';
    rl.frequency.value = 320;
    loop(brown).connect(rl).connect(rumble).connect(master);
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoAmt = ctx.createGain();
    lfoAmt.gain.value = 0.08;
    lfo.connect(lfoAmt).connect(rumble.gain);
    lfo.start();

    // a car passing: filtered noise sweeping across the stereo field
    const pass = () => {
      if (!on) return;
      const src = ctx.createBufferSource();
      src.buffer = white;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.Q.value = 0.8;
      const g = ctx.createGain();
      const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      const t = ctx.currentTime;
      const dur = 2.2 + Math.random() * 1.8;
      const dir = Math.random() < 0.5 ? -1 : 1;
      bp.frequency.setValueAtTime(260, t);
      bp.frequency.linearRampToValueAtTime(700 + Math.random() * 300, t + dur * 0.5);
      bp.frequency.linearRampToValueAtTime(240, t + dur);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.16 + Math.random() * 0.1, t + dur * 0.5);
      g.gain.linearRampToValueAtTime(0, t + dur);
      let node = src.connect(bp).connect(g);
      if (pan) {
        pan.pan.setValueAtTime(-0.9 * dir, t);
        pan.pan.linearRampToValueAtTime(0.9 * dir, t + dur);
        node = node.connect(pan);
      }
      node.connect(master);
      src.start(t, Math.random() * 2, dur);
      timers.push(setTimeout(pass, 2500 + Math.random() * 6000));
    };

    // distant two-tone siren (German "tatü-tata"), heavily filtered and quiet
    const siren = () => {
      if (!on) return;
      const t = ctx.currentTime;
      const dur = 9;
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      for (let k = 0; k < dur / 1.3; k++) {
        osc.frequency.setValueAtTime(440, t + k * 1.3);
        osc.frequency.setValueAtTime(585, t + k * 1.3 + 0.65);
      }
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 1100;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.035, t + 3.5);
      g.gain.linearRampToValueAtTime(0, t + dur);
      osc.connect(f).connect(g).connect(master);
      osc.start(t);
      osc.stop(t + dur);
      timers.push(setTimeout(siren, 45000 + Math.random() * 60000));
    };
    schedule = () => {
      timers.push(setTimeout(pass, 800));
      timers.push(setTimeout(siren, 15000 + Math.random() * 20000));
    };
  }

  return {
    get on() {
      return on;
    },
    async toggle() {
      on = !on;
      if (on && !ctx) build();
      if (!ctx) return on;
      timers.forEach(clearTimeout);
      timers = [];
      if (on) {
        await ctx.resume();
        schedule();
      }
      const t = ctx.currentTime;
      master.gain.cancelScheduledValues(t);
      master.gain.setValueAtTime(master.gain.value, t);
      master.gain.linearRampToValueAtTime(on ? 0.9 : 0, t + 0.8);
      if (!on) setTimeout(() => !on && ctx.suspend(), 900);
      return on;
    },
    setRain(r) {
      rain = r;
      if (rainGain) rainGain.gain.setTargetAtTime(r ? 0.09 : 0, ctx.currentTime, 0.4);
    },
  };
}
