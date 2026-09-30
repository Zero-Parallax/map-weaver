// Sci-fi assets: ships, stations, colonies, cities, mines and alien ruins.
// House style: bevelled corners, dark screens with glowing readouts, hazard stripes.
// Backs face the top edge (wallSide n).

import { seat, stool, screen, buttons, hazard, leaves, figure, stoneShape } from '../motifs.js';

const S = ['scifi'];

function vent(g, x, y, w, h) {
  g.chamfer(x, y, w, h, 6, 'o');
  const s = [];
  for (let yy = y + 8; yy < y + h - 4; yy += 8) s.push([x + 8, yy, x + w - 8, yy]);
  g.lines(s, 'l');
}

function lights(g, x, y, cols, rows, gap = 10) {
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) g.circle(x + i * gap, y + j * gap, 2.6, (i + j * 3) % 4 ? 'p' : 'h');
}

export default function define({ A, G }) {
  // ---- ship basics ---------------------------------------------------------

  G('console', 'Console', S, 'console', { len: 2 }, { placement: 'wall', roomTypes: ['bridge', 'engine-room', 'lab', 'med-bay', 'airlock', 'command-centre', 'security', 'server-room', 'cloning-lab', 'corridor', 'crew-quarters', 'cargo-bay', 'armoury', 'detention', 'hangar', 'market', 'landing-pad'], max: 4, weight: 3 }, { len: [1, 4] });

  A('captain-chair', "Captain's chair", S, [1, 1], { placement: 'centre', roomTypes: ['bridge', 'command-centre'], min: 1, max: 1 }, (g) => {
    g.chamfer(4, 4, 92, 92, 20, 's');
    g.rect(22, 16, 56, 66, 'o', 14);
    g.rect(22, 16, 56, 16, 'ko', 8);
    g.rect(10, 34, 14, 44, 'ko', 5);
    g.rect(76, 34, 14, 44, 'ko', 5);
    g.circle(17, 46, 3, 'p');
    g.circle(83, 46, 3, 'p');
  });

  A('pilot-seat', 'Pilot seat', S, [1, 1], { placement: 'free', blocksMovement: false, roomTypes: ['bridge', 'command-centre', 'detention', 'security', 'cloning-lab'], max: 4 }, (g) => {
    screen(g, 14, 4, 72, 22, 'bars');
    seat(g, 50, 62, 's', 62);
  });

  A('holo-table', 'Holo table', S, [2, 2], { placement: 'centre', roomTypes: ['bridge', 'lab', 'armoury', 'command-centre'], max: 1 }, (g) => {
    g.chamfer(8, 8, 184, 184, 40, 's');
    g.circle(100, 100, 70, 'ko');
    g.circle(100, 100, 56, 'pl');
    g.circle(100, 100, 36, 'pl');
    g.lines([[100, 36, 100, 164], [36, 100, 164, 100]], 'pl');
    g.star(100, 100, 14, 4, 5, 'p');
  });

  A('med-bed', 'Med bed', S, [1, 2], { placement: 'wall', roomTypes: ['med-bay', 'clinic', 'cloning-lab'], max: 6, weight: 3 }, (g) => {
    g.chamfer(8, 4, 84, 192, 16, 's');
    g.chamfer(18, 30, 64, 156, 14, 'o');
    screen(g, 24, 6, 52, 20, 'graph');
    figure(g, 50, 70, 0.75, 'h');
    g.line(30, 120, 70, 120, 't');
  });

  A('med-scanner', 'Med scanner', S, [1, 2], { placement: 'centre', roomTypes: ['med-bay', 'lab', 'clinic', 'cloning-lab'], max: 1 }, (g) => {
    g.chamfer(20, 8, 60, 184, 14, 'o');
    g.rect(4, 80, 92, 26, 'ko', 8); // the scanning arch
    g.lines([[14, 93, 86, 93]], 'pl');
    g.line(30, 40, 70, 40, 't');
    g.line(30, 150, 70, 150, 't');
  });

  A('med-cabinet', 'Medical cabinet', S, [1, 1], { placement: 'wall', roomTypes: ['med-bay', 'clinic'], max: 3 }, (g) => {
    g.chamfer(6, 4, 88, 54, 12, 'o');
    g.rect(42, 12, 16, 38, 'ko');
    g.rect(31, 23, 38, 16, 'ko');
  });

  A('locker', 'Storage locker', S, [2, 1], { placement: 'wall', roomTypes: ['crew-quarters', 'cargo-bay', 'airlock', 'armoury', 'engine-room', 'hangar', 'workshop', 'apartment', 'hydroponics-bay', 'lab'], max: 4, weight: 2 }, (g) => {
    g.chamfer(4, 4, 192, 56, 10, 's');
    for (let i = 0; i < 4; i++) {
      g.rect(12 + i * 46, 10, 38, 44, 'o', 4);
      vent(g, 18 + i * 46, 14, 26, 16);
      g.rect(38 + i * 46, 38, 6, 10, 'ko', 2);
    }
  });

  A('weapon-locker', 'Weapon locker', S, [2, 1], { placement: 'wall', roomTypes: ['armoury', 'bridge', 'security'], min: 1, max: 3 }, (g) => {
    g.chamfer(4, 4, 192, 62, 12, 's');
    for (const x of [24, 64, 104, 144]) {
      g.poly([[x, 12], [x + 10, 12], [x + 10, 30], [x + 18, 34], [x + 18, 44], [x + 10, 44], [x + 10, 58], [x, 58]], 'ko');
    }
    g.rect(172, 16, 16, 38, 'o', 4);
  });

  A('armour-rack', 'Armour rack', S, [2, 1], { placement: 'wall', roomTypes: ['armoury', 'airlock', 'security', 'hangar'], max: 2 }, (g) => {
    g.rect(4, 4, 192, 10, 'ko', 3);
    for (const x of [52, 148]) {
      figure(g, x, 46, 1.1, 's');
      g.rect(x - 11, 38, 22, 10, 'ko', 4); // visor
    }
  });

  G('cargo-crate', 'Cargo crate', S, 'cargo', { w: 1, h: 1, style: 'container' }, { placement: 'corner', roomTypes: ['cargo-bay', 'engine-room', 'airlock', 'corridor', 'hangar', 'market', 'landing-pad', 'workshop'], max: 8, weight: 3 }, { w: [1, 2], h: [1, 2] });
  G('container', 'Cargo container', S, 'cargo', { w: 2, h: 4, style: 'container' }, { placement: 'free', blocksVision: true, roomTypes: ['cargo-bay', 'hangar', 'landing-pad'], max: 3 }, { w: [2, 3], h: [3, 5] });

  A('fuel-drum', 'Fuel drum', S, [1, 1], { placement: 'corner', roomTypes: ['engine-room', 'cargo-bay', 'hangar', 'landing-pad', 'mine'], max: 4 }, (g) => {
    g.circle(50, 50, 38, 's');
    g.circle(50, 50, 30, 'o');
    g.poly([[50, 28], [72, 66], [28, 66]], 'ko');
    g.poly([[50, 40], [61, 60], [39, 60]], 'p');
    g.circle(66, 30, 5, 'k');
  });

  A('reactor', 'Reactor core', S, [3, 3], { placement: 'centre', blocksVision: true, roomTypes: ['engine-room', 'server-room'], min: 1, max: 1 }, (g) => {
    g.chamfer(6, 6, 288, 288, 64, 's');
    hazardRing(g, 150, 150, 120, 104);
    g.circle(150, 150, 96, 'ko');
    g.circle(150, 150, 70, 'pl');
    g.circle(150, 150, 46, 'o');
    g.circle(150, 150, 24, 'h');
    const spokes = [];
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      spokes.push([150 + Math.cos(a) * 74, 150 + Math.sin(a) * 74, 150 + Math.cos(a) * 92, 150 + Math.sin(a) * 92]);
    }
    g.lines(spokes, 'pl');
  });

  A('turbine', 'Engine turbine', S, [2, 2], { placement: 'wall', roomTypes: ['engine-room', 'server-room'], max: 2 }, (g) => {
    g.chamfer(6, 6, 188, 188, 34, 's');
    g.circle(100, 100, 80, 'ko');
    for (let i = 0; i < 10; i++) {
      const a = (i * Math.PI) / 5;
      const p = (t, r) => [100 + Math.cos(a + t) * r, 100 + Math.sin(a + t) * r];
      g.poly([p(0, 18), p(0.15, 72), p(0.45, 72), p(0.2, 18)], 'o');
    }
    g.circle(100, 100, 20, 'ko');
    g.circle(100, 100, 8, 'p');
  });

  A('generator', 'Power generator', S, [1, 2], { placement: 'wall', roomTypes: ['engine-room', 'cargo-bay', 'workshop', 'mine', 'server-room'], max: 2 }, (g) => {
    g.chamfer(6, 4, 88, 192, 16, 's');
    vent(g, 16, 14, 68, 50);
    g.chamfer(22, 78, 56, 84, 10, 'ko');
    g.poly([[56, 88], [36, 124], [50, 124], [42, 152], [66, 114], [52, 114]], 'p');
    buttons(g, 16, 178, 68, 4);
  });

  A('pipes', 'Pipe run', S, [2, 1], { placement: 'wall', layer: 'floor', blocksMovement: false, roomTypes: ['engine-room', 'corridor', 'cargo-bay', 'hydroponics-bay', 'mine', 'server-room'], max: 3 }, (g) => {
    g.rect(0, 6, 200, 14, 'o', 5);
    g.rect(0, 26, 200, 14, 's', 5);
    g.rect(44, 2, 12, 42, 'ko', 3);
    g.rect(144, 2, 12, 42, 'ko', 3);
    g.circle(100, 13, 9, 'ko');
    g.line(100, 5, 100, 21, 'pl');
  });

  A('bunk', 'Bunk', S, [1, 2], { placement: 'wall', roomTypes: ['crew-quarters', 'med-bay', 'detention', 'clinic'], max: 6, weight: 3 }, (g) => {
    g.chamfer(6, 4, 88, 192, 16, 'ko');
    g.chamfer(14, 12, 72, 176, 12, 'o');
    g.rect(22, 20, 56, 26, 's', 10);
    g.rect(14, 80, 72, 108, 's', 6);
    g.line(14, 96, 86, 96, 't');
  });

  G('mess-table', 'Mess table', S, 'table', { w: 3, h: 1, chairs: true, style: 'metal' }, { placement: 'centre', roomTypes: ['mess-hall', 'crew-quarters', 'cantina', 'apartment'], max: 3, weight: 2 }, { w: [2, 4], h: [1, 2] });

  G('lab-bench', 'Lab bench', S, 'counter', { len: 3, kind: 'lab' }, { placement: 'wall', roomTypes: ['lab', 'med-bay', 'cloning-lab', 'clinic'], max: 3, weight: 2 }, { len: [2, 5] });

  A('specimen-tank', 'Specimen tank', S, [1, 1], { placement: 'corner', blocksVision: true, roomTypes: ['lab', 'med-bay', 'cloning-lab'], max: 4 }, (g) => {
    g.chamfer(4, 4, 92, 92, 22, 'ko');
    g.circle(50, 50, 36, 'm');
    g.path('M40 36Q56 28 62 44Q70 60 52 66Q36 70 40 56Q46 48 40 36Z', 'k'); // the specimen
    g.circle(66, 30, 4, 'o');
    g.circle(30, 62, 3, 'o');
  });

  A('vent', 'Floor vent', S, [1, 1], { placement: 'free', layer: 'floor', blocksMovement: false, roomTypes: ['corridor', 'engine-room', 'cargo-bay', 'crew-quarters', 'server-room', 'detention'], max: 2 }, (g) => {
    g.chamfer(12, 12, 76, 76, 12, 's');
    vent(g, 20, 20, 60, 60);
    for (const [x, y] of [[18, 18], [82, 18], [18, 82], [82, 82]]) g.circle(x, y, 3, 'k');
  });

  A('hazard-stripes', 'Hazard floor', S, [2, 1], { placement: 'door', layer: 'floor', blocksMovement: false, roomTypes: ['airlock', 'cargo-bay', 'engine-room', 'hangar', 'landing-pad', 'workshop'], max: 1 }, (g) => {
    hazard(g, 4, 22, 192, 56, 22);
  });

  A('sofa', 'Lounge seat', S, [2, 1], { placement: 'wall', roomTypes: ['crew-quarters', 'mess-hall', 'apartment', 'cantina', 'clinic', 'corridor', 'landing-pad', 'security'], max: 2 }, (g) => {
    g.chamfer(4, 8, 192, 80, 18, 'ko');
    g.rect(16, 30, 82, 50, 's', 10);
    g.rect(102, 30, 82, 50, 's', 10);
    g.rect(28, 40, 20, 18, 'o', 6);
  });

  A('hydroponics', 'Hydroponics tray', S, [2, 1], { placement: 'free', roomTypes: ['lab', 'mess-hall', 'hydroponics-bay'], max: 3 }, (g) => {
    g.chamfer(4, 10, 192, 80, 14, 'm');
    for (const x of [30, 70, 110, 150]) leaves(g, x + 10, 50, 34, 6, 'o');
  });

  A('charging-pad', 'Drone pad', S, [1, 1], { placement: 'corner', layer: 'floor', blocksMovement: false, roomTypes: ['cargo-bay', 'engine-room', 'lab', 'hangar', 'workshop'], max: 2 }, (g) => {
    g.chamfer(4, 4, 92, 92, 16, 's');
    g.chamfer(12, 12, 76, 76, 12, 'd');
    // A quad drone parked on the pad.
    g.lines([[30, 30, 70, 70], [70, 30, 30, 70]], 'l');
    for (const [x, y] of [[30, 30], [70, 30], [30, 70], [70, 70]]) g.circle(x, y, 12, 'o');
    g.rect(40, 40, 20, 20, 'ko', 5);
  });

  A('observation-seat', 'Observation bench', S, [2, 1], { placement: 'balcony', roomTypes: ['*'], max: 2 }, (g) => {
    g.chamfer(10, 34, 180, 40, 10, 's');
    g.rect(10, 26, 180, 10, 'ko', 4);
    g.lines([[60, 40, 60, 70], [140, 40, 140, 70]], 't');
  });

  // ---- hangar and landing pad ---------------------------------------------------

  A('shuttle', 'Shuttle', S, [4, 6], { placement: 'centre', blocksVision: true, roomTypes: ['hangar', 'landing-pad'], min: 1, max: 1 }, (g) => {
    g.poly([[200, 20], [250, 90], [260, 250], [380, 380], [380, 470], [260, 440], [240, 560], [160, 560], [140, 440], [20, 470], [20, 380], [140, 250], [150, 90]], 's');
    g.poly([[200, 40], [236, 96], [164, 96]], 'ko'); // cockpit
    g.poly([[200, 110], [240, 250], [230, 420], [170, 420], [160, 250]], 'o');
    g.lines([[170, 300, 230, 300], [170, 340, 230, 340], [170, 380, 230, 380]], 't');
    for (const x of [172, 228]) g.rect(x - 18, 540, 36, 40, 'ko', 6);
    g.rect(40, 420, 60, 20, 'ko', 4);
    g.rect(300, 420, 60, 20, 'ko', 4);
  });

  A('power-loader', 'Power loader', S, [2, 2], { placement: 'free', roomTypes: ['hangar', 'cargo-bay', 'workshop', 'mine'], max: 2 }, (g) => {
    g.rect(40, 120, 30, 70, 'ko', 8);
    g.rect(130, 120, 30, 70, 'ko', 8);
    g.chamfer(50, 50, 100, 90, 18, 's');
    g.rect(74, 64, 52, 40, 'o', 10);
    for (const x of [18, 182]) {
      g.rect(x - 10, 30, 20, 90, 'o', 6);
      g.poly([[x - 16, 10], [x + 16, 10], [x + 8, 32], [x - 8, 32]], 'ko');
    }
  });

  A('tool-cart', 'Tool cart', S, [1, 1], { placement: 'free', roomTypes: ['hangar', 'workshop', 'engine-room'], max: 2 }, (g) => {
    g.chamfer(12, 16, 76, 64, 10, 's');
    g.rect(20, 24, 26, 20, 'o', 3);
    g.rect(52, 24, 28, 20, 'o', 3);
    g.line(24, 58, 76, 58, 'l');
    g.line(28, 66, 60, 66, 't');
    for (const [x, y] of [[14, 16], [86, 16], [14, 80], [86, 80]]) g.circle(x, y, 6, 'ko');
  });

  A('fuel-pump', 'Fuel pump', S, [1, 1], { placement: 'wall', roomTypes: ['hangar', 'landing-pad'], max: 2 }, (g) => {
    g.chamfer(14, 4, 72, 50, 10, 'ko');
    screen(g, 22, 10, 36, 20, 'bars');
    g.circle(70, 20, 7, 'p');
    g.path('M72 54Q72 84 44 86Q24 88 24 70', 'l');
    g.rect(16, 64, 16, 12, 's', 3);
  });

  A('landing-lights', 'Landing lights', S, [1, 1], { placement: 'free', layer: 'floor', blocksMovement: false, roomTypes: ['hangar', 'landing-pad'], max: 4 }, (g) => {
    for (const [x, y] of [[25, 25], [75, 25], [25, 75], [75, 75]]) {
      g.circle(x, y, 12, 'ko');
      g.circle(x, y, 5, 'p');
    }
  });

  A('pad-marking', 'Landing pad marking', S, [4, 4], { placement: 'centre', layer: 'floor', blocksMovement: false, roomTypes: ['landing-pad', 'hangar'], max: 1 }, (g) => {
    g.circle(200, 200, 180, 'd');
    g.circle(200, 200, 150, 'l');
    g.rect(130, 110, 30, 180, 'ko');
    g.rect(240, 110, 30, 180, 'ko');
    g.rect(160, 185, 80, 30, 'ko');
  });

  // ---- command, security, detention -------------------------------------------

  A('map-table', 'Tactical map table', S, [2, 3], { placement: 'centre', roomTypes: ['command-centre', 'security'], max: 1 }, (g) => {
    g.chamfer(6, 6, 188, 288, 30, 's');
    g.chamfer(20, 20, 160, 260, 20, 'ko');
    const grid = [];
    for (let x = 40; x < 180; x += 20) grid.push([x, 30, x, 270]);
    for (let y = 40; y < 280; y += 20) grid.push([30, y, 170, y]);
    g.lines(grid, 'pl');
    g.path('M50 230L90 170L120 190L150 90', 'l');
    g.circle(150, 90, 9, 'p');
    g.circle(90, 170, 7, 'o');
  });

  A('security-desk', 'Security desk', S, [2, 1], { placement: 'wall', roomTypes: ['security', 'detention', 'clinic', 'hangar'], max: 1 }, (g) => {
    g.path('M4 4H196V60H150Q100 84 50 60H4Z', 's');
    screen(g, 14, 8, 50, 26, 'bars');
    screen(g, 74, 8, 52, 26, 'radar');
    screen(g, 136, 8, 50, 26, 'bars');
    seat(g, 100, 84, 'n', 26);
  });

  A('scanner-arch', 'Scanner arch', S, [2, 1], { placement: 'door', roomTypes: ['security', 'detention', 'landing-pad'], max: 1 }, (g) => {
    g.rect(4, 30, 24, 40, 'ko', 5);
    g.rect(172, 30, 24, 40, 'ko', 5);
    g.lines([[28, 40, 172, 40], [28, 50, 172, 50], [28, 60, 172, 60]], 'd');
    g.circle(16, 50, 4, 'p');
    g.circle(184, 50, 4, 'p');
  });

  A('holding-bench', 'Holding bench', S, [2, 1], { placement: 'wall', roomTypes: ['security', 'detention', 'clinic', 'corridor'], max: 2 }, (g) => {
    g.chamfer(6, 10, 188, 44, 10, 's');
    g.rect(6, 4, 188, 10, 'ko', 3);
    for (const x of [40, 100, 160]) g.circle(x, 34, 7, 'l'); // restraint rings
  });

  A('cell-toilet', 'Cell toilet', S, [1, 1], { placement: 'corner', roomTypes: ['detention', 'crew-quarters', 'apartment'], max: 1 }, (g) => {
    g.chamfer(22, 4, 56, 22, 6, 's');
    g.ellipse(50, 56, 24, 32, 'o');
    g.ellipse(50, 60, 14, 20, 'm');
  });

  A('force-field', 'Force field emitter', S, [1, 1], { placement: 'door', layer: 'overhead', blocksMovement: false, roomTypes: ['detention', 'security', 'armoury'], max: 2 }, (g) => {
    g.chamfer(30, 0, 40, 22, 6, 'ko');
    g.circle(50, 11, 5, 'p');
    g.path('M34 26Q50 44 66 26M30 40Q50 62 70 40', 'd');
  });

  // ---- hydroponics --------------------------------------------------------

  A('grow-tower', 'Grow tower', S, [1, 1], { placement: 'free', roomTypes: ['hydroponics-bay', 'apartment', 'market', 'cantina', 'clinic', 'command-centre'], max: 6, weight: 2 }, (g) => {
    g.circle(50, 50, 38, 'ko');
    leaves(g, 50, 50, 64, 8, 'o');
    g.circle(50, 50, 10, 'p');
  });

  A('plant-bed', 'Plant bed', S, [2, 3], { placement: 'free', roomTypes: ['hydroponics-bay'], max: 4, weight: 2 }, (g) => {
    g.chamfer(6, 6, 188, 288, 16, 'm');
    for (let y = 40; y < 280; y += 50) for (const x of [55, 145]) leaves(g, x, y, 40, 6, 'o');
    g.lines([[100, 20, 100, 280]], 'd');
  });

  A('water-tank', 'Water tank', S, [1, 1], { placement: 'corner', blocksVision: true, roomTypes: ['hydroponics-bay', 'engine-room', 'mine', 'apartment'], max: 3 }, (g) => {
    g.circle(50, 50, 42, 's');
    g.circle(50, 50, 32, 'm');
    g.path('M30 50Q40 40 50 50T70 50', 'pl');
    g.path('M34 62Q44 52 54 62T70 62', 'pl');
    g.rect(78, 42, 18, 16, 'ko', 3);
  });

  // ---- server room --------------------------------------------------------

  A('server-rack', 'Server rack', S, [1, 2], { placement: 'wall', blocksVision: true, roomTypes: ['server-room', 'command-centre', 'security', 'lab'], max: 8, weight: 3 }, (g) => {
    g.chamfer(6, 4, 88, 192, 10, 'ko');
    for (let y = 14; y < 184; y += 22) {
      g.rect(14, y, 72, 16, 's', 3);
      lights(g, 22, y + 8, 5, 1, 9);
      g.rect(70, y + 4, 10, 8, 'ko', 2);
    }
  });

  A('data-core', 'Data core', S, [2, 2], { placement: 'centre', blocksVision: true, roomTypes: ['server-room', 'alien-ruins', 'command-centre'], min: 1, max: 1 }, (g) => {
    g.star(100, 100, 92, 6, 92, 's', Math.PI / 6);
    g.star(100, 100, 70, 6, 70, 'ko', Math.PI / 6);
    g.star(100, 100, 48, 6, 48, 'pl', Math.PI / 6);
    g.circle(100, 100, 22, 'o');
    lights(g, 70, 150, 7, 1, 10);
  });

  A('cable-run', 'Cable run', S, [1, 2], { placement: 'free', layer: 'floor', blocksMovement: false, roomTypes: ['server-room', 'engine-room', 'workshop', 'mine'], max: 3 }, (g) => {
    g.path('M30 0C30 60 70 80 60 200', 'l');
    g.path('M44 0C44 50 80 90 74 200', 'l');
    g.path('M58 0C58 60 40 120 40 200', 't');
    g.rect(24, 90, 58, 16, 'ko', 4);
  });

  // ---- workshop -----------------------------------------------------------

  A('fabricator', 'Fabricator', S, [2, 2], { placement: 'wall', blocksVision: true, roomTypes: ['workshop', 'hangar', 'lab', 'cloning-lab'], min: 1, max: 1 }, (g) => {
    g.chamfer(6, 6, 188, 176, 24, 's');
    g.chamfer(30, 30, 140, 110, 14, 'ko');
    g.rect(50, 80, 100, 40, 'o', 6); // print bed
    g.line(40, 60, 160, 60, 'pl'); // gantry
    g.rect(92, 50, 16, 26, 'o', 4);
    screen(g, 60, 150, 80, 24, 'bars');
  });

  A('robot-arm', 'Robot arm', S, [1, 1], { placement: 'free', roomTypes: ['workshop', 'cargo-bay', 'cloning-lab', 'hangar'], max: 2 }, (g) => {
    g.circle(30, 70, 22, 'ko');
    g.circle(30, 70, 8, 'p');
    g.rect(24, 34, 12, 40, 's', 5);
    g.add('<rect class="s" x="30" y="24" width="50" height="12" rx="5" transform="rotate(-20 30 30)"/>');
    g.poly([[76, 8], [92, 14], [86, 30], [72, 26]], 'ko');
  });

  A('welding-station', 'Welding station', S, [1, 1], { placement: 'wall', roomTypes: ['workshop', 'hangar'], max: 1 }, (g) => {
    g.chamfer(8, 4, 84, 44, 10, 's');
    g.circle(28, 26, 12, 'ko');
    g.circle(62, 26, 12, 'ko');
    g.path('M62 38Q66 70 40 80', 'l');
    g.star(40, 80, 12, 8, 4, 'k');
  });

  // ---- cantina and market -------------------------------------------------

  G('cantina-bar', 'Cantina bar', S, 'counter', { len: 4, kind: 'cantina' }, { placement: 'wall', roomTypes: ['cantina'], min: 1, max: 1 }, { len: [2, 6] });

  A('bar-stool', 'Bar stool', S, [1, 1], { placement: 'free', blocksMovement: false, roomTypes: ['cantina', 'mess-hall'], max: 6 }, (g) => {
    g.circle(50, 50, 34, 'ko');
    stool(g, 50, 50, 26);
  });

  G('cantina-table', 'Round table', S, 'table', { w: 1, h: 1, chairs: true, round: true, style: 'metal' }, { placement: 'centre', roomTypes: ['cantina', 'market', 'mess-hall'], max: 4, weight: 2 }, { w: [1, 2], h: [1, 2] });

  A('booth', 'Booth', S, [2, 2], { placement: 'wall', roomTypes: ['cantina', 'mess-hall'], max: 3 }, (g) => {
    g.path('M6 6H194V190H160V50H40V190H6Z', 'ko');
    g.path('M22 22H178V180H164V50Q100 40 36 50V180H22Z', 's');
    g.chamfer(56, 80, 88, 76, 16, 'o');
    g.circle(84, 110, 9, 'k');
    g.circle(116, 124, 7, 'm');
  });

  A('holo-stage', 'Holo stage', S, [2, 2], { placement: 'centre', layer: 'floor', blocksMovement: false, roomTypes: ['cantina', 'market', 'command-centre'], max: 1 }, (g) => {
    g.circle(100, 100, 90, 's');
    g.circle(100, 100, 74, 'ko');
    g.circle(100, 100, 58, 'd');
    g.circle(100, 100, 40, 'pl');
    figure(g, 100, 100, 0.9, 'hm');
  });

  A('jukebox', 'Jukebox', S, [1, 1], { placement: 'wall', roomTypes: ['cantina', 'apartment'], max: 1 }, (g) => {
    g.path('M10 70V30Q10 4 50 4Q90 4 90 30V70Z', 's');
    g.path('M22 62V34Q22 16 50 16Q78 16 78 34V62Z', 'ko');
    for (let i = 0; i < 4; i++) g.line(32 + i * 12, 30, 32 + i * 12, 56, 'pl');
  });

  A('market-stall', 'Market stall', S, [2, 2], { placement: 'free', roomTypes: ['market'], min: 1, max: 4, weight: 3 }, (g) => {
    g.chamfer(10, 70, 180, 110, 12, 'o');
    for (let i = 0; i < 6; i++) g.rect(20 + i * 28, 90, 22, 22, i % 2 ? 's' : 'm', 4);
    g.rect(24, 130, 150, 36, 's', 6);
    // Striped awning along the back.
    g.rect(4, 4, 192, 56, 'o', 8);
    for (let x = 4; x < 196; x += 32) g.rect(x, 4, 16, 56, 'k');
    g.rect(4, 4, 192, 56, 'l', 8);
  });

  A('vending-machine', 'Vending machine', S, [1, 1], { placement: 'wall', blocksVision: true, roomTypes: ['market', 'corridor', 'cantina', 'mess-hall', 'hangar'], max: 2 }, (g) => {
    g.chamfer(8, 2, 84, 72, 10, 'ko');
    g.rect(16, 10, 46, 44, 's', 4);
    const grid = [];
    for (let y = 22; y < 54; y += 11) grid.push([16, y, 62, y]);
    g.lines(grid, 't');
    g.rect(68, 12, 16, 24, 'o', 3);
    g.rect(16, 58, 46, 10, 'o', 3);
  });

  A('goods-bin', 'Goods bin', S, [1, 1], { placement: 'free', roomTypes: ['market', 'cargo-bay', 'hydroponics-bay', 'workshop', 'hangar', 'mine'], max: 4, weight: 2 }, (g) => {
    g.chamfer(8, 8, 84, 84, 16, 'ko');
    g.chamfer(16, 16, 68, 68, 12, 's');
    for (const [x, y, r] of [[36, 38, 12], [62, 36, 11], [40, 64, 11], [66, 62, 12], [50, 50, 10]]) g.circle(x, y, r, 'o');
  });

  A('holo-sign', 'Holo sign', S, [1, 1], { placement: 'wall', layer: 'overhead', blocksMovement: false, roomTypes: ['market', 'cantina', 'corridor'], max: 2 }, (g) => {
    g.chamfer(6, 0, 88, 34, 10, 'ko');
    g.path('M18 26L28 8L38 26M44 8V26M52 8H66M59 8V26M74 8V26H86', 'pl');
  });

  // ---- apartment and clinic -----------------------------------------------

  A('sleep-pod', 'Double bed', S, [2, 2], { placement: 'wall', roomTypes: ['apartment', 'crew-quarters'], max: 1 }, (g) => {
    g.chamfer(4, 4, 192, 192, 30, 'ko');
    g.chamfer(14, 14, 172, 176, 22, 'o');
    g.rect(26, 26, 66, 34, 's', 14);
    g.rect(108, 26, 66, 34, 's', 14);
    g.rect(14, 76, 172, 114, 's', 16);
    g.line(14, 96, 186, 96, 't');
  });

  A('holo-tv', 'Holo screen', S, [2, 1], { placement: 'wall', roomTypes: ['apartment', 'crew-quarters', 'cantina', 'clinic'], max: 1 }, (g) => {
    g.rect(10, 2, 180, 12, 'ko', 3);
    screen(g, 20, 18, 160, 40, 'graph');
    g.path('M60 58L100 90L140 58', 'd');
  });

  A('kitchenette', 'Kitchenette', S, [2, 1], { placement: 'wall', roomTypes: ['apartment', 'mess-hall', 'crew-quarters', 'cantina'], min: 1, max: 1 }, (g) => {
    g.chamfer(4, 4, 192, 60, 12, 's');
    g.circle(36, 30, 14, 'ko');
    g.circle(36, 30, 6, 'pl');
    g.circle(76, 30, 14, 'ko');
    g.chamfer(110, 12, 76, 38, 10, 'm'); // sink
    g.circle(148, 31, 5, 'k');
  });

  // ---- mine ---------------------------------------------------------------

  A('ore-cart', 'Ore cart', S, [1, 2], { placement: 'free', roomTypes: ['mine'], max: 3, weight: 2 }, (g) => {
    g.lines([[22, 0, 22, 200], [78, 0, 78, 200]], 'l');
    const ties = [];
    for (let y = 10; y < 200; y += 22) ties.push([12, y, 88, y]);
    g.lines(ties, 't');
    g.chamfer(14, 36, 72, 128, 12, 'ko');
    for (let i = 0; i < 6; i++) g.poly(stoneShape(36 + (i % 2) * 26, 60 + Math.floor(i / 2) * 32, 13, i + 4, 6), i % 2 ? 's' : 'o');
  });

  A('mine-rails', 'Rails', S, [1, 2], { placement: 'free', layer: 'floor', blocksMovement: false, roomTypes: ['mine'], max: 4 }, (g) => {
    const ties = [];
    for (let y = 8; y < 200; y += 20) ties.push([10, y, 90, y]);
    g.lines(ties, 'l');
    g.lines([[26, 0, 26, 200], [74, 0, 74, 200]], 'l');
  });

  A('drill-rig', 'Drill rig', S, [2, 2], { placement: 'free', blocksVision: true, roomTypes: ['mine'], min: 1, max: 1 }, (g) => {
    g.chamfer(10, 70, 180, 120, 20, 's');
    for (const x of [30, 170]) g.rect(x - 16, 84, 32, 92, 'ko', 8); // tracks
    g.rect(60, 90, 80, 60, 'o', 8);
    g.rect(88, 10, 24, 84, 'ko', 4);
    g.star(100, 12, 18, 8, 8, 'ko');
  });

  A('ore-pile', 'Ore pile', S, [1, 1], { placement: 'corner', blocksMovement: false, roomTypes: ['mine', 'cargo-bay', 'workshop'], max: 4 }, (g) => {
    const stones = [[30, 34, 16], [62, 30, 14], [48, 56, 18], [74, 62, 13], [28, 70, 12]];
    stones.forEach(([x, y, r], i) => g.poly(stoneShape(x, y, r, i * 3 + 1, 6), i % 2 ? 'ko' : 's'));
  });

  A('support-strut', 'Support strut', S, [1, 1], { placement: 'corner', blocksVision: true, roomTypes: ['mine', 'hangar', 'cargo-bay'], max: 6 }, (g) => {
    g.rect(22, 22, 56, 56, 'ko', 4);
    g.lines([[22, 22, 78, 78], [78, 22, 22, 78]], 'pl');
    g.rect(30, 30, 40, 40, 'pl', 2);
  });

  A('work-lamp', 'Work lamp', S, [1, 1], { placement: 'corner', blocksMovement: false, roomTypes: ['mine', 'hangar', 'workshop', 'alien-ruins'], max: 4 }, (g) => {
    g.lines([[50, 50, 22, 78], [50, 50, 78, 78], [50, 50, 50, 14]], 'l');
    g.circle(50, 50, 18, 'ko');
    g.circle(50, 50, 8, 'p');
  });

  // ---- alien ruins --------------------------------------------------------

  A('obelisk', 'Alien obelisk', S, [1, 1], { placement: 'free', blocksVision: true, roomTypes: ['alien-ruins'], min: 1, max: 3 }, (g) => {
    g.poly([[50, 4], [92, 50], [50, 96], [8, 50]], 'ko');
    g.poly([[50, 20], [76, 50], [50, 80], [24, 50]], 's');
    g.path('M50 32V68M40 44H60M42 58L58 58', 'l');
  });

  A('glyph-tile', 'Glyph floor', S, [2, 2], { placement: 'centre', layer: 'floor', blocksMovement: false, roomTypes: ['alien-ruins'], max: 2 }, (g) => {
    g.star(100, 100, 92, 6, 92, 's', 0);
    g.star(100, 100, 70, 6, 70, 'o', 0);
    g.path('M100 40V160M48 70L152 130M152 70L48 130', 'd');
    g.circle(100, 100, 24, 'ko');
    g.circle(100, 100, 10, 'p');
  });

  A('broken-column', 'Broken column', S, [1, 1], { placement: 'free', blocksVision: true, roomTypes: ['alien-ruins'], max: 6, weight: 2 }, (g) => {
    g.poly([[50, 6], [84, 22], [94, 56], [72, 90], [34, 92], [8, 62], [14, 26]], 's');
    g.poly([[50, 22], [74, 34], [78, 58], [60, 76], [36, 74], [24, 54], [28, 32]], 'o');
    g.path('M36 36L52 52L46 70M60 30L64 46', 'l');
  });

  A('crystal-cluster', 'Crystal cluster', S, [1, 1], { placement: 'free', roomTypes: ['alien-ruins', 'mine'], max: 5, weight: 2 }, (g) => {
    for (const [x, y, r, a] of [[40, 40, 26, 0.2], [66, 58, 22, 1.1], [34, 70, 16, 2.2], [68, 28, 14, 0.8]]) {
      g.poly([[x + Math.cos(a) * r, y + Math.sin(a) * r], [x + Math.cos(a + 1.9) * r * 0.5, y + Math.sin(a + 1.9) * r * 0.5], [x - Math.cos(a) * r * 0.6, y - Math.sin(a) * r * 0.6], [x + Math.cos(a - 1.9) * r * 0.5, y + Math.sin(a - 1.9) * r * 0.5]], 'o');
      g.line(x + Math.cos(a) * r, y + Math.sin(a) * r, x - Math.cos(a) * r * 0.6, y - Math.sin(a) * r * 0.6, 't');
    }
  });

  A('artefact-pedestal', 'Artefact pedestal', S, [1, 1], { placement: 'centre', roomTypes: ['alien-ruins', 'lab', 'market'], max: 1 }, (g) => {
    g.star(50, 50, 44, 8, 44, 's', Math.PI / 8);
    g.star(50, 50, 30, 8, 30, 'o', Math.PI / 8);
    g.star(50, 50, 16, 5, 7, 'ko');
  });

  // ---- cloning lab --------------------------------------------------------

  A('cloning-vat', 'Cloning vat', S, [1, 1], { placement: 'free', blocksVision: true, roomTypes: ['cloning-lab', 'lab', 'alien-ruins'], max: 6, weight: 3 }, (g) => {
    g.circle(50, 50, 44, 'ko');
    g.circle(50, 50, 36, 'm');
    figure(g, 50, 50, 0.7, 'o');
    g.circle(70, 30, 3, 'p');
    g.circle(30, 68, 2.5, 'p');
    for (const a of [0.8, 2.4, 3.9, 5.5]) g.rect(50 + Math.cos(a) * 44 - 5, 50 + Math.sin(a) * 44 - 5, 10, 10, 's', 2);
  });

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
