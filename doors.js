// ============================================================
// DOOR SYSTEM — State Tracking
// ============================================================

const doors = new Map();

const DOOR_OPEN_SPEED = 1.0 / 0.6;   // 0→1 in 0.6 seconds
const DOOR_CLOSE_SPEED = 1.0 / 0.6;  // 1→0 in 0.6 seconds
const DOOR_STAY_OPEN_TIME = 4.0;     // seconds door stays open before closing
const DOOR_INTERACT_RANGE = 2.5;     // max distance to open a door with E
const DOOR_PROXIMITY_RANGE = 1.0;    // auto-open when player walks near
const DOOR_BLOCK_CLOSE_RANGE = 1.5;  // don't close if player is this close

// ============================================================
// initDoors() — Scan mapData for tile-3 cells, create entries
// ============================================================

function initDoors() {
  doors.clear();
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      if (mapData[y * MAP_W + x] === 3) {
        const key = x + "," + y;
        doors.set(key, {
          x: x,
          y: y,
          state: "closed",
          openAmount: 0,  // 0 = fully closed, 1 = fully open
          timer: 0
        });
      }
    }
  }
}

// ============================================================
// updateDoors(dt) — Animate door open/close, handle timers
// ============================================================

function updateDoors(dt) {
  const px = player.x;
  const py = player.y;

  doors.forEach(function (door) {
    switch (door.state) {

      case "opening":
        door.openAmount += DOOR_OPEN_SPEED * dt;
        if (door.openAmount >= 1) {
          door.openAmount = 1;
          door.state = "open";
          door.timer = DOOR_STAY_OPEN_TIME;
        }
        break;

      case "open":
        door.timer -= dt;
        if (door.timer <= 0) {
          // Check if player is too close to allow closing
          var dx = (door.x + 0.5) - px;
          var dy = (door.y + 0.5) - py;
          var dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > DOOR_BLOCK_CLOSE_RANGE) {
            door.state = "closing";
          } else {
            // Retry next frame
            door.timer = 0.25;
          }
        }
        break;

      case "closing":
        // Abort closing if player moved into range
        var cdx = (door.x + 0.5) - px;
        var cdy = (door.y + 0.5) - py;
        var cdist = Math.sqrt(cdx * cdx + cdy * cdy);
        if (cdist <= DOOR_BLOCK_CLOSE_RANGE) {
          door.state = "opening";
          break;
        }
        door.openAmount -= DOOR_CLOSE_SPEED * dt;
        if (door.openAmount <= 0) {
          door.openAmount = 0;
          door.state = "closed";
        }
        break;

      // "closed" — nothing to do
    }
  });
}

// ============================================================
// tryOpenDoor() — Called on E press, opens nearest closed door
// ============================================================

function tryOpenDoor() {
  var px = player.x;
  var py = player.y;
  var bestDoor = null;
  var bestDist = Infinity;

  doors.forEach(function (door) {
    if (door.state !== "closed") return;
    var dx = (door.x + 0.5) - px;
    var dy = (door.y + 0.5) - py;
    var dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < DOOR_INTERACT_RANGE && dist < bestDist) {
      bestDist = dist;
      bestDoor = door;
    }
  });

  if (bestDoor) {
    bestDoor.state = "opening";
    playSound("door_open");
  }
}

// ============================================================
// Auto-open doors when player walks near (within 1.0 tile)
// Called from updatePlayer each frame
// ============================================================

function autoOpenNearbyDoors() {
  var px = player.x;
  var py = player.y;

  doors.forEach(function (door) {
    if (door.state !== "closed") return;
    var dx = (door.x + 0.5) - px;
    var dy = (door.y + 0.5) - py;
    var dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < DOOR_PROXIMITY_RANGE) {
      door.state = "opening";
      playSound("door_open");
    }
  });
}

// ============================================================
// isDoorOpen(x, y) — Returns true if door is passable
// ============================================================

function isDoorOpen(x, y) {
  var door = doors.get(x + "," + y);
  if (!door) return false;
  return door.openAmount > 0.5;
}

// ============================================================
// getMap override — Open doors return 0 (empty) for raycasting
// ============================================================

var _originalGetMap = getMap;

getMap = function (x, y) {
  if (x < 0 || x >= MAP_W || y < 0 || y >= MAP_H) return 1;
  var val = mapData[y * MAP_W + x];
  if (val === 3) {
    var door = doors.get(x + "," + y);
    if (door && door.openAmount > 0.7) {
      return 0;
    }
  }
  return val;
};

// ============================================================
// getDoorOpenAmount(x, y) — For renderer to query slide offset
// ============================================================

function getDoorOpenAmount(x, y) {
  var door = doors.get(x + "," + y);
  if (!door) return 0;
  return door.openAmount;
}

// ============================================================
// Door rendering helpers
// ============================================================

// Call this from your wall-column renderer when the hit tile is 3.
// Returns an object: { skip: bool, uOffset: number }
//   skip      — if true, don't draw this column (door fully open)
//   uOffset   — add this to the texture U coordinate (0-1 range)
function getDoorRenderInfo(mapX, mapY) {
  var door = doors.get(mapX + "," + mapY);
  if (!door) return { skip: false, uOffset: 0 };
  if (door.openAmount > 0.9) return { skip: true, uOffset: 0 };
  return { skip: false, uOffset: door.openAmount };
}

// ============================================================
// Sound — door_open case (add inside your existing playSound)
// Mechanical sliding sound: rising freq sweep 100→400 Hz, 0.3s
// ============================================================

// Patch playSound to handle door_open.
// If playSound already exists, wrap it; otherwise define a stub.
var _originalPlaySound = (typeof playSound === "function") ? playSound : null;

playSound = function (name) {
  if (name === "door_open") {
    try {
      // Use existing AudioContext or create one
      var ctx = window._audioCtx || (window._audioCtx = new (window.AudioContext || window.webkitAudioContext)());

      var osc = ctx.createOscillator();
      var gain = ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(100, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(400, ctx.currentTime + 0.3);

      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
    } catch (e) {
      // Audio not available, silently ignore
    }
    return;
  }

  // Fall through to original playSound for all other sounds
  if (_originalPlaySound) {
    _originalPlaySound(name);
  }
};

// ============================================================
// Integration — E key handler and per-frame auto-open
// Paste these calls into your updatePlayer function:
//
//   // At the top of updatePlayer or in your input handler:
//   if (keys["KeyE"] || keys["e"] || keys["E"]) {
//     tryOpenDoor();
//     keys["CodeE"] = false; // consume the key press
//   }
//
//   // Every frame inside updatePlayer:
//   autoOpenNearbyDoors();
//
// And call updateDoors(dt) from your main game loop.
// Call initDoors() once after mapData is loaded.
// ============================================================
