// Game logic tests using Node.js built-in test runner
// Run: node --test tests/game.test.js

const { describe, it, before, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// ---------------------------------------------------------------------------
// Extract inline JS from index.html and run it in a sandboxed context
// ---------------------------------------------------------------------------
let G; // accessor for game globals

function createBrowserMocks() {
  const canvasCtx = {
    createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h }),
    putImageData: () => {},
    fillRect: () => {},
    strokeRect: () => {},
    clearRect: () => {},
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    arc: () => {},
    fill: () => {},
    stroke: () => {},
    closePath: () => {},
    quadraticCurveTo: () => {},
    measureText: () => ({ width: 50 }),
    fillText: () => {},
    strokeText: () => {},
    drawImage: () => {},
    save: () => {},
    restore: () => {},
    translate: () => {},
    rotate: () => {},
    scale: () => {},
    getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
    set font(_) {},
    set fillStyle(_) {},
    set strokeStyle(_) {},
    set lineWidth(_) {},
    set globalAlpha(_) {},
    set textAlign(_) {},
    set textBaseline(_) {},
    set shadowColor(_) {},
    set shadowBlur(_) {},
    set shadowOffsetX(_) {},
    set shadowOffsetY(_) {},
    set globalCompositeOperation(_) {},
    set lineCap(_) {},
    set lineJoin(_) {},
  };

  const elements = {
    'game': {
      getContext: () => canvasCtx,
      width: 960, height: 540,
      style: {}, requestPointerLock: () => {},
      addEventListener: () => {},
    },
    'cam-preview': { getContext: () => canvasCtx, width: 200, height: 150, style: {} },
    'camera-feed': { style: {}, srcObject: null },
    'gesture-label': { textContent: '', style: {} },
    'overlay': { style: {} },
    'death-screen': { style: {} },
    'win-screen': { style: {} },
    'win-kills': { textContent: '' },
    'win-damage': { textContent: '' },
    'win-time': { textContent: '' },
    'cam-select': { innerHTML: '', value: '', addEventListener: () => {} },
    'cam-select-row': { style: {} },
    'how-to-play': { style: {}, classList: { toggle: () => {} } },
    'toggle-help': { addEventListener: () => {} },
    'btn-camera': { addEventListener: () => {} },
    'btn-keyboard': { addEventListener: () => {} },
    'btn-refresh-cams': { addEventListener: () => {} },
    'instr-camera': { style: {} },
    'instr-keyboard': { style: {} },
    'mic-indicator': { style: {} },
  };

  return {
    document: {
      getElementById: (id) => elements[id] || { style: {}, addEventListener: () => {}, textContent: '', innerHTML: '' },
      exitPointerLock: () => {},
      addEventListener: () => {},
      pointerLockElement: null,
    },
    window: {
      innerWidth: 1920, innerHeight: 1080,
      addEventListener: () => {},
      AudioContext: class AudioContext {
        constructor() { this.currentTime = 0; }
        createOscillator() { return { type: '', frequency: { setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, start() {}, stop() {} }; }
        createGain() { return { gain: { setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }; }
        createBiquadFilter() { return { type: '', frequency: { setValueAtTime() {} }, Q: { setValueAtTime() {} }, connect() {} }; }
        createBuffer(ch, len, sr) { return { getChannelData: () => new Float32Array(len) }; }
        createBufferSource() { return { buffer: null, connect() {}, start() {}, stop() {}, set loop(_) {} }; }
        get destination() { return {}; }
      },
      webkitAudioContext: undefined,
      requestAnimationFrame: () => {},
      SpeechRecognition: undefined,
      webkitSpeechRecognition: undefined,
    },
    navigator: {
      mediaDevices: { getUserMedia: () => Promise.resolve(null), enumerateDevices: () => Promise.resolve([]) },
    },
    Hands: undefined,
    FaceMesh: undefined,
    console,
    Math,
    parseInt,
    parseFloat,
    isNaN,
    isFinite,
    Uint8ClampedArray,
    Uint8Array,
    Float32Array,
    Float64Array,
    Array,
    Map,
    Set,
    Object,
    String,
    Number,
    Boolean,
    Error,
    TypeError,
    RangeError,
    Promise,
    setTimeout: () => 0,
    setInterval: () => 0,
    clearTimeout: () => {},
    clearInterval: () => {},
    requestAnimationFrame: () => {},
    alert: () => {},
  };
}

let _sandbox;

/** Evaluate an expression in the game's VM context */
function $(expr) {
  return vm.runInContext(expr, _sandbox);
}

function loadGame() {
  const htmlPath = path.join(__dirname, '..', 'index.html');
  const html = fs.readFileSync(htmlPath, 'utf8');

  // Extract JS from <script> tag (the main inline block, not CDN entries)
  const scriptMatch = html.match(/<script>\s*([\s\S]*?)\s*<\/script>/);
  if (!scriptMatch) throw new Error('Could not find inline <script> block in index.html');
  const jsCode = scriptMatch[1];

  const mocks = createBrowserMocks();
  _sandbox = vm.createContext({
    ...mocks,
    Uint8ClampedArray, Uint8Array, Float32Array, Float64Array,
    ArrayBuffer, DataView,
  });

  _sandbox.AudioContext = mocks.window.AudioContext;
  _sandbox.document = mocks.document;
  _sandbox.navigator = mocks.navigator;
  _sandbox.window = mocks.window;

  vm.runInContext(jsCode, _sandbox, { filename: 'index.html' });
}

// ---------------------------------------------------------------------------
// TESTS
// ---------------------------------------------------------------------------

before(() => {
  loadGame();
});

// ── MAP INTEGRITY ──────────────────────────────────────────────────────────

describe('Map - Main Level', () => {
  it('has correct dimensions (32x32 = 1024 tiles)', () => {
    assert.equal($('MAP_W'), 32);
    assert.equal($('MAP_H'), 32);
    assert.equal($('mapData.length'), 1024);
  });

  it('has walls on entire border', () => {
    for (let x = 0; x < 32; x++) {
      assert.equal($(`mainMapData[0 * 32 + ${x}]`), 1, `Top border tile [${x},0] should be wall`);
      assert.equal($(`mainMapData[31 * 32 + ${x}]`), 1, `Bottom border tile [${x},31] should be wall`);
    }
    for (let y = 0; y < 32; y++) {
      assert.equal($(`mainMapData[${y} * 32 + 0]`), 1, `Left border tile [0,${y}] should be wall`);
      assert.equal($(`mainMapData[${y} * 32 + 31]`), 1, `Right border tile [31,${y}] should be wall`);
    }
  });

  it('contains only valid tile types (0-6)', () => {
    const tiles = $('[...mainMapData]');
    for (let i = 0; i < tiles.length; i++) {
      assert.ok(tiles[i] >= 0 && tiles[i] <= 6, `Tile index ${i} has invalid type ${tiles[i]}`);
    }
  });

  it('has at least one exit tile (type 6)', () => {
    assert.ok($('mainMapData.includes(6)'), 'Map must have an exit tile');
  });

  it('has at least one door tile (type 3)', () => {
    assert.ok($('mainMapData.includes(3)'), 'Map must have door tiles');
  });

  it('has open space for player spawn at (2,2)', () => {
    assert.equal($('mainMapData[2 * 32 + 2]'), 0, 'Spawn area should be empty');
  });

  it('mainMapData is a backup copy of correct size', () => {
    assert.equal($('mainMapData.length'), 1024);
  });
});

describe('Map - Tutorial Level', () => {
  it('has correct dimensions (1024 tiles)', () => {
    assert.equal($('tutorialMapData.length'), 1024);
  });

  it('has walls on entire border', () => {
    for (let x = 0; x < 32; x++) {
      assert.equal($(`tutorialMapData[0 * 32 + ${x}]`), 1, `Top border [${x},0]`);
      assert.equal($(`tutorialMapData[31 * 32 + ${x}]`), 1, `Bottom border [${x},31]`);
    }
    for (let y = 0; y < 32; y++) {
      assert.equal($(`tutorialMapData[${y} * 32 + 0]`), 1, `Left border [0,${y}]`);
      assert.equal($(`tutorialMapData[${y} * 32 + 31]`), 1, `Right border [31,${y}]`);
    }
  });

  it('has an exit tile (type 6)', () => {
    assert.ok($('tutorialMapData.includes(6)'), 'Tutorial must have exit');
  });

  it('is mostly open space', () => {
    const openCount = $('[...tutorialMapData].filter(t => t === 0).length');
    assert.ok(openCount > 800, `Tutorial should be mostly open (got ${openCount}/1024 open tiles)`);
  });
});

// ── MAP FUNCTIONS ──────────────────────────────────────────────────────────

describe('getMap / getRawMap', () => {
  it('returns 1 for out-of-bounds coordinates', () => {
    assert.equal($('getMap(-1, 0)'), 1);
    assert.equal($('getMap(0, -1)'), 1);
    assert.equal($('getMap(32, 0)'), 1);
    assert.equal($('getMap(0, 32)'), 1);
    assert.equal($('getRawMap(-1, -1)'), 1);
    assert.equal($('getRawMap(100, 100)'), 1);
  });

  it('returns correct tile for known positions', () => {
    assert.equal($('getRawMap(0, 0)'), 1);
    assert.equal($('getRawMap(1, 1)'), 0);
  });
});

describe('doorKey', () => {
  it('generates comma-separated key', () => {
    assert.equal($('doorKey(3, 5)'), '3,5');
    assert.equal($('doorKey(0, 0)'), '0,0');
    assert.equal($('doorKey(31, 31)'), '31,31');
  });
});

// ── PLAYER DEFAULTS ────────────────────────────────────────────────────────

describe('Player defaults', () => {
  it('has correct health and shield', () => {
    assert.equal($('player.maxHealth'), 100);
    assert.equal($('player.maxShield'), 100);
  });

  it('has correct movement speeds', () => {
    assert.equal($('player.moveSpeed'), 4.0);
    assert.equal($('player.sprintSpeed'), 6.5);
  });

  it('has correct grenade count', () => {
    assert.equal($('player.maxGrenades'), 4);
  });

  it('has correct shield regen stats', () => {
    assert.equal($('player.shieldRegenDelay'), 3.0);
    assert.equal($('player.shieldRegenRate'), 30);
  });
});

// ── WEAPONS ────────────────────────────────────────────────────────────────

describe('Weapons', () => {
  it('has exactly 3 weapons', () => {
    assert.equal($('player.weapons.length'), 3);
  });

  it('Assault Rifle has correct stats', () => {
    const ar = $('player.weapons[0]');
    assert.equal(ar.name, 'MA5B ASSAULT RIFLE');
    assert.equal(ar.maxAmmo, 32);
    assert.equal(ar.reserve, 256);
    assert.equal(ar.fireRate, 0.08);
    assert.equal(ar.damage, 12);
    assert.equal(ar.auto, true);
  });

  it('Pistol has correct stats', () => {
    const p = $('player.weapons[1]');
    assert.equal(p.name, 'M6D PISTOL');
    assert.equal(p.maxAmmo, 12);
    assert.equal(p.reserve, 120);
    assert.equal(p.damage, 25);
    assert.equal(p.auto, false);
  });

  it('Shotgun has correct stats', () => {
    const sg = $('player.weapons[2]');
    assert.equal(sg.name, 'M90 SHOTGUN');
    assert.equal(sg.maxAmmo, 8);
    assert.equal(sg.reserve, 40);
    assert.equal(sg.damage, 60);
    assert.equal(sg.pellets, 6);
    assert.equal(sg.auto, false);
  });

  it('all weapons have required properties', () => {
    const weapons = $('player.weapons');
    for (const w of weapons) {
      assert.ok(typeof w.name === 'string' && w.name.length > 0);
      assert.ok(typeof w.maxAmmo === 'number' && w.maxAmmo > 0);
      assert.ok(typeof w.fireRate === 'number' && w.fireRate > 0);
      assert.ok(typeof w.damage === 'number' && w.damage > 0);
      assert.ok(typeof w.spread === 'number');
      assert.ok(typeof w.sound === 'string');
    }
  });
});

// ── ENEMY TYPES ────────────────────────────────────────────────────────────

describe('Enemy types', () => {
  it('defines grunt, elite, and hunter', () => {
    assert.ok($('ENEMY_TYPES.grunt'));
    assert.ok($('ENEMY_TYPES.elite'));
    assert.ok($('ENEMY_TYPES.hunter'));
  });

  it('grunt is weakest', () => {
    assert.ok($('ENEMY_TYPES.grunt.health < ENEMY_TYPES.elite.health'));
    assert.ok($('ENEMY_TYPES.grunt.health < ENEMY_TYPES.hunter.health'));
  });

  it('hunter is toughest', () => {
    assert.equal($('ENEMY_TYPES.hunter.health'), 200);
    assert.ok($('ENEMY_TYPES.hunter.damage > ENEMY_TYPES.grunt.damage'));
  });

  it('elite is medium tier', () => {
    assert.ok($('ENEMY_TYPES.elite.health > ENEMY_TYPES.grunt.health && ENEMY_TYPES.elite.health < ENEMY_TYPES.hunter.health'));
  });

  it('all types have required stats', () => {
    const types = $('ENEMY_TYPES');
    for (const [name, type] of Object.entries(types)) {
      assert.ok(type.health > 0, `${name} health`);
      assert.ok(type.speed > 0, `${name} speed`);
      assert.ok(type.damage > 0, `${name} damage`);
      assert.ok(type.fireRate > 0, `${name} fireRate`);
      assert.ok(type.range > 0, `${name} range`);
      assert.ok(type.size > 0, `${name} size`);
      assert.ok(type.points > 0, `${name} points`);
      assert.ok(typeof type.shootSound === 'string', `${name} shootSound`);
    }
  });

  it('points scale with difficulty (grunt < elite < hunter)', () => {
    assert.ok($('ENEMY_TYPES.grunt.points < ENEMY_TYPES.elite.points'));
    assert.ok($('ENEMY_TYPES.elite.points < ENEMY_TYPES.hunter.points'));
  });
});

// ── ENEMY CREATION ─────────────────────────────────────────────────────────

describe('createEnemy', () => {
  it('creates a grunt with correct stats', () => {
    const e = $('createEnemy("grunt", 5.5, 10.5)');
    assert.equal(e.type, 'grunt');
    assert.equal(e.x, 5.5);
    assert.equal(e.y, 10.5);
    assert.equal(e.health, 30);
    assert.equal(e.maxHealth, 30);
    assert.equal(e.speed, 1.3);
    assert.equal(e.alive, true);
    assert.equal(e.state, 'idle');
  });

  it('creates a hunter with correct stats', () => {
    const e = $('createEnemy("hunter", 15, 20)');
    assert.equal(e.health, 200);
    assert.equal(e.damage, 30);
    assert.equal(e.size, 0.8);
    assert.equal(e.points, 500);
  });

  it('creates an elite with correct stats', () => {
    const e = $('createEnemy("elite", 10, 10)');
    assert.equal(e.health, 80);
    assert.equal(e.speed, 1.9);
    assert.equal(e.damage, 12);
  });
});

// ── COLLISION SYSTEM ───────────────────────────────────────────────────────

describe('canMove', () => {
  before(() => {
    $('initDoors()');
  });

  it('blocks movement into walls', () => {
    assert.equal($('canMove(0.5, 0.5)'), false);
  });

  it('allows movement in open space', () => {
    assert.equal($('canMove(1.5, 1.5)'), true);
  });

  it('blocks out-of-bounds positions', () => {
    assert.equal($('canMove(-1, -1)'), false);
    assert.equal($('canMove(33, 33)'), false);
  });

  it('respects collision radius', () => {
    assert.equal($('canMove(1.1, 1.1, 0.25)'), false);
    assert.equal($('canMove(1.5, 1.5, 0.25)'), true);
  });
});

// ── LINE OF SIGHT ──────────────────────────────────────────────────────────

describe('lineOfSight', () => {
  before(() => {
    $('initDoors()');
  });

  it('returns true for clear path in open space', () => {
    assert.equal($('lineOfSight(1.5, 1.5, 3.5, 1.5)'), true);
  });

  it('returns false when wall blocks path', () => {
    assert.equal($('lineOfSight(1.5, 1.5, 1.5, 15.5)'), false);
  });

  it('returns true for same point', () => {
    assert.equal($('lineOfSight(5.5, 5.5, 5.5, 5.5)'), true);
  });
});

// ── DOOR SYSTEM ────────────────────────────────────────────────────────────

describe('Door system', () => {
  beforeEach(() => {
    $('for(let i=0;i<1024;i++) mapData[i]=mainMapData[i]; initDoors()');
  });

  it('finds all door tiles in main map', () => {
    const doorCount = $('[...mainMapData].filter(t => t === 3).length');
    assert.equal($('doors.size'), doorCount);
    assert.ok(doorCount > 0, 'Map should have doors');
  });

  it('all doors start closed', () => {
    const states = $('[...doors.values()].map(d => d.state)');
    for (const s of states) assert.equal(s, 'closed');
    const amounts = $('[...doors.values()].map(d => d.openAmount)');
    for (const a of amounts) assert.equal(a, 0);
  });

  it('door state transitions: closed → opening', () => {
    $('doors.values().next().value.state = "opening"');
    $('updateDoors(0.3)');
    assert.equal($('doors.values().next().value.state'), 'opening');
    assert.ok($('doors.values().next().value.openAmount') > 0);
  });

  it('door fully opens after enough time', () => {
    $('doors.values().next().value.state = "opening"');
    $('updateDoors(0.3); updateDoors(0.3); updateDoors(0.1)');
    assert.equal($('doors.values().next().value.state'), 'open');
    assert.equal($('doors.values().next().value.openAmount'), 1);
  });

  it('getMap returns 0 for open door', () => {
    $('{ const d = doors.values().next().value; d.state="open"; d.openAmount=1.0; }');
    const result = $('{ const d = doors.values().next().value; getMap(d.x, d.y); }');
    assert.equal(result, 0);
  });

  it('getMap returns 3 for closed door', () => {
    const result = $('{ const d = doors.values().next().value; getMap(d.x, d.y); }');
    assert.equal(result, 3);
  });
});

// ── TUTORIAL SYSTEM ────────────────────────────────────────────────────────

describe('Tutorial system', () => {
  it('has 6 tutorial steps', () => {
    assert.equal($('TUTORIAL_STEPS.length'), 6);
  });

  it('all steps have msg and done function', () => {
    const count = $('TUTORIAL_STEPS.length');
    for (let i = 0; i < count; i++) {
      assert.ok($(`typeof TUTORIAL_STEPS[${i}].msg === 'string' && TUTORIAL_STEPS[${i}].msg.length > 0`), `Step ${i} msg`);
      assert.ok($(`typeof TUTORIAL_STEPS[${i}].done === 'function'`), `Step ${i} done`);
    }
  });

  it('step 1 requires looking around (angle > 0.4)', () => {
    $('player.angle = 0');
    assert.equal($('TUTORIAL_STEPS[0].done()'), false);
    $('player.angle = 0.5');
    assert.equal($('TUTORIAL_STEPS[0].done()'), true);
  });

  it('step 2 requires moving away from spawn', () => {
    $('player.x = 2.5; player.y = 2.5');
    assert.equal($('TUTORIAL_STEPS[1].done()'), false);
    $('player.x = 5.0; player.y = 5.0');
    assert.equal($('TUTORIAL_STEPS[1].done()'), true);
  });

  it('step 4 requires a kill', () => {
    $('player.kills = 0');
    assert.equal($('TUTORIAL_STEPS[3].done()'), false);
    $('player.kills = 1');
    assert.equal($('TUTORIAL_STEPS[3].done()'), true);
  });

  it('last step is never auto-completed (exit triggers it)', () => {
    assert.equal($('TUTORIAL_STEPS[5].done()'), false);
  });
});

// ── AI ALLIES ──────────────────────────────────────────────────────────────

describe('AI allies', () => {
  it('createAlly returns correct structure', () => {
    const a = $('createAlly("SGT. TEST", 5, 5)');
    assert.equal(a.name, 'SGT. TEST');
    assert.equal(a.x, 5);
    assert.equal(a.y, 5);
    assert.equal(a.health, 100);
    assert.equal(a.alive, true);
    assert.equal(a.state, 'follow');
  });

  it('has 3 ally names defined', () => {
    assert.equal($('ALLY_NAMES.length'), 3);
    assert.ok($('ALLY_NAMES.includes("SGT. JOHNSON")'));
    assert.ok($('ALLY_NAMES.includes("CPL. CHEN")'));
    assert.ok($('ALLY_NAMES.includes("PVT. HAYES")'));
  });
});

// ── RENDERING CONSTANTS ────────────────────────────────────────────────────

describe('Rendering constants', () => {
  it('render resolution is 960x540', () => {
    assert.equal($('RENDER_W'), 960);
    assert.equal($('RENDER_H'), 540);
  });

  it('screen buffer exists and has correct size', () => {
    assert.ok($('screenBuffer'));
    assert.equal($('screenBuffer.data.length'), 960 * 540 * 4);
  });

  it('z-buffer has correct width', () => {
    assert.ok($('zBuffer'));
    assert.equal($('zBuffer.length'), 960);
  });
});

// ── PROCEDURAL FUNCTIONS ───────────────────────────────────────────────────

describe('Procedural generation', () => {
  it('hash returns consistent values', () => {
    assert.equal($('hash(10, 20)'), $('hash(10, 20)'));
  });

  it('hash returns values in 0-255 range', () => {
    for (let i = 0; i < 50; i++) {
      const v = $(`hash(${i * 7}, ${i * 13})`);
      assert.ok(v >= 0 && v <= 255, `hash(${i*7},${i*13}) = ${v}`);
    }
  });

  it('smoothNoise returns a number', () => {
    const v = $('smoothNoise(5.5, 3.2)');
    assert.ok(typeof v === 'number');
    assert.ok(!isNaN(v));
  });

  it('fbm returns a number', () => {
    const v = $('fbm(5.5, 3.2, 4)');
    assert.ok(typeof v === 'number');
    assert.ok(!isNaN(v));
  });
});

// ── TEXTURES ───────────────────────────────────────────────────────────────

describe('Textures', () => {
  it('wall texture map covers all wall types', () => {
    assert.ok($('wallTexMap[1]'), 'metal wall texture');
    assert.ok($('wallTexMap[2]'), 'covenant wall texture');
    assert.ok($('wallTexMap[3]'), 'door texture');
    assert.ok($('wallTexMap[6]'), 'exit texture');
  });
});

// ── LIGHTING ───────────────────────────────────────────────────────────────

describe('Lighting', () => {
  it('lights array has entries', () => {
    assert.ok($('lights.length') > 0);
  });

  it('all lights have required properties', () => {
    const lights = $('lights');
    for (const l of lights) {
      assert.ok(typeof l.x === 'number');
      assert.ok(typeof l.y === 'number');
      assert.ok(typeof l.r === 'number');
      assert.ok(typeof l.g === 'number');
      assert.ok(typeof l.b === 'number');
      assert.ok(typeof l.intensity === 'number' && l.intensity > 0);
      assert.ok(typeof l.radius === 'number' && l.radius > 0);
    }
  });

  it('getLightAt returns ambient light for distant positions', () => {
    const result = $('getLightAt(30, 30)');
    assert.ok(result[0] >= 0.1);
    assert.ok(result[1] >= 0.1);
    assert.ok(result[2] >= 0.1);
  });

  it('getLightAt returns brighter values near a light', () => {
    const atLight = $('getLightAt(lights[0].x, lights[0].y)');
    const farAway = $('getLightAt(30.5, 0.5)');
    assert.ok(atLight[0] > farAway[0], 'Light at source should be brighter than far away');
  });
});

// ── INIT GAME ──────────────────────────────────────────────────────────────

describe('initGame', () => {
  before(() => {
    $('currentLevel = "main"; initGame()');
  });

  it('resets player position to spawn', () => {
    assert.equal($('player.x'), 2.5);
    assert.equal($('player.y'), 2.5);
    assert.equal($('player.angle'), 0);
  });

  it('resets player health and shield to max', () => {
    assert.equal($('player.health'), 100);
    assert.equal($('player.shield'), 100);
  });

  it('resets weapon ammo', () => {
    assert.equal($('player.weapons[0].ammo'), 32);
    assert.equal($('player.weapons[1].ammo'), 12);
    assert.equal($('player.weapons[2].ammo'), 8);
  });

  it('resets grenades to 4', () => {
    assert.equal($('player.grenades'), 4);
  });

  it('spawns enemies', () => {
    assert.ok($('enemies.length') > 0, 'Should have enemies spawned');
  });

  it('spawns pickups', () => {
    assert.ok($('pickups.length') > 0, 'Should have pickups spawned');
  });

  it('spawns allies', () => {
    assert.ok($('allies.length') > 0, 'Should have allies spawned');
  });

  it('sets gameRunning to true', () => {
    assert.equal($('gameRunning'), true);
  });

  it('clears projectiles, particles, grenades', () => {
    assert.equal($('projectiles.length'), 0);
    assert.equal($('particles.length'), 0);
    assert.equal($('liveGrenades.length'), 0);
  });
});

describe('initGame - Tutorial level', () => {
  before(() => {
    $('currentLevel = "tutorial"; initGame()');
  });

  it('loads tutorial map', () => {
    assert.equal($('mapData[5 * 32 + 5]'), 0);
  });

  it('sets player at tutorial spawn (4.5, 4.5)', () => {
    assert.equal($('player.x'), 4.5);
    assert.equal($('player.y'), 4.5);
  });

  it('spawns tutorial enemies (easy grunts)', () => {
    assert.ok($('enemies.length') > 0);
    const enemies = $('enemies');
    for (const e of enemies) {
      assert.equal(e.type, 'grunt', 'Tutorial enemies should all be grunts');
      assert.equal(e.health, 10, 'Tutorial grunts should have 10 HP');
      assert.equal(e.damage, 1, 'Tutorial grunts should do 1 damage');
    }
  });

  it('spawns tutorial pickups', () => {
    assert.ok($('pickups.length') > 0);
  });

  it('resets tutorial step to 0', () => {
    assert.equal($('tutorialStep'), 0);
  });
});

// ── SQUAD COMMANDS ─────────────────────────────────────────────────────────

describe('Squad commands', () => {
  before(() => {
    $('currentLevel = "main"; initGame()');
  });

  it('issueSquadCommand changes state for all allies', () => {
    $('issueSquadCommand("hold")');
    const allies = $('allies');
    for (const a of allies) {
      assert.equal(a.state, 'hold');
    }
  });

  it('follow command sets allies to follow state', () => {
    $('issueSquadCommand("follow")');
    const allies = $('allies');
    for (const a of allies) {
      assert.equal(a.state, 'follow');
    }
  });
});

// ── RAYCASTER ──────────────────────────────────────────────────────────────

describe('castRay', () => {
  before(() => {
    $('currentLevel = "main"; initGame()');
  });

  it('returns an object with distance and hit info', () => {
    const ray = $('castRay(2.5, 2.5, 0)');
    assert.ok(typeof ray.dist === 'number');
    assert.ok(ray.dist > 0, 'Ray should hit something');
    assert.ok(typeof ray.mapX === 'number');
    assert.ok(typeof ray.mapY === 'number');
    assert.ok(typeof ray.side === 'number');
  });

  it('hitting a nearby wall returns short distance', () => {
    const ray = $(`castRay(2.5, 2.5, -Math.PI / 2)`);
    assert.ok(ray.dist < 3, `Should hit nearby wall, got dist=${ray.dist}`);
  });
});

// ── GESTURE HELPERS ────────────────────────────────────────────────────────

describe('Gesture helpers', () => {
  it('countFingers returns 0 for all-down fingers', () => {
    const result = $(`
      (function() {
        var lm = []; for(var i=0;i<21;i++) lm.push({x:0.5,y:0.5});
        lm[8].y=0.8; lm[6].y=0.6;
        lm[12].y=0.8; lm[10].y=0.6;
        lm[16].y=0.8; lm[14].y=0.6;
        lm[20].y=0.8; lm[18].y=0.6;
        return countFingers(lm);
      })()
    `);
    assert.equal(result, 0);
  });

  it('countFingers returns 4 for all-up fingers', () => {
    const result = $(`
      (function() {
        var lm = []; for(var i=0;i<21;i++) lm.push({x:0.5,y:0.5});
        lm[8].y=0.2; lm[6].y=0.6;
        lm[12].y=0.2; lm[10].y=0.6;
        lm[16].y=0.2; lm[14].y=0.6;
        lm[20].y=0.2; lm[18].y=0.6;
        return countFingers(lm);
      })()
    `);
    assert.equal(result, 4);
  });

  it('isPinch detects thumb-index close together', () => {
    const result = $(`
      (function() {
        var lm = []; for(var i=0;i<21;i++) lm.push({x:0.5,y:0.5});
        lm[4].x=0.5; lm[4].y=0.5; lm[8].x=0.52; lm[8].y=0.52;
        return isPinch(lm);
      })()
    `);
    assert.equal(result, true);
  });

  it('isPinch returns false when thumb-index far apart', () => {
    const result = $(`
      (function() {
        var lm = []; for(var i=0;i<21;i++) lm.push({x:0.5,y:0.5});
        lm[4].x=0.2; lm[4].y=0.2; lm[8].x=0.8; lm[8].y=0.8;
        return isPinch(lm);
      })()
    `);
    assert.equal(result, false);
  });
});

// ── GRENADE / PARTICLE SYSTEM ──────────────────────────────────────────────

describe('Particle system', () => {
  it('spawnParticle adds a particle', () => {
    $('particles = []');
    $('spawnParticle(5, 5, 1, 0, 0, 0, [255, 0, 0], 1.0, 2)');
    assert.equal($('particles.length'), 1);
    const color = $('particles[0].color');
    assert.equal(color[0], 255); assert.equal(color[1], 0); assert.equal(color[2], 0);
  });

  it('updateParticles removes expired particles', () => {
    $('particles = []');
    $('spawnParticle(5, 5, 1, 0, 0, 0, [255, 0, 0], 0.1, 2)');
    $('updateParticles(0.2)');
    assert.equal($('particles.length'), 0);
  });

  it('updateParticles keeps alive particles', () => {
    $('particles = []');
    $('spawnParticle(5, 5, 1, 0, 0, 0, [255, 0, 0], 2.0, 2)');
    $('updateParticles(0.5)');
    assert.equal($('particles.length'), 1);
    assert.ok($('particles[0].life') < 2.0);
  });
});

// ── SOUND SYSTEM ───────────────────────────────────────────────────────────

describe('Sound system', () => {
  it('playSound does not crash for known sound types', () => {
    $('initAudio()');
    const soundTypes = ['shoot', 'shotgun', 'reload', 'hit', 'enemy_die',
      'enemy_shoot', 'plasma', 'pickup', 'door_open', 'shield_regen',
      'explosion', 'grenade_bounce', 'ally_die', 'footstep'];
    for (const type of soundTypes) {
      assert.doesNotThrow(() => $(`playSound("${type}")`), `playSound('${type}') should not crash`);
    }
  });

  it('playSound no-ops without audioCtx', () => {
    $('audioCtx = undefined');
    assert.doesNotThrow(() => $('playSound("shoot")'));
  });
});
