// Sci-fi assets: ships, stations, colonies, cities, mines and alien ruins.
// House style: bevelled corners, bolted panels, dark screens with glowing readouts, vents and
// hazard stripes. Every piece is drawn as its real top-down shape first (tracks, fans, tanks,
// beds), then given surface detail, so it reads at a glance at map size.
// Line weights: thick outline (o, s, m, ko), structure lines (l), texture (t, pl, d).
// height: low (seats, beds), mid (tables, counters; the default), tall (cabinets, machines).
// Backs face the top edge (wallSide n).

import { seat, screen, buttons, hazard, figure, stoneShape, bolts, slats, leafCluster } from '../motifs.js';

const S = ['scifi'];

/** Grille of slats inside a bevelled frame. */
function vent(g, x, y, w, h) {
  g.chamfer(x, y, w, h, 6, 'o');
  slats(g, x + 7, y + 4, w - 14, h - 8, 8, 'h', 'l');
}

/** Row or grid of status lights (paper and shade dots). */
function lights(g, x, y, cols, rows, gap = 10) {
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) g.circle(x + i * gap, y + j * gap, 2.6, (i + j * 3) % 4 ? 'p' : 'h');
}

/** A rectangle rotated about its own centre. */
function rrect(g, cx, cy, w, h, deg, cls, r = 0) {
  g.add(`<g transform="rotate(${deg} ${cx} ${cy})">`);
  g.rect(cx - w / 2, cy - h / 2, w, h, cls, r);
  g.add('</g>');
}

/** Bubbles in a liquid: paper rings of a few sizes. */
function bubbles(g, list) {
  for (const [x, y, r] of list) g.circle(x, y, r, 'o');
}

/** A thick hose or pipe along a path: ink outline with a paper core. */
function hose(g, d) {
  g.add(`<path d="${d}" style="fill:none;stroke:var(--ink,#1b1b1b);stroke-width:9;stroke-linecap:round;stroke-linejoin:round"/>`);
  g.add(`<path d="${d}" style="fill:none;stroke:var(--shade,#c6c6c6);stroke-width:4;stroke-linecap:round;stroke-linejoin:round"/>`);
}

/** Pipe flange: ink band across a pipe. */
function flange(g, x, y, w, h) {
  g.rect(x, y, w, h, 'ko', 2);
}

export default function define({ A, G }) {
  // ---- ship basics ---------------------------------------------------------

  G('console', 'Console', S, 'console', { len: 2 }, { placement: 'wall', roomTypes: ['bridge', 'engine-room', 'lab', 'med-bay', 'airlock', 'command-centre', 'security', 'server-room', 'cloning-lab', 'corridor', 'crew-quarters', 'cargo-bay', 'armoury', 'detention', 'hangar', 'market', 'landing-pad'], max: 4, weight: 3 }, { len: [1, 4] });

  A('captain-chair', "Captain's chair", S, [1, 1], { placement: 'centre', height: 'low', roomTypes: ['bridge', 'command-centre'], min: 1, max: 1 }, (g) => {
    g.circle(50, 54, 42, 'm'); // swivel base
    g.circle(50, 54, 36, 't');
    g.rect(16, 6, 68, 26, 'ko', 12); // high back
    g.rect(36, 9, 28, 9, 'o', 4); // headrest
    g.rect(28, 26, 44, 54, 'o', 14); // seat
    g.line(34, 52, 66, 52, 't');
    g.rect(8, 30, 22, 56, 's', 8); // arms with control pads
    g.rect(70, 30, 22, 56, 's', 8);
    screen(g, 11, 56, 16, 24, 'bars');
    buttons(g, 81, 62, 1, 1, 3.5);
    buttons(g, 81, 72, 1, 1, 3.5);
    g.circle(81, 44, 5, 'ko');
  });

  A('pilot-seat', 'Pilot seat', S, [1, 1], { placement: 'free', height: 'low', blocksMovement: false, roomTypes: ['bridge', 'command-centre', 'detention', 'security', 'cloning-lab'], max: 4 }, (g) => {
    g.path('M6 30V12Q6 4 14 4H86Q94 4 94 12V30Q50 20 6 30Z', 's'); // curved flight console
    screen(g, 14, 8, 34, 16, 'radar');
    screen(g, 52, 8, 34, 16, 'bars');
    g.rect(38, 30, 24, 8, 'ko', 3); // yoke
    g.circle(36, 34, 5, 'ko');
    g.circle(64, 34, 5, 'ko');
    seat(g, 50, 70, 'n', 46);
  });

  A('holo-table', 'Holo table', S, [2, 2], { light: { bright: 0, dim: 2, color: '#59d8ff' }, placement: 'centre', roomTypes: ['bridge', 'lab', 'armoury', 'command-centre'], max: 1 }, (g) => {
    g.chamfer(8, 8, 184, 184, 44, 's');
    g.chamfer(26, 26, 148, 148, 36, 'ko');
    for (const [x, y, w, h] of [[70, 12, 60, 10], [70, 178, 60, 10], [12, 70, 10, 60], [178, 70, 10, 60]]) g.rect(x, y, w, h, 'o', 2);
    for (let i = 0; i < 5; i++) {
      g.rect(74 + i * 11, 14, 7, 6, 'k', 1);
      g.rect(74 + i * 11, 180, 7, 6, 'k', 1);
      g.rect(14, 74 + i * 11, 6, 7, 'k', 1);
      g.rect(180, 74 + i * 11, 6, 7, 'k', 1);
    }
    // The hologram: a wireframe planet with an orbit and two ships.
    g.circle(100, 100, 44, 'pl');
    g.add('<ellipse class="pl" cx="100" cy="100" rx="44" ry="16" style="stroke-dasharray:6 5"/>');
    g.add('<ellipse class="pl" cx="100" cy="100" rx="16" ry="44" style="stroke-dasharray:6 5"/>');
    g.add('<ellipse class="pl" cx="100" cy="100" rx="64" ry="26" transform="rotate(-24 100 100)" style="stroke-dasharray:3 6"/>');
    g.poly([[150, 74], [160, 78], [150, 82], [152, 78]], 'p');
    g.poly([[48, 124], [40, 128], [48, 132], [46, 128]], 'p');
    g.circle(100, 100, 6, 'p');
  });

  G('med-bed', 'Med bed', S, 'medbed', {}, { placement: 'wall', height: 'low', roomTypes: ['med-bay', 'clinic', 'cloning-lab'], max: 6, weight: 3 });

  A('med-scanner', 'Med scanner', S, [1, 2], { placement: 'centre', roomTypes: ['med-bay', 'lab', 'clinic', 'cloning-lab'], max: 1 }, (g) => {
    g.chamfer(18, 6, 64, 188, 10, 's');
    g.rect(24, 14, 52, 174, 'o', 8);
    g.rect(32, 20, 36, 22, 's', 8); // head rest
    g.path('M24 112Q50 104 76 112', 'l');
    g.lines([[30, 128, 70, 128], [30, 146, 70, 146], [30, 164, 70, 164]], 't');
    g.chamfer(4, 74, 92, 30, 8, 'ko'); // the scanning ring
    g.rect(12, 84, 76, 10, 'm', 3);
    for (const x of [20, 35, 50, 65, 80]) g.circle(x, 89, 2.6, 'p');
    g.line(24, 70, 76, 70, 'd');
  });

  G('med-cabinet', 'Medical cabinet', S, 'medcab', {}, { placement: 'wall', height: 'tall', roomTypes: ['med-bay', 'clinic'], max: 3 });

  G('locker', 'Storage locker', S, 'locker', { kind: 'storage' }, { placement: 'wall', height: 'tall', roomTypes: ['crew-quarters', 'cargo-bay', 'airlock', 'armoury', 'engine-room', 'hangar', 'workshop', 'apartment', 'hydroponics-bay', 'lab'], max: 4, weight: 2 });

  G('weapon-locker', 'Weapon locker', S, 'locker', { kind: 'weapons' }, { placement: 'wall', height: 'tall', roomTypes: ['armoury', 'bridge', 'security'], min: 1, max: 3 });

  G('armour-rack', 'Armour rack', S, 'locker', { kind: 'armour' }, { placement: 'wall', height: 'tall', roomTypes: ['armoury', 'airlock', 'security', 'hangar'], max: 2 });

  G('cargo-crate', 'Cargo crate', S, 'cargo', { w: 1, h: 1, style: 'container' }, { placement: 'corner', roomTypes: ['cargo-bay', 'engine-room', 'airlock', 'corridor', 'hangar', 'market', 'landing-pad', 'workshop', 'colony-yard', 'crash-site'], max: 8, weight: 3 }, { w: [1, 2], h: [1, 2] });
  G('container', 'Cargo container', S, 'cargo', { w: 2, h: 4, style: 'container' }, { placement: 'free', height: 'tall', blocksVision: true, roomTypes: ['cargo-bay', 'hangar', 'landing-pad', 'colony-yard'], max: 3 }, { w: [2, 3], h: [3, 5] });

  A('fuel-drum', 'Fuel drum', S, [1, 1], { placement: 'corner', roomTypes: ['engine-room', 'cargo-bay', 'hangar', 'landing-pad', 'mine', 'colony-yard', 'crash-site'], max: 4 }, (g) => {
    g.circle(50, 50, 40, 's'); // rolled rim
    g.circle(50, 50, 33, 'o'); // lid
    g.circle(50, 50, 24, 't');
    g.circle(68, 32, 7, 'ko'); // filler cap
    g.circle(68, 32, 2.5, 'p');
    g.circle(32, 68, 4, 'ko'); // vent bung
    g.poly([[50, 34], [64, 50], [50, 66], [36, 50]], 'ko'); // flammable label
    g.path('M50 59Q43 54 46 47Q48 51 50 49Q49 44 53 41Q52 47 56 50Q57 56 50 59Z', 'p');
  });

  A('reactor', 'Reactor core', S, [3, 3], { light: { bright: 2, dim: 5, color: '#57c7ff', animation: 'pulse' }, placement: 'centre', height: 'tall', blocksVision: true, roomTypes: ['engine-room', 'server-room'], min: 1, max: 1 }, (g) => {
    g.chamfer(6, 6, 288, 288, 64, 's');
    // Coolant pipes out to the four corners, with flanges.
    for (const [x, y] of [[40, 40], [260, 40], [40, 260], [260, 260]]) {
      g.add(`<path class="ko" d="M150 150L${x} ${y}" style="stroke-width:26"/>`);
      g.add(`<path class="o" d="M150 150L${x} ${y}" style="stroke:var(--mid,#8d8d8d);stroke-width:14;fill:none"/>`);
      g.circle(x, y, 16, 'ko');
      g.circle(x, y, 6, 'm');
    }
    bolts(g, 6, 6, 288, 288, 30, 4);
    hazardRing(g, 150, 150, 120, 104);
    g.circle(150, 150, 96, 'ko');
    // Control rods round the core.
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI) / 6;
      g.circle(150 + Math.cos(a) * 82, 150 + Math.sin(a) * 82, 7, 'm');
    }
    g.circle(150, 150, 66, 'pl');
    g.circle(150, 150, 50, 'o');
    g.circle(150, 150, 34, 'h');
    g.circle(150, 150, 18, 'p');
    g.circle(150, 150, 42, 'd');
  });

  A('turbine', 'Engine turbine', S, [2, 2], { placement: 'wall', height: 'tall', roomTypes: ['engine-room', 'server-room'], max: 2 }, (g) => {
    g.chamfer(6, 6, 188, 188, 34, 's');
    bolts(g, 6, 6, 188, 188, 20, 3.5);
    g.circle(100, 100, 82, 'ko');
    g.circle(100, 100, 74, 'm');
    // Curved fan blades.
    for (let i = 0; i < 11; i++) {
      const a = (i * Math.PI * 2) / 11;
      const p = (t, r) => `${(100 + Math.cos(a + t) * r).toFixed(1)} ${(100 + Math.sin(a + t) * r).toFixed(1)}`;
      g.path(`M${p(0, 20)}Q${p(0.35, 52)} ${p(0.55, 72)}L${p(0.82, 72)}Q${p(0.5, 40)} ${p(0.3, 20)}Z`, i % 2 ? 's' : 'o');
    }
    g.circle(100, 100, 22, 'o'); // nose cone
    g.circle(100, 100, 12, 's');
    g.circle(100, 100, 4, 'k');
  });

  A('generator', 'Power generator', S, [1, 2], { placement: 'wall', height: 'tall', roomTypes: ['engine-room', 'cargo-bay', 'workshop', 'mine', 'server-room'], max: 2 }, (g) => {
    g.path('M50 186Q50 198 64 198', 'l'); // power cable out
    g.chamfer(6, 4, 88, 184, 12, 's');
    g.chamfer(14, 12, 72, 72, 8, 'm');
    g.circle(50, 48, 30, 'ko'); // cooling fan
    for (let i = 0; i < 7; i++) {
      const a = (i * Math.PI * 2) / 7;
      const p = (t) => `${(50 + Math.cos(a + t) * 26).toFixed(1)} ${(48 + Math.sin(a + t) * 26).toFixed(1)}`;
      g.path(`M50 48L${p(0)}A26 26 0 0 1 ${p(0.56)}Z`, 's');
    }
    g.circle(50, 48, 7, 'o');
    for (const cx of [30, 70]) {
      // Power cells.
      g.circle(cx, 112, 17, 'o');
      g.circle(cx, 112, 11, 's');
      g.circle(cx, 112, 4, 'k');
    }
    g.line(47, 112, 53, 112, 'l');
    g.rect(22, 140, 56, 32, 'ko', 4); // warning plate
    g.poly([[54, 145], [40, 158], [50, 158], [44, 168], [60, 154], [50, 154]], 'p');
    bolts(g, 6, 4, 88, 184, 10, 2.6);
  });

  A('pipes', 'Pipe run', S, [2, 1], { placement: 'wall', layer: 'floor', blocksMovement: false, roomTypes: ['engine-room', 'corridor', 'cargo-bay', 'hydroponics-bay', 'mine', 'server-room'], max: 3 }, (g) => {
    g.rect(0, 6, 200, 16, 'o', 6);
    g.line(4, 11, 196, 11, 't');
    g.rect(0, 28, 200, 16, 's', 6);
    g.line(4, 33, 196, 33, 'pl');
    for (const x of [20, 150]) flange(g, x, 2, 10, 46);
    // Valve wheel and a pressure gauge.
    g.circle(86, 14, 13, 'l');
    g.lines([[73, 14, 99, 14], [86, 1, 86, 27]], 't');
    g.circle(86, 14, 4, 'ko');
    g.circle(118, 36, 11, 'o');
    g.circle(118, 36, 11, 't');
    g.line(118, 36, 124, 30, 'l');
    g.circle(118, 36, 2.5, 'k');
  });

  G('bunk', 'Bunk', S, 'bed', { kind: 'single', style: 'metal' }, { placement: 'wall', height: 'low', roomTypes: ['crew-quarters', 'med-bay', 'detention', 'clinic'], max: 6, weight: 3 });

  G('mess-table', 'Mess table', S, 'table', { w: 3, h: 1, chairs: true, style: 'metal' }, { placement: 'centre', roomTypes: ['mess-hall', 'crew-quarters', 'cantina', 'apartment'], max: 3, weight: 2 }, { w: [2, 4], h: [1, 2] });

  G('lab-bench', 'Lab bench', S, 'counter', { len: 3, kind: 'lab' }, { placement: 'wall', roomTypes: ['lab', 'med-bay', 'cloning-lab', 'clinic'], max: 3, weight: 2 }, { len: [2, 5] });

  G('specimen-tank', 'Specimen tank', S, 'tank', { kind: 'specimen' }, { light: { bright: 0, dim: 2, color: '#7dffb0' }, placement: 'corner', height: 'tall', blocksVision: true, roomTypes: ['lab', 'med-bay', 'cloning-lab'], max: 4 });

  A('vent', 'Floor vent', S, [1, 1], { placement: 'free', layer: 'floor', blocksMovement: false, roomTypes: ['corridor', 'engine-room', 'cargo-bay', 'crew-quarters', 'server-room', 'detention'], max: 2 }, (g) => {
    g.chamfer(10, 10, 80, 80, 10, 's');
    g.rect(18, 18, 64, 64, 'ko', 3);
    for (let i = 0; i < 4; i++) g.rect(20, 22 + i * 15, 60, 8, 'o', 2);
    bolts(g, 10, 10, 80, 80, 5, 2.6);
  });

  A('hazard-stripes', 'Hazard floor', S, [2, 1], { placement: 'door', layer: 'floor', blocksMovement: false, roomTypes: ['airlock', 'cargo-bay', 'engine-room', 'hangar', 'landing-pad', 'workshop'], max: 1 }, (g) => {
    hazard(g, 4, 22, 192, 56, 24);
  });

  G('sofa', 'Lounge seat', S, 'lounge', {}, { placement: 'wall', height: 'low', roomTypes: ['crew-quarters', 'mess-hall', 'apartment', 'cantina', 'clinic', 'corridor', 'landing-pad', 'security'], max: 2 });

  G('hydroponics', 'Hydroponics tray', S, 'plant', { kind: 'tray' }, { placement: 'free', roomTypes: ['lab', 'mess-hall', 'hydroponics-bay'], max: 3 });

  A('charging-pad', 'Drone pad', S, [1, 1], { placement: 'corner', layer: 'floor', blocksMovement: false, roomTypes: ['cargo-bay', 'engine-room', 'lab', 'hangar', 'workshop'], max: 2 }, (g) => {
    g.chamfer(4, 4, 92, 92, 16, 's');
    g.chamfer(12, 12, 76, 76, 12, 'd');
    // A quad drone parked on the pad, rotors blurred.
    g.lines([[30, 30, 70, 70], [70, 30, 30, 70]], 'l');
    for (const [x, y] of [[30, 30], [70, 30], [30, 70], [70, 70]]) {
      g.circle(x, y, 13, 'o');
      g.circle(x, y, 13, 'd');
      g.circle(x, y, 3, 'k');
    }
    g.chamfer(39, 39, 22, 22, 5, 'ko');
    g.circle(50, 50, 4, 'p');
  });

  G('observation-seat', 'Observation bench', S, 'obs-bench', {}, { placement: 'balcony', height: 'low', roomTypes: ['*'], max: 2 });

  // ---- hangar and landing pad ---------------------------------------------------

  A('shuttle', 'Shuttle', S, [4, 6], { placement: 'centre', height: 'tall', blocksVision: true, roomTypes: ['hangar', 'landing-pad'], min: 1, max: 1 }, (g) => {
    // Engines first so the hull overlaps them.
    for (const x of [160, 240]) {
      g.chamfer(x - 24, 500, 48, 70, 10, 'ko');
      g.circle(x, 560, 16, 'm');
      g.circle(x, 560, 8, 'k');
    }
    g.poly([[200, 16], [246, 80], [262, 240], [380, 372], [384, 470], [270, 448], [252, 540], [148, 540], [130, 448], [16, 470], [20, 372], [138, 240], [154, 80]], 's');
    // Wings: flap lines and hazard-striped tips.
    g.lines([[270, 300, 370, 400], [130, 300, 30, 400], [262, 420, 372, 440], [138, 420, 28, 440]], 't');
    hazard(g, 330, 420, 46, 30, 12);
    hazard(g, 24, 420, 46, 30, 12);
    // Spine and cargo bay.
    g.poly([[200, 100], [238, 240], [234, 470], [166, 470], [162, 240]], 'o');
    g.lines([[176, 300, 224, 300], [174, 340, 226, 340], [172, 380, 228, 380], [170, 420, 230, 420]], 't');
    g.line(200, 260, 200, 470, 'l');
    // Cockpit canopy with a glint.
    g.poly([[200, 34], [232, 88], [216, 112], [184, 112], [168, 88]], 'ko');
    g.path('M186 70L200 48', 'pl');
    // Markings and rivets.
    g.rect(90, 380, 40, 14, 'ko', 2);
    g.rect(270, 380, 40, 14, 'ko', 2);
    for (const [x, y] of [[154, 140], [246, 140], [150, 200], [250, 200], [160, 500], [240, 500]]) g.circle(x, y, 4, 'k');
  });

  A('power-loader', 'Power loader', S, [2, 2], { placement: 'free', height: 'tall', roomTypes: ['hangar', 'cargo-bay', 'workshop', 'mine'], max: 2 }, (g) => {
    // Feet and legs at the back.
    for (const x of [62, 138]) {
      g.chamfer(x - 22, 150, 44, 44, 8, 'ko');
      g.rect(x - 9, 124, 18, 34, 's', 4);
    }
    // Arms reaching forward to the claws, with hydraulic rams.
    for (const x of [26, 174]) {
      g.rect(x - 12, 34, 24, 96, 's', 6);
      g.line(x, 44, x, 118, 'l');
      g.poly([[x - 18, 6], [x - 4, 6], [x - 4, 38], [x - 14, 38]], 'ko');
      g.poly([[x + 18, 6], [x + 4, 6], [x + 4, 38], [x + 14, 38]], 'ko');
    }
    // Cab: roll cage over the operator seat.
    g.chamfer(46, 56, 108, 96, 18, 's');
    hazard(g, 52, 60, 96, 12, 12);
    g.rect(68, 80, 64, 58, 'o', 10);
    g.lines([[68, 96, 132, 96], [100, 80, 100, 138]], 'l');
    seat(g, 100, 116, 'n', 34);
    g.rect(40, 74, 12, 64, 'ko', 4);
    g.rect(148, 74, 12, 64, 'ko', 4);
  });

  G('tool-cart', 'Tool cart', S, 'tool-cart', {}, { placement: 'free', roomTypes: ['hangar', 'workshop', 'engine-room'], max: 2 });

  A('fuel-pump', 'Fuel pump', S, [1, 1], { placement: 'wall', height: 'tall', roomTypes: ['hangar', 'landing-pad'], max: 2 }, (g) => {
    g.path('M26 54Q20 90 50 88Q80 86 78 66', 'l'); // hose loop
    g.chamfer(8, 4, 84, 52, 8, 's');
    g.rect(16, 12, 44, 24, 'ko', 3); // readout
    g.path('M22 24L32 24M37 24L54 24', 'pl');
    g.rect(16, 42, 44, 8, 'o', 2);
    bolts(g, 8, 4, 84, 52, 6, 2.2);
    g.rect(66, 10, 18, 26, 'm', 3); // nozzle in its holster
    g.poly([[70, 30], [80, 30], [82, 48], [79, 66], [71, 66], [69, 48]], 'ko');
    g.rect(72, 66, 6, 8, 'k', 1);
  });

  A('landing-lights', 'Landing lights', S, [1, 1], { light: { bright: 1, dim: 3, color: '#ff4040', animation: 'pulse' }, placement: 'free', layer: 'floor', blocksMovement: false, roomTypes: ['hangar', 'landing-pad'], max: 4 }, (g) => {
    for (const [x, y] of [[25, 25], [75, 25], [25, 75], [75, 75]]) {
      g.circle(x, y, 18, 'd');
      g.circle(x, y, 11, 'ko');
      g.circle(x, y, 5, 'p');
    }
    g.lines([[36, 25, 64, 25], [36, 75, 64, 75]], 't');
  });

  A('pad-marking', 'Landing pad marking', S, [4, 4], { placement: 'centre', layer: 'floor', blocksMovement: false, roomTypes: ['landing-pad', 'hangar'], max: 1 }, (g) => {
    g.circle(200, 200, 184, 'd');
    g.circle(200, 200, 160, 'l');
    // Ticks round the ring and chevrons at the corners pointing in.
    const ticks = [];
    for (let i = 0; i < 36; i++) {
      const a = (i * Math.PI) / 18;
      ticks.push([200 + Math.cos(a) * 160, 200 + Math.sin(a) * 160, 200 + Math.cos(a) * (i % 3 ? 150 : 140), 200 + Math.sin(a) * (i % 3 ? 150 : 140)]);
    }
    g.lines(ticks, 'l');
    for (const [x, y, r] of [[30, 30, 45], [370, 30, 135], [370, 370, 225], [30, 370, 315]]) {
      g.add(`<g transform="rotate(${r} ${x} ${y})">`);
      g.poly([[x - 6, y - 18], [x + 14, y], [x - 6, y + 18], [x, y]], 'ko');
      g.add('</g>');
    }
    g.rect(130, 110, 30, 180, 'ko');
    g.rect(240, 110, 30, 180, 'ko');
    g.rect(160, 185, 80, 30, 'ko');
  });

  // ---- command, security, detention -------------------------------------------

  A('map-table', 'Tactical map table', S, [2, 3], { placement: 'centre', roomTypes: ['command-centre', 'security'], max: 1 }, (g) => {
    g.chamfer(6, 6, 188, 288, 30, 's');
    for (const y of [40, 130, 220]) {
      g.rect(10, y, 8, 40, 'ko', 2); // control strips on the rim
      g.rect(182, y, 8, 40, 'ko', 2);
    }
    g.chamfer(24, 24, 152, 252, 18, 'ko');
    const grid = [];
    for (let x = 62; x < 176; x += 38) grid.push([x, 28, x, 272]);
    for (let y = 66; y < 276; y += 42) grid.push([28, y, 172, y]);
    g.lines(grid, 'pl');
    // Terrain contours, a route and unit markers.
    g.path('M40 120Q70 90 110 104T168 96M44 160Q84 130 120 150T166 140', 'pl');
    g.path('M60 240L92 182L124 196L146 92', 'l');
    g.add('<path class="pl" d="M60 240L92 182L124 196L146 92" style="stroke-dasharray:5 5"/>');
    g.poly([[146, 80], [156, 98], [136, 98]], 'p');
    g.rect(84, 174, 16, 16, 'o', 2);
    g.circle(60, 240, 7, 'p');
  });

  G('security-desk', 'Security desk', S, 'security-desk', {}, { placement: 'wall', roomTypes: ['security', 'detention', 'clinic', 'hangar'], max: 1 });

  A('scanner-arch', 'Scanner arch', S, [2, 1], { placement: 'door', roomTypes: ['security', 'detention', 'landing-pad'], max: 1 }, (g) => {
    g.rect(26, 30, 148, 40, 'h', 2); // floor plate
    slats(g, 30, 32, 140, 36, 10, 'v', 't');
    g.lines([[28, 40, 172, 40], [28, 50, 172, 50], [28, 60, 172, 60]], 'd');
    for (const x of [4, 172]) {
      g.chamfer(x, 26, 24, 48, 6, 'ko');
      g.circle(x + 12, 40, 3, 'p');
      g.circle(x + 12, 50, 3, 'p');
      g.circle(x + 12, 60, 3, 'p');
    }
  });

  A('holding-bench', 'Holding bench', S, [2, 1], { placement: 'wall', height: 'low', roomTypes: ['security', 'detention', 'clinic', 'corridor'], max: 2 }, (g) => {
    g.rect(6, 4, 188, 10, 'ko', 3);
    g.chamfer(6, 14, 188, 40, 8, 's');
    slats(g, 12, 16, 176, 36, 9, 'h', 't');
    // Pairs of cuffs on short chains.
    for (const x of [40, 100, 160]) {
      g.circle(x - 7, 40, 6, 'l');
      g.circle(x + 7, 40, 6, 'l');
      g.line(x, 14, x, 34, 't');
    }
  });

  A('cell-toilet', 'Cell toilet', S, [1, 1], { placement: 'corner', roomTypes: ['detention', 'crew-quarters', 'apartment'], max: 1 }, (g) => {
    g.chamfer(18, 4, 64, 24, 6, 's'); // cistern unit
    g.circle(50, 16, 5, 'ko');
    g.path('M26 28H74V58Q74 90 50 90Q26 90 26 58Z', 'o'); // seat
    g.path('M34 34H66V58Q66 80 50 80Q34 80 34 58Z', 'm'); // bowl
    g.path('M40 62Q50 56 60 62', 'pl');
  });

  A('force-field', 'Force field emitter', S, [1, 1], { placement: 'door', layer: 'overhead', blocksMovement: false, roomTypes: ['detention', 'security', 'armoury'], max: 2 }, (g) => {
    g.rect(8, 16, 84, 26, 'h', 2); // the field across the doorway
    const hex = [];
    for (let i = 0; i < 6; i++) {
      const x = 14 + i * 14;
      hex.push(`M${x} 22l7-4l7 4v8l-7 4l-7-4Z`);
    }
    g.path(hex.join(''), 't');
    g.chamfer(4, 0, 18, 46, 4, 'ko');
    g.chamfer(78, 0, 18, 46, 4, 'ko');
    g.circle(13, 29, 3.5, 'p');
    g.circle(87, 29, 3.5, 'p');
  });

  // ---- hydroponics --------------------------------------------------------

  G('grow-tower', 'Grow tower', S, 'plant', { kind: 'tower' }, { placement: 'free', height: 'tall', roomTypes: ['hydroponics-bay', 'apartment', 'market', 'cantina', 'clinic', 'command-centre'], max: 6, weight: 2 });

  G('plant-bed', 'Plant bed', S, 'plant', { kind: 'bed' }, { placement: 'free', roomTypes: ['hydroponics-bay'], max: 4, weight: 2 });

  A('water-tank', 'Water tank', S, [1, 1], { placement: 'corner', height: 'tall', blocksVision: true, roomTypes: ['hydroponics-bay', 'engine-room', 'mine', 'apartment'], max: 3 }, (g) => {
    g.rect(40, 2, 20, 14, 'ko', 3); // outlet to the wall
    g.circle(50, 52, 44, 's');
    g.circle(50, 52, 36, 'o'); // domed lid with weld seams
    g.lines([[14, 52, 86, 52], [50, 16, 50, 88]], 't');
    g.circle(50, 52, 24, 't');
    g.circle(66, 68, 11, 'ko'); // inspection hatch
    g.line(60, 68, 72, 68, 'pl');
    g.path('M26 40A28 28 0 0 1 38 28', 'pl');
  });

  // ---- server room --------------------------------------------------------

  G('server-rack', 'Server rack', S, 'server-rack', {}, { placement: 'wall', height: 'tall', blocksVision: true, roomTypes: ['server-room', 'command-centre', 'security', 'lab'], max: 8, weight: 3 });

  A('data-core', 'Data core', S, [2, 2], { light: { bright: 1, dim: 3, color: '#59d8ff', animation: 'pulse' }, placement: 'centre', height: 'tall', blocksVision: true, roomTypes: ['server-room', 'alien-ruins', 'command-centre'], min: 1, max: 1 }, (g) => {
    g.star(100, 100, 94, 6, 94, 's', Math.PI / 6);
    // Conduits from the core to each corner of the base.
    for (let i = 0; i < 6; i++) {
      const a = Math.PI / 6 + (i * Math.PI) / 3;
      g.add(`<g transform="rotate(${((a * 180) / Math.PI).toFixed(1)} 100 100)">`);
      g.rect(140, 92, 42, 16, 'ko', 3);
      g.circle(156, 100, 3, 'p');
      g.circle(168, 100, 3, 'p');
      g.add('</g>');
    }
    g.star(100, 100, 66, 6, 66, 'ko', Math.PI / 6);
    g.circle(100, 100, 50, 'pl');
    g.circle(100, 100, 40, 'o');
    g.circle(100, 100, 30, 'h');
    g.circle(100, 100, 30, 'd');
    g.circle(100, 100, 14, 'p');
    g.circle(100, 100, 14, 't');
  });

  A('cable-run', 'Cable run', S, [1, 2], { placement: 'free', layer: 'floor', blocksMovement: false, roomTypes: ['server-room', 'engine-room', 'workshop', 'mine'], max: 3 }, (g) => {
    hose(g, 'M30 0C30 60 70 80 60 200');
    hose(g, 'M46 0C46 50 82 90 76 200');
    g.path('M60 0C60 60 42 120 40 200', 'l');
    for (const y of [40, 150]) {
      g.add(`<g transform="rotate(${y === 40 ? 12 : -8} 50 ${y})">`);
      g.rect(24, y - 5, 52, 10, 'ko', 3); // cable tie
      g.add('</g>');
    }
    g.chamfer(30, 88, 50, 26, 5, 's'); // junction box
    g.circle(42, 101, 3, 'k');
    g.circle(68, 101, 3, 'k');
  });

  // ---- workshop -----------------------------------------------------------

  A('fabricator', 'Fabricator', S, [2, 2], { placement: 'wall', height: 'tall', blocksVision: true, roomTypes: ['workshop', 'hangar', 'lab', 'cloning-lab'], min: 1, max: 1 }, (g) => {
    g.chamfer(6, 4, 188, 52, 10, 's'); // machine bank against the wall
    slats(g, 16, 12, 54, 36, 7, 'h', 't');
    screen(g, 80, 12, 60, 34, 'bars');
    g.circle(158, 30, 12, 'o');
    g.circle(158, 30, 4, 'k');
    g.chamfer(14, 56, 172, 128, 10, 'o');
    g.rect(28, 72, 144, 98, 's', 4); // print bed
    const grid = [];
    for (let i = 1; i < 4; i++) grid.push([28 + i * 36, 72, 28 + i * 36, 170]);
    for (let j = 1; j < 3; j++) grid.push([28, 72 + j * 32.7, 172, 72 + j * 32.7]);
    g.lines(grid, 't');
    const gear = [];
    for (let i = 0; i < 16; i++) {
      const a = (i * Math.PI * 2) / 16;
      const r = i % 2 ? 16 : 22;
      gear.push([100 + Math.cos(a) * r, 124 + Math.sin(a) * r]);
    }
    g.poly(gear, 'o'); // half-printed part
    g.circle(100, 124, 7, 'm');
    g.rect(18, 96, 164, 10, 'ko', 3); // gantry and print head
    g.rect(120, 88, 20, 26, 'm', 3);
    g.circle(130, 101, 3, 'k');
    hazard(g, 14, 178, 172, 10, 12);
  });

  A('robot-arm', 'Robot arm', S, [1, 1], { placement: 'free', height: 'tall', roomTypes: ['workshop', 'cargo-bay', 'cloning-lab', 'hangar'], max: 2 }, (g) => {
    g.chamfer(8, 52, 44, 44, 8, 's'); // bolted base
    bolts(g, 8, 52, 44, 44, 6, 2.4);
    rrect(g, 46, 54, 52, 16, -40, 'm', 6); // upper arm
    rrect(g, 68, 26, 34, 12, 20, 's', 5); // forearm
    g.circle(30, 74, 13, 'ko'); // shoulder
    g.circle(30, 74, 5, 'p');
    g.circle(62, 38, 8, 'ko'); // elbow
    g.circle(62, 38, 3, 'p');
    g.poly([[80, 18], [94, 10], [96, 16], [86, 24]], 'ko'); // gripper
    g.poly([[82, 34], [96, 40], [92, 46], [80, 40]], 'ko');
    g.line(30, 74, 62, 38, 't');
  });

  G('welding-station', 'Welding station', S, 'welder', {}, { light: { bright: 1, dim: 2, color: '#9fdcff', animation: 'torch' }, placement: 'wall', roomTypes: ['workshop', 'hangar'], max: 1 });

  // ---- cantina and market -------------------------------------------------

  G('cantina-bar', 'Cantina bar', S, 'counter', { len: 4, kind: 'cantina' }, { placement: 'wall', roomTypes: ['cantina'], min: 1, max: 1 }, { len: [2, 6] });

  A('bar-stool', 'Bar stool', S, [1, 1], { placement: 'free', height: 'low', blocksMovement: false, roomTypes: ['cantina', 'mess-hall'], max: 6 }, (g) => {
    g.circle(50, 50, 30, 'm'); // foot ring
    g.circle(50, 50, 30, 't');
    g.circle(50, 50, 21, 'o'); // padded seat
    g.circle(50, 50, 12, 't');
    g.circle(50, 50, 3, 'k');
  });

  G('cantina-table', 'Round table', S, 'table', { w: 1, h: 1, chairs: true, round: true, style: 'metal' }, { placement: 'centre', roomTypes: ['cantina', 'market', 'mess-hall'], max: 4, weight: 2 }, { w: [1, 2], h: [1, 2] });

  G('booth', 'Booth', S, 'booth', {}, { placement: 'wall', height: 'low', roomTypes: ['cantina', 'mess-hall'], max: 3 });

  A('holo-stage', 'Holo stage', S, [2, 2], { light: { bright: 1, dim: 3, color: '#c070ff', animation: 'pulse' }, placement: 'centre', layer: 'floor', blocksMovement: false, roomTypes: ['cantina', 'market', 'command-centre'], max: 1 }, (g) => {
    g.circle(100, 100, 92, 's');
    g.circle(100, 100, 78, 'ko');
    for (let i = 0; i < 16; i++) {
      const a = (i * Math.PI) / 8;
      g.circle(100 + Math.cos(a) * 85, 100 + Math.sin(a) * 85, 2.6, 'p'); // rim lights
    }
    g.circle(100, 100, 62, 'd');
    g.circle(100, 100, 44, 'pl');
    figure(g, 100, 100, 0.9, 'hm');
    g.add('<path class="pl" d="M73 106Q100 84 127 106" style="stroke-dasharray:4 4"/>');
  });

  A('jukebox', 'Jukebox', S, [1, 1], { light: { bright: 0, dim: 2, color: '#ff70c0' }, placement: 'wall', height: 'tall', roomTypes: ['cantina', 'apartment'], max: 1 }, (g) => {
    g.path('M8 72V30Q8 2 50 2Q92 2 92 30V72Z', 's');
    g.path('M20 62V32Q20 14 50 14Q80 14 80 32V62Z', 'ko');
    g.circle(50, 38, 15, 'o'); // the record
    g.circle(50, 38, 10, 't');
    g.circle(50, 38, 3, 'k');
    g.lines([[26, 30, 26, 58], [74, 30, 74, 58]], 'pl');
    buttons(g, 22, 68, 56, 6, 2.4);
  });

  G('market-stall', 'Market stall', S, 'stall', {}, { placement: 'free', roomTypes: ['market'], min: 1, max: 4, weight: 3 });

  G('vending-machine', 'Vending machine', S, 'vending', {}, { placement: 'wall', height: 'tall', blocksVision: true, roomTypes: ['market', 'corridor', 'cantina', 'mess-hall', 'hangar'], max: 2 });

  A('goods-bin', 'Goods bin', S, [1, 1], { placement: 'free', roomTypes: ['market', 'cargo-bay', 'hydroponics-bay', 'workshop', 'hangar', 'mine'], max: 4, weight: 2 }, (g) => {
    g.chamfer(8, 8, 84, 84, 14, 'ko');
    g.chamfer(16, 16, 68, 68, 10, 'm');
    // Spare parts heaped in the bin: a big gear, a canister, a pipe elbow.
    const gear = [];
    for (let i = 0; i < 16; i++) {
      const a = (i * Math.PI * 2) / 16;
      const r = i % 2 ? 15 : 20;
      gear.push([40 + Math.cos(a) * r, 42 + Math.sin(a) * r]);
    }
    g.poly(gear, 'o');
    g.circle(40, 42, 6, 'k');
    rrect(g, 66, 44, 18, 34, 15, 's', 8);
    g.circle(66, 30, 4, 'k');
    g.path('M24 78Q24 62 40 62', 'l');
    g.circle(60, 74, 7, 'o');
    g.circle(60, 74, 2.5, 'k');
  });

  A('holo-sign', 'Holo sign', S, [1, 1], { light: { bright: 0, dim: 2, color: '#59d8ff' }, placement: 'wall', layer: 'overhead', blocksMovement: false, roomTypes: ['market', 'cantina', 'corridor'], max: 2 }, (g) => {
    g.chamfer(6, 0, 88, 34, 10, 'ko');
    g.path('M18 26L28 8L38 26M44 8V26M52 8H66M59 8V26M74 8V26H86', 'pl');
    g.add('<path class="pl" d="M12 40H88" style="stroke-dasharray:4 4"/>');
  });

  // ---- apartment and clinic -----------------------------------------------

  G('sleep-pod', 'Double bed', S, 'bed', { kind: 'pod', style: 'metal' }, { placement: 'wall', height: 'low', roomTypes: ['apartment', 'crew-quarters'], max: 1 });

  A('holo-tv', 'Holo screen', S, [2, 1], { placement: 'wall', roomTypes: ['apartment', 'crew-quarters', 'cantina', 'clinic'], max: 1 }, (g) => {
    g.rect(10, 2, 180, 10, 'ko', 3);
    screen(g, 20, 14, 160, 40, 'graph');
    g.path('M40 54L100 94L160 54', 'd'); // projection
    g.chamfer(80, 80, 40, 16, 4, 'ko');
    g.circle(100, 88, 3, 'p');
  });

  G('kitchenette', 'Kitchenette', S, 'kitchenette', {}, { placement: 'wall', roomTypes: ['apartment', 'mess-hall', 'crew-quarters', 'cantina'], min: 1, max: 1 });

  // ---- mine ---------------------------------------------------------------

  A('ore-cart', 'Ore cart', S, [1, 2], { placement: 'free', roomTypes: ['mine'], max: 3, weight: 2 }, (g) => {
    for (let y = 10; y < 200; y += 24) g.rect(12, y, 76, 9, 's', 2); // sleepers
    g.lines([[24, 0, 24, 200], [76, 0, 76, 200]], 'l');
    for (const [x, y] of [[16, 56], [84, 56], [16, 144], [84, 144]]) g.rect(x - 6, y - 10, 12, 20, 'ko', 3); // wheels
    g.chamfer(18, 34, 64, 132, 10, 'ko');
    g.chamfer(24, 40, 52, 120, 8, 'm');
    for (let i = 0; i < 7; i++) g.poly(stoneShape(36 + (i % 2) * 26, 56 + Math.floor(i / 2) * 30 + (i % 2) * 10, 14, i + 4, 6), i % 3 ? 's' : 'o');
    g.circle(50, 26, 6, 'ko'); // coupling
  });

  A('mine-rails', 'Rails', S, [1, 2], { placement: 'free', layer: 'floor', blocksMovement: false, roomTypes: ['mine'], max: 4 }, (g) => {
    for (let y = 6; y < 200; y += 22) {
      g.rect(10, y, 80, 10, 's', 2);
      g.line(16, y + 5, 84, y + 5, 't');
      for (const x of [20, 32, 68, 80]) g.circle(x, y + 5, 1.8, 'k');
    }
    g.lines([[26, 0, 26, 200], [74, 0, 74, 200]], 'l');
  });

  A('drill-rig', 'Drill rig', S, [2, 2], { placement: 'free', height: 'tall', blocksVision: true, roomTypes: ['mine'], min: 1, max: 1 }, (g) => {
    g.circle(100, 36, 24, 'k'); // the borehole
    const rim = [];
    for (let i = 0; i < 9; i++) {
      const a = (i * Math.PI * 2) / 9;
      rim.push([100 + Math.cos(a) * 24, 36 + Math.sin(a) * 24, 100 + Math.cos(a) * 30, 36 + Math.sin(a) * 30]);
    }
    g.lines(rim, 't');
    for (const x of [12, 152]) {
      // Tracks with tread.
      g.rect(x, 64, 36, 128, 'ko', 8);
      g.rect(x + 5, 68, 26, 120, 'm', 4);
      slats(g, x + 5, 70, 26, 116, 9, 'h', 'l');
    }
    g.chamfer(46, 76, 108, 108, 14, 's');
    hazard(g, 52, 80, 96, 12, 12);
    g.rect(62, 100, 76, 44, 'o', 6); // engine grille
    slats(g, 68, 106, 64, 32, 6, 'h', 't');
    g.chamfer(70, 152, 60, 26, 6, 'ko'); // cab
    g.rect(78, 158, 30, 12, 'p', 2);
    bolts(g, 46, 76, 108, 108, 8, 2.6);
    // Boom reaching over the hole, with the drill head.
    g.rect(88, 30, 24, 74, 's', 3);
    g.path('M88 40L112 56M112 40L88 56M88 56L112 72M112 56L88 72M88 72L112 88M112 72L88 88', 't');
    g.circle(100, 36, 15, 'm');
    g.path('M100 21A15 15 0 0 1 115 36M100 51A15 15 0 0 1 85 36', 'l');
    g.circle(100, 36, 5, 'k');
  });

  A('ore-pile', 'Ore pile', S, [1, 1], { placement: 'corner', blocksMovement: false, roomTypes: ['mine', 'cargo-bay', 'workshop'], max: 4, tags: ['difficult terrain'] }, (g) => {
    const stones = [[30, 32, 16], [62, 28, 14], [46, 54, 19], [76, 60, 13], [26, 70, 13], [56, 80, 11], [80, 34, 9]];
    stones.forEach(([x, y, r], i) => g.poly(stoneShape(x, y, r, i * 3 + 1, 7), ['s', 'o', 'm'][i % 3]));
    // Glinting ore crystals.
    for (const [x, y] of [[44, 50], [66, 26], [28, 68]]) g.poly([[x, y - 6], [x + 4, y], [x, y + 6], [x - 4, y]], 'ko');
    g.lines([[40, 60, 52, 48], [24, 28, 34, 36]], 't');
  });

  A('support-strut', 'Support strut', S, [1, 1], { placement: 'corner', height: 'tall', blocksVision: true, roomTypes: ['mine', 'hangar', 'cargo-bay'], max: 6 }, (g) => {
    g.rect(12, 12, 76, 76, 's', 4); // base plate
    bolts(g, 12, 12, 76, 76, 9, 3.5);
    // Steel I-beam seen end-on.
    g.path('M26 26H74V38H56V62H74V74H26V62H44V38H26Z', 'ko');
    g.line(30, 32, 70, 32, 'pl');
  });

  A('work-lamp', 'Work lamp', S, [1, 1], { light: { bright: 3, dim: 6, color: '#fff2c4' }, placement: 'corner', height: 'tall', blocksMovement: false, roomTypes: ['mine', 'hangar', 'workshop', 'alien-ruins'], max: 4 }, (g) => {
    g.add('<path class="pl" d="M58 58L96 70M58 58L70 96" style="stroke-dasharray:4 5"/>'); // beam
    g.lines([[50, 50, 18, 82], [50, 50, 86, 86], [50, 50, 50, 10]], 'l'); // tripod legs
    for (const [x, y] of [[18, 82], [86, 86], [50, 10]]) g.circle(x, y, 5, 'ko');
    g.circle(52, 52, 18, 'ko'); // lamp head
    g.circle(56, 56, 10, 'p');
    g.circle(56, 56, 10, 't');
  });

  // ---- alien ruins --------------------------------------------------------

  A('obelisk', 'Alien obelisk', S, [1, 1], { placement: 'free', height: 'tall', blocksVision: true, roomTypes: ['alien-ruins'], min: 1, max: 3 }, (g) => {
    // A four-sided spire from above: each face lit differently, so it reads as a point.
    g.poly([[50, 6], [94, 50], [50, 94], [6, 50]], 'ko');
    g.poly([[50, 14], [86, 50], [50, 50]], 'o');
    g.poly([[86, 50], [50, 86], [50, 50]], 's');
    g.poly([[50, 86], [14, 50], [50, 50]], 'm');
    g.poly([[14, 50], [50, 14], [50, 50]], 'h');
    g.path('M60 30L66 36M64 44L72 44M58 58L66 64M38 62L32 68', 't'); // glyphs
    g.circle(50, 50, 4, 'p');
  });

  A('glyph-tile', 'Glyph floor', S, [2, 2], { placement: 'centre', layer: 'floor', blocksMovement: false, roomTypes: ['alien-ruins'], max: 2 }, (g) => {
    g.star(100, 100, 92, 6, 92, 's', 0);
    g.star(100, 100, 74, 6, 74, 'o', 0);
    // A ring of glyphs between the borders.
    const glyphs = [];
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI) / 6 + Math.PI / 12;
      const x = 100 + Math.cos(a) * 56;
      const y = 100 + Math.sin(a) * 56;
      glyphs.push(i % 3 === 0 ? `M${x - 5} ${y - 5}L${x + 5} ${y + 5}M${x + 5} ${y - 5}L${x - 5} ${y + 5}` : i % 3 === 1 ? `M${x} ${y - 6}V${y + 6}M${x - 5} ${y}H${x + 5}` : `M${x - 5} ${y + 4}L${x} ${y - 5}L${x + 5} ${y + 4}`);
    }
    g.path(glyphs.join(''), 't');
    g.circle(100, 100, 40, 'd');
    g.path('M100 66V134M71 83L129 117M129 83L71 117', 't');
    g.circle(100, 100, 22, 'ko');
    g.circle(100, 100, 9, 'p');
  });

  A('broken-column', 'Broken column', S, [1, 1], { placement: 'free', height: 'tall', blocksVision: true, roomTypes: ['alien-ruins'], max: 6, weight: 2 }, (g) => {
    g.poly(stoneShape(84, 82, 10, 5, 6), 's'); // fallen chunk
    g.star(48, 46, 40, 10, 34, 's', 0); // fluted shaft
    g.poly([[48, 16], [64, 22], [72, 34], [60, 42], [74, 54], [62, 70], [44, 74], [30, 66], [24, 50], [34, 40], [26, 28]], 'o'); // broken top
    g.path('M36 34L48 46L44 62M58 28L56 44L66 52', 'l');
    g.circle(48, 46, 4, 'k');
  });

  A('crystal-cluster', 'Crystal cluster', S, [1, 1], { light: { bright: 0, dim: 3, color: '#8fd9ff', animation: 'pulse' }, placement: 'free', roomTypes: ['alien-ruins', 'mine', 'wasteland', 'jungle'], max: 5, weight: 2 }, (g) => {
    g.poly(stoneShape(50, 56, 22, 4, 8), 'm'); // rock it grows from
    // Long six-sided prisms leaning out: one lit face, one shaded face, a ridge.
    for (const [ang, len, w] of [[-75, 46, 22], [-10, 40, 20], [160, 40, 20], [-135, 38, 18], [80, 30, 16]]) {
      const a = (ang * Math.PI) / 180;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      const p = (t, s) => [50 + ca * len * t - sa * w * s, 56 + sa * len * t + ca * w * s];
      g.poly([p(0.1, -0.5), p(0.85, -0.5), p(1, 0), p(0.85, 0.5), p(0.1, 0.5)], 'o');
      g.poly([p(0.1, 0), p(0.85, 0), p(1, 0), p(0.85, 0.5), p(0.1, 0.5)], 's');
      g.line(...p(0.1, 0), ...p(1, 0), 't');
    }
    g.circle(50, 56, 5, 'k');
  });

  A('artefact-pedestal', 'Artefact pedestal', S, [1, 1], { light: { bright: 0, dim: 2, color: '#c9a0ff', animation: 'pulse' }, placement: 'centre', roomTypes: ['alien-ruins', 'lab', 'market'], max: 1 }, (g) => {
    g.star(50, 50, 46, 8, 46, 's', Math.PI / 8); // stepped plinth
    g.star(50, 50, 34, 8, 34, 'o', Math.PI / 8);
    g.star(50, 50, 24, 8, 24, 'ko', Math.PI / 8);
    // The floating orb with its orbiting rings.
    g.circle(50, 50, 13, 'o');
    g.path('M43 46A8 8 0 0 1 50 41', 'l');
    g.add('<ellipse class="pl" cx="50" cy="50" rx="20" ry="7" transform="rotate(-30 50 50)"/>');
    g.add('<ellipse class="pl" cx="50" cy="50" rx="20" ry="7" transform="rotate(40 50 50)" style="stroke-dasharray:3 4"/>');
  });

  // ---- cloning lab --------------------------------------------------------

  G('cloning-vat', 'Cloning vat', S, 'tank', { kind: 'vat' }, { light: { bright: 0, dim: 2, color: '#7dffb0' }, placement: 'free', height: 'tall', blocksVision: true, roomTypes: ['cloning-lab', 'lab', 'alien-ruins'], max: 6, weight: 3 });
}

// Hazard-striped ring (reactor shielding).
function hazardRing(g, cx, cy, r1, r2) {
  g.circle(cx, cy, r1, 'o');
  const segs = 24;
  for (let i = 0; i < segs; i += 2) {
    const a0 = (i / segs) * Math.PI * 2;
    const a1 = ((i + 1) / segs) * Math.PI * 2;
    g.poly([
      [cx + Math.cos(a0) * r1, cy + Math.sin(a0) * r1],
      [cx + Math.cos(a1) * r1, cy + Math.sin(a1) * r1],
      [cx + Math.cos(a1) * r2, cy + Math.sin(a1) * r2],
      [cx + Math.cos(a0) * r2, cy + Math.sin(a0) * r2],
    ], 'k');
  }
  g.circle(cx, cy, r1, 'l');
}
