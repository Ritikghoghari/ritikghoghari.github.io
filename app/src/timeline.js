// Shared scroll timeline. `s` is normalised scroll progress in [0, 1].
// Each stop is a camera "dwell"; the camera eases between consecutive stops.

export const STOPS = [
  { s: 0.0, pos: [0, 0.6, 16], look: [0, 0.4, 0] },
  { s: 0.1, pos: [0, 0.6, 16], look: [0, 0.4, 0] },
  { s: 0.21, pos: [0, 0, -24], look: [0, 0, -40] },
  { s: 0.32, pos: [0, 0, -24], look: [0, 0, -40] },
  { s: 0.42, pos: [0, 0, -58], look: [0, 0, -80] },
  { s: 0.52, pos: [0, 0, -58], look: [0, 0, -80] },
  { s: 0.61, pos: [0, 0, -120], look: [0, 0, -136] },
  { s: 0.89, pos: [0, 0, -120], look: [0, 0, -136] },
  { s: 0.96, pos: [0, 0, -162], look: [0, 0, -180] },
  { s: 1.0, pos: [0, 0, -162], look: [0, 0, -180] },
];

// Which DOM panel is active over which range, and where its nav link scrolls to.
export const SECTIONS = [
  { id: 'home', from: 0.0, to: 0.15, anchor: 0.0 },
  { id: 'about', from: 0.16, to: 0.36, anchor: 0.26 },
  { id: 'skills', from: 0.37, to: 0.56, anchor: 0.47 },
  { id: 'projects', from: 0.57, to: 0.93, anchor: 0.61 },
  { id: 'contact', from: 0.94, to: 1.01, anchor: 1.0 },
];

// Scroll range over which the project carousel turns from card 0 to the last card.
export const CAROUSEL = { from: 0.61, to: 0.89 };

export const projectScroll = (index, count) =>
  CAROUSEL.from + (count > 1 ? index / (count - 1) : 0) * (CAROUSEL.to - CAROUSEL.from);

const smooth = (t) => t * t * (3 - 2 * t);

export function sampleCamera(s, outPos, outLook) {
  let i = 0;
  while (i < STOPS.length - 2 && s > STOPS[i + 1].s) i++;
  const a = STOPS[i];
  const b = STOPS[i + 1];
  const span = b.s - a.s;
  const t = span > 0 ? smooth(Math.min(1, Math.max(0, (s - a.s) / span))) : 0;
  for (let k = 0; k < 3; k++) {
    outPos[k] = a.pos[k] + (b.pos[k] - a.pos[k]) * t;
    outLook[k] = a.look[k] + (b.look[k] - a.look[k]) * t;
  }
}
