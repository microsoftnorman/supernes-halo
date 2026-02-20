// ═══════════════════════════════════════════════════════════════════
// renderEnemy.js — High-fidelity enemy sprite renderer
// Drop-in replacement for raycasting HALO fan game
// Uses globals: buf, zBuffer, RENDER_W (960), RENDER_H (540), gameTime
// ═══════════════════════════════════════════════════════════════════

function _eH(x, y) {
    var n = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) | 0;
    n = Math.imul(n ^ (n >>> 13), 1274126177) | 0;
    n = Math.imul(n ^ (n >>> 16), 2246822519) | 0;
    return ((n >>> 0) & 0xffff) / 65536;
}

function _eN(x, y) {
    var ix = Math.floor(x), iy = Math.floor(y);
    var fx = x - ix, fy = y - iy;
    var u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    var a = _eH(ix, iy), b = _eH(ix + 1, iy);
    var c = _eH(ix, iy + 1), d = _eH(ix + 1, iy + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

// ── Grunt silhouette ──────────────────────────────────────────────
// Returns body-part id (0 = outside)
//  1=head 2=eyes 3=mask 4=torso 6/7=arms 8/9=legs
// 10=weapon 11=tank 19=weapon-glow
function _gruntShape(ax, ay, wk) {
    if (ay < -0.84 || ay > 0.82 || ax < -0.56 || ax > 0.62) return 0;
    var dx, dy;

    // ── Eyes (two small glowing orbs) ──
    dy = (ay + 0.56) * (ay + 0.56) * 1111;
    dx = (ax + 0.1) * (ax + 0.1) * 625;
    if (dx + dy < 1) return 2;
    dx = (ax - 0.1) * (ax - 0.1) * 625;
    if (dx + dy < 1) return 2;

    // ── Respirator mask ──
    if (ay > -0.5 && ay < -0.36 && ax > -0.2 && ax < 0.2) return 3;

    // ── Head (triangular — narrow top, wider jaw) ──
    if (ay > -0.82 && ay < -0.36) {
        var hw = 0.1 + (ay + 0.82) * 0.43;
        if (ax > -hw && ax < hw) return 1;
    }

    // ── Methane tank on back ──
    dx = (ax - 0.33); dy = (ay + 0.06);
    if (dx * dx / 0.0169 + dy * dy / 0.0576 < 1) return 11;

    // ── Plasma-pistol glow tip ──
    if (ax > 0.48 && ax < 0.57 && ay > 0.03 && ay < 0.14) return 19;

    // ── Plasma pistol body ──
    if (ax > 0.24 && ax < 0.54 && ay > -0.01 && ay < 0.17) return 10;

    // ── Left arm ──
    dx = ax + 0.33 + wk * 0.035; dy = ay + 0.02;
    if (dx * dx / 0.0064 + dy * dy / 0.04 < 1) return 6;

    // ── Right arm (weapon arm) ──
    dx = ax - 0.27 - wk * 0.025; dy = ay + 0.01;
    if (dx * dx / 0.0064 + dy * dy / 0.032 < 1) return 7;

    // ── Torso (hunched barrel) ──
    dx = ax + 0.02; dy = ay + 0.04;
    if (dx * dx / 0.09 + dy * dy / 0.078 < 1) return 4;

    // ── Legs ──
    var lo = wk * 0.045;
    dx = ax + 0.11 + lo; dy = ay - 0.46;
    if (dx * dx / 0.0064 + dy * dy / 0.078 < 1) return 8;
    dx = ax - 0.11 - lo; dy = ay - 0.46;
    if (dx * dx / 0.0064 + dy * dy / 0.078 < 1) return 9;

    // ── Feet (wide stubs) ──
    if (ay > 0.6 && ay < 0.8) {
        if (ax > -0.24 + lo * 0.5 - 0.11 && ax < 0.02 + lo * 0.5 - 0.11) return 8;
        if (ax > -0.02 - lo * 0.5 + 0.11 && ax < 0.24 - lo * 0.5 + 0.11) return 9;
    }
    return 0;
}

// ── Elite silhouette ──────────────────────────────────────────────
// 1=head 2=eyes 4=torso 5=waist 6/7=arms 8/9=legs
// 10=sword-handle 12=crest 13=mandible 19=sword-glow
function _eliteShape(ax, ay, wk) {
    if (ay < -0.96 || ay > 0.88 || ax < -0.5 || ax > 0.82) return 0;
    var dx, dy;

    // ── Head crest (tall angular fin) ──
    if (ay < -0.66 && ay > -0.94) {
        var cw = 0.035 + (ay + 0.94) * 0.5;
        if (ax > -cw && ax < cw) return 12;
    }

    // ── Eyes (narrow horizontal slits, purple glow) ──
    if (ay > -0.67 && ay < -0.615) {
        var abx = ax < 0 ? -ax : ax;
        if (abx > 0.022 && abx < 0.135) return 2;
    }

    // ── Mandibles (split jaw, two angled prongs) ──
    if (ay > -0.57 && ay < -0.41) {
        var mw = 0.05 + (ay + 0.57) * 0.72;
        var abx2 = ax < 0 ? -ax : ax;
        if (abx2 < mw && abx2 > 0.013) return 13;
    }

    // ── Head (elongated oval) ──
    dx = ax / 0.165; dy = (ay + 0.65) / 0.125;
    if (dx * dx + dy * dy < 1) return 1;

    // ── Energy-sword blade glow (tapered, extending right) ──
    if (ax > 0.21 && ax < 0.79) {
        var sy = ay + 0.04 + wk * 0.04;
        var sw = 0.055 - (ax - 0.21) * 0.06;
        if (sw > 0.005 && sy > -sw && sy < sw) return 19;
    }

    // ── Sword handle / hilt ──
    if (ax > 0.15 && ax < 0.25) {
        var hy = ay + 0.04 + wk * 0.04;
        if (hy > -0.06 && hy < 0.06) return 10;
    }

    // ── Left arm ──
    dx = ax + 0.29 + wk * 0.025; dy = ay + 0.08;
    if (dx * dx / 0.0042 + dy * dy / 0.04 < 1) return 6;

    // ── Right arm (weapon arm) ──
    dx = ax - 0.25 - wk * 0.02; dy = ay + 0.04;
    if (dx * dx / 0.0042 + dy * dy / 0.032 < 1) return 7;

    // ── Upper torso (angular: wide shoulders → narrow waist) ──
    if (ay > -0.42 && ay < 0.02) {
        var tw = 0.37 + (ay + 0.42) * (-0.46);
        if (ax > -tw && ax < tw) return 4;
    }

    // ── Waist ──
    if (ay >= 0.02 && ay < 0.13 && ax > -0.155 && ax < 0.155) return 5;

    // ── Upper legs ──
    var lo = wk * 0.055;
    if (ay >= 0.1 && ay < 0.5) {
        dx = ax + 0.085 + lo; dy = ay - 0.3;
        if (dx * dx / 0.0056 + dy * dy / 0.032 < 1) return 8;
        dx = ax - 0.085 - lo;
        if (dx * dx / 0.0056 + dy * dy / 0.032 < 1) return 9;
    }

    // ── Lower legs (digitigrade: offset outward) ──
    if (ay >= 0.44 && ay < 0.83) {
        dx = ax + 0.125 - lo * 0.4; dy = ay - 0.63;
        if (dx * dx / 0.003 + dy * dy / 0.04 < 1) return 8;
        dx = ax - 0.125 + lo * 0.4;
        if (dx * dx / 0.003 + dy * dy / 0.04 < 1) return 9;
    }

    // ── Feet (forward-pointing) ──
    if (ay > 0.74 && ay < 0.87) {
        var fla = ax + 0.125 - lo * 0.4;
        if (fla > -0.09 && fla < 0.09) return 8;
        var fra = ax - 0.125 + lo * 0.4;
        if (fra > -0.09 && fra < 0.09) return 9;
    }
    return 0;
}

// ── Hunter silhouette ─────────────────────────────────────────────
// 1=head 4=body 7=right-arm 8/9=legs
// 14=shield-arm 15=worm-colony 16=cannon 18=collar 19=cannon-glow
function _hunterShape(ax, ay, wk) {
    if (ay < -0.9 || ay > 0.88 || ax < -0.92 || ax > 0.92) return 0;
    var dx, dy;

    // ── Head (tiny, armored) ──
    dx = ax; dy = ay + 0.82;
    if (dx * dx / 0.01 + dy * dy / 0.006 < 1) return 1;

    // ── Worm colony (exposed orange mass, upper back) ──
    dx = ax - 0.24; dy = ay + 0.4;
    if (dx * dx / 0.032 + dy * dy / 0.022 < 1) return 15;

    // ── Fuel-rod cannon muzzle glow ──
    if (ax > 0.72 && ax < 0.9 && ay > -0.27 && ay < -0.13) return 19;

    // ── Fuel-rod cannon barrel ──
    if (ax > 0.35 && ax < 0.82 && ay > -0.3 && ay < -0.1) return 16;

    // ── Shield arm (massive slab on left side) ──
    if (ax < -0.06 && ay > -0.55 && ay < 0.24) {
        var sw = 0.4 - (ay + 0.15) * (ay + 0.15) * 0.55;
        if (sw > 0 && ax > -0.06 - sw) return 14;
    }

    // ── Right arm ──
    dx = ax - 0.33; dy = ay + 0.06;
    if (dx * dx / 0.01 + dy * dy / 0.078 < 1) return 7;

    // ── Collar / shoulder armour ──
    if (ay > -0.74 && ay < -0.46) {
        var cw = 0.36 + (ay + 0.74) * 0.45;
        if (ax > -cw && ax < cw) return 18;
    }

    // ── Main torso (massive barrel) ──
    dx = ax + 0.04; dy = ay + 0.06;
    if (dx * dx / 0.13 + dy * dy / 0.145 < 1) return 4;

    // ── Legs (thick trunk-like) ──
    var lo = wk * 0.028;
    dx = ax + 0.15 + lo; dy = ay - 0.5;
    if (dx * dx / 0.0144 + dy * dy / 0.09 < 1) return 8;
    dx = ax - 0.15 - lo;
    if (dx * dx / 0.0144 + dy * dy / 0.09 < 1) return 9;

    // ── Feet (massive flat bases) ──
    if (ay > 0.66 && ay < 0.86) {
        if (ax + 0.15 + lo > -0.18 && ax + 0.15 + lo < 0.18) return 8;
        if (ax - 0.15 - lo > -0.18 && ax - 0.15 - lo < 0.18) return 9;
    }
    return 0;
}

// ═══════════════════════════════════════════════════════════════════
//                       MAIN RENDERER
// ═══════════════════════════════════════════════════════════════════
function renderEnemy(e, screenX, dist, halfH, pitchOff, lr, lg, lb, fogF) {
    if (!e.alive || dist < 0.15) return;

    var gt = typeof gameTime !== 'undefined' ? gameTime : 0;

    // ── Projection ──
    var iDist  = 1 / dist;
    var pScale = halfH * iDist;
    var sprH   = e.size * 2.4 * pScale;
    var wm     = e.type === 'hunter' ? 1.3 : (e.type === 'elite' ? 0.7 : 0.8);
    var sprW   = sprH * wm;
    if (sprH < 2) return;

    var cenY = halfH + pitchOff;

    // ── Animation ──
    var af   = e.animFrame | 0;
    var br   = Math.sin(gt * 2.5 + dist * 0.7) * 0.012;
    var wk   = Math.sin(gt * 3.5 + af * 1.5708);
    var pls  = Math.sin(gt * 3.5) * 0.5 + 0.5;
    var pls2 = Math.sin(gt * 5.2) * 0.5 + 0.5;

    // ── Screen bounds ──
    var sx0 = (screenX - sprW * 0.5) | 0;
    var sx1 = (screenX + sprW * 0.5 + 1) | 0;
    var sy0 = (cenY - sprH * 0.5) | 0;
    var sy1 = (cenY + sprH * 0.5 + 1) | 0;
    if (sx0 >= RENDER_W || sx1 <= 0 || sy0 >= RENDER_H || sy1 <= 0) return;
    if (sx0 < 0) sx0 = 0;
    if (sx1 > RENDER_W) sx1 = RENDER_W;
    if (sy0 < 0) sy0 = 0;
    if (sy1 > RENDER_H) sy1 = RENDER_H;

    var iW = 2 / sprW, iH = 2 / sprH;

    var hitF = e.hitFlash > 0 ? (e.hitFlash < 1 ? e.hitFlash : 1) : 0;
    var hpR  = e.health / e.maxHealth;

    // ── Constants for lighting ──
    var LX = 0.32, LY = -0.54, LZ = 0.78;           // light direction
    var HX = LX, HY = LY, HZ = LZ + 1;              // half-vector (L + V)
    var hLen = 1 / Math.sqrt(HX * HX + HY * HY + HZ * HZ);
    HX *= hLen; HY *= hLen; HZ *= hLen;

    var fogR = 40, fogG = 45, fogB = 55;

    var isG = e.type === 'grunt';
    var isE = e.type === 'elite';
    // isH implied by neither

    // ── Pixel loop ──
    var px, py, nx, ny, part;
    var bR, bG, bB, emit, met, eR, eG, eB;
    var cn, dx2, dy2, gdx, gdy, gridMin, pMul;
    var ef, nz, ds, ndx, ndy, pS;
    var nnx, nny, nnz, nL;
    var diff, sDot, spec, rim, shade;
    var oR, oG, oB, idx;

    for (px = sx0; px < sx1; px++) {
        if (dist >= zBuffer[px]) continue;
        nx = (px - screenX) * iW;

        for (py = sy0; py < sy1; py++) {
            ny = (py - cenY) * iH + br;

            // ── Shape test ──
            if (isG) part = _gruntShape(nx, ny, wk);
            else if (isE) part = _eliteShape(nx, ny, wk);
            else part = _hunterShape(nx, ny, wk);
            if (!part) continue;

            // ══════════════════════════════════════════════
            //        BASE COLOR + MATERIAL
            // ══════════════════════════════════════════════
            emit = 0; met = 0.3; eR = 0; eG = 0; eB = 0;

            if (isG) {
                switch (part) {
                    case 1:  bR = 180; bG = 115; bB = 45; break;
                    case 2:  bR = 255; bG = 180; bB = 30;
                             emit = 0.88 + pls * 0.12;
                             eR = 255; eG = 190; eB = 40; break;
                    case 3:  bR = 55; bG = 60; bB = 68; met = 0.72; break;
                    case 4:  bR = 185; bG = 118; bB = 38; met = 0.4; break;
                    case 6:  bR = 160; bG = 105; bB = 42; break;
                    case 7:  bR = 155; bG = 100; bB = 40; break;
                    case 8:  bR = 130; bG = 82; bB = 30; break;
                    case 9:  bR = 125; bG = 80; bB = 28; break;
                    case 10: bR = 48; bG = 52; bB = 78; met = 0.82; break;
                    case 11: bR = 95; bG = 100; bB = 112; met = 0.88; break;
                    case 19: bR = 40; bG = 200; bB = 70;
                             emit = 0.65 + pls2 * 0.35;
                             eR = 50; eG = 235; eB = 85; break;
                    default: bR = 150; bG = 100; bB = 40;
                }
            } else if (isE) {
                switch (part) {
                    case 1:  bR = 58; bG = 30; bB = 92; break;
                    case 2:  bR = 200; bG = 100; bB = 255;
                             emit = 0.82 + pls * 0.18;
                             eR = 210; eG = 110; eB = 255; break;
                    case 12: bR = 46; bG = 20; bB = 76; met = 0.55; break;
                    case 13: bR = 165; bG = 65; bB = 225;
                             emit = 0.48 + pls * 0.22;
                             eR = 180; eG = 80; eB = 240; break;
                    case 4:  bR = 72; bG = 42; bB = 132; met = 0.62; break;
                    case 5:  bR = 48; bG = 28; bB = 76; break;
                    case 6:  bR = 62; bG = 36; bB = 112; met = 0.55; break;
                    case 7:  bR = 60; bG = 34; bB = 108; met = 0.55; break;
                    case 8:  bR = 40; bG = 26; bB = 72; break;
                    case 9:  bR = 42; bG = 28; bB = 74; break;
                    case 10: bR = 38; bG = 32; bB = 65; met = 0.9; break;
                    case 19: bR = 75; bG = 175; bB = 255;
                             emit = 0.78 + pls2 * 0.22;
                             eR = 105; eG = 210; eB = 255; break;
                    default: bR = 55; bG = 32; bB = 95;
                }
            } else {
                switch (part) {
                    case 1:  bR = 26; bG = 24; bB = 42; met = 0.7; break;
                    case 4:  bR = 28; bG = 36; bB = 82; met = 0.68; break;
                    case 7:  bR = 32; bG = 34; bB = 68; met = 0.6; break;
                    case 8:  bR = 26; bG = 30; bB = 66; met = 0.52; break;
                    case 9:  bR = 28; bG = 32; bB = 68; met = 0.52; break;
                    case 14: bR = 20; bG = 28; bB = 62; met = 0.92; break;
                    case 15: bR = 255; bG = 135; bB = 22;
                             emit = 0.6 + pls * 0.4;
                             eR = 255; eG = 165; eB = 45; break;
                    case 16: bR = 40; bG = 44; bB = 50; met = 0.86; break;
                    case 18: bR = 28; bG = 34; bB = 78; met = 0.82; break;
                    case 19: bR = 55; bG = 225; bB = 45;
                             emit = 0.72 + pls2 * 0.28;
                             eR = 65; eG = 240; eB = 55; break;
                    default: bR = 28; bG = 34; bB = 68;
                }
            }

            // ══════════════════════════════════════════════
            //        PROCEDURAL SURFACE DETAIL
            // ══════════════════════════════════════════════

            // ── Colour noise (paint/texture variation) ──
            cn = _eN(nx * 5.5 + part * 0.37, ny * 5.5) * 0.22 - 0.11;
            bR += bR * cn;
            bG += bG * cn;
            bB += bB * cn;

            // ── Armour panel lines & rivets ──
            pMul = 1;
            if (met > 0.38 && emit < 0.25) {
                ds = 9;
                gdx = nx * ds; gdy = ny * ds;
                gdx = Math.abs(gdx - Math.round(gdx));
                gdy = Math.abs(gdy - Math.round(gdy));
                gridMin = gdx < gdy ? gdx : gdy;
                if (gridMin < 0.055) pMul = 0.78;
                else if (gdx < 0.075 && gdy < 0.075) pMul = 1.2;
            }

            // ══════════════════════════════════════════════
            //        PSEUDO-3D NORMAL
            // ══════════════════════════════════════════════
            ef = nx * nx * 1.15 + ny * ny * 0.85;
            nz = Math.sqrt(ef < 0.94 ? 1 - ef : 0.06);

            // Noise-based normal perturbation (micro-detail)
            ds = 11;
            ndx = _eN(nx * ds + 0.35, ny * ds) - _eN(nx * ds - 0.35, ny * ds);
            ndy = _eN(nx * ds, ny * ds + 0.35) - _eN(nx * ds, ny * ds - 0.35);
            pS = met > 0.5 ? 0.14 : 0.09;

            nnx = nx * 0.42 + ndx * pS;
            nny = ny * 0.42 + ndy * pS;
            nnz = nz;
            nL = 1 / (Math.sqrt(nnx * nnx + nny * nny + nnz * nnz) || 1);
            nnx *= nL; nny *= nL; nnz *= nL;

            // ══════════════════════════════════════════════
            //        LIGHTING MODEL
            // ══════════════════════════════════════════════

            // Lambert diffuse
            diff = nnx * LX + nny * LY + nnz * LZ;
            if (diff < 0) diff = 0;

            // Blinn-Phong specular
            sDot = nnx * HX + nny * HY + nnz * HZ;
            if (sDot < 0) sDot = 0;
            spec = sDot;
            // pow approximation: spec^N via repeated squaring
            if (met > 0.6) {
                // spec^48 ≈ (spec^6)^8
                spec = spec * spec * spec; spec = spec * spec; // ^6
                spec = spec * spec; spec = spec * spec; spec = spec * spec; // ^48
            } else {
                // spec^24 ≈ (spec^6)^4
                spec = spec * spec * spec; spec = spec * spec; // ^6
                spec = spec * spec; spec = spec * spec; // ^24
            }
            spec *= met;

            // Rim lighting (Fresnel-like)
            rim = 1 - nnz;
            rim = rim * rim * rim * 0.52;

            // Subsurface scattering for organic parts (worms, mandibles)
            var sss = 0;
            if (part === 15 || part === 13) {
                var bd = -(nnx * LX + nny * LY + nnz * LZ);
                if (bd > 0) sss = bd * 0.35;
            }

            shade = 0.11 + diff * 0.72;

            // ── Combine base shading ──
            oR = bR * shade * pMul + spec * 175 + rim * 52;
            oG = bG * shade * pMul + spec * 180 + rim * 58;
            oB = bB * shade * pMul + spec * 195 + rim * 72;

            // Environment light colour
            oR *= lr;
            oG *= lg;
            oB *= lb;

            // Emissive (partially independent of environment)
            if (emit > 0) {
                oR += emit * eR * (0.55 + 0.45 * lr);
                oG += emit * eG * (0.55 + 0.45 * lg);
                oB += emit * eB * (0.55 + 0.45 * lb);
            }

            // Sub-surface scattering contribution
            if (sss > 0) {
                oR += sss * eR * 0.45;
                oG += sss * eG * 0.45;
                oB += sss * eB * 0.45;
            }

            // ══════════════════════════════════════════════
            //        ELITE SHIELD SHIMMER
            // ══════════════════════════════════════════════
            if (isE && part !== 19 && part !== 10) {
                var sDst = nx * nx + ny * ny;
                if (sDst < 0.75) {
                    // Hex-like interference pattern
                    var hF = 16;
                    var h1 = Math.sin(nx * hF + gt * 2.2) *
                             Math.cos(ny * hF * 1.732 + gt * 1.1);
                    var h2 = Math.cos(nx * hF * 0.866 - gt * 1.5) *
                             Math.sin(ny * hF + gt * 0.8);
                    var shimmer = h1 + h2;
                    if (shimmer > 0) {
                        var sEdge = sDst > 0.3 ? (sDst - 0.3) * 2.2 : 0;
                        var sFx = shimmer * sEdge * pls * 0.22;
                        oR += sFx * 35;
                        oG += sFx * 18;
                        oB += sFx * 75;
                    }
                }
            }

            // ══════════════════════════════════════════════
            //    HUNTER SHIELD-ARM SCRATCHES / WEAR
            // ══════════════════════════════════════════════
            if (part === 14) {
                var scr = _eN(nx * 18, ny * 22);
                if (scr > 0.72) {
                    var scrI = (scr - 0.72) * 3.6;
                    oR += scrI * 25 * lr;
                    oG += scrI * 28 * lg;
                    oB += scrI * 35 * lb;
                }
            }

            // ══════════════════════════════════════════════
            //        HIT FLASH (energy dissipation)
            // ══════════════════════════════════════════════
            if (hitF > 0) {
                var hp = _eN(nx * 6.5 + gt * 4.5, ny * 6.5 - gt * 2.5);
                var hMask = hp > (1 - hitF * 1.35) ? 1 : 0.25;
                var hStr = hitF * hMask;

                // Bright flash core
                oR += (285 - oR) * hStr * 0.68;
                oG += (250 - oG) * hStr * 0.52;
                oB += (210 - oB) * hStr * 0.38;

                // Electric crackle lines
                var crack = _eN(nx * 24 + gt * 12, ny * 24 - gt * 8);
                if (crack > 0.82) {
                    var ci = (crack - 0.82) * 5.6 * hitF;
                    oR += ci * 120;
                    oG += ci * 140;
                    oB += ci * 220;
                }
            }

            // ══════════════════════════════════════════════
            //              FOG
            // ══════════════════════════════════════════════
            oR += (fogR - oR) * fogF;
            oG += (fogG - oG) * fogF;
            oB += (fogB - oB) * fogF;

            // ── Write pixel ──
            idx = (py * RENDER_W + px) << 2;
            buf[idx]     = oR;
            buf[idx | 1] = oG;
            buf[idx | 2] = oB;
            buf[idx | 3] = 255;
        }
    }

    // ══════════════════════════════════════════════════════════════
    //                    HEALTH BAR
    // ══════════════════════════════════════════════════════════════
    if (hpR < 1) {
        var barW  = sprW * 0.55 | 0;
        if (barW < 14) barW = 14;
        if (barW > 80) barW = 80;
        var barH  = sprH * 0.024 | 0;
        if (barH < 3) barH = 3;
        if (barH > 6) barH = 6;

        var bx0 = (screenX - barW * 0.5) | 0;
        var bx1 = bx0 + barW;
        var by0 = sy0 - barH - 5;
        var by1 = by0 + barH;

        if (bx0 < 0) bx0 = 0;
        if (bx1 > RENDER_W) bx1 = RENDER_W;
        if (by0 < 0) by0 = 0;
        if (by1 > RENDER_H) by1 = RENDER_H;

        var iBarW = 1 / barW;
        var bx, by, fill;
        for (by = by0; by < by1; by++) {
            var isEdge = (by === by0 || by === by1 - 1) ? 0.6 : 1;
            for (bx = bx0; bx < bx1; bx++) {
                fill = (bx - bx0 + 0.5) * iBarW;
                idx = (by * RENDER_W + bx) << 2;

                if (fill <= hpR) {
                    // Health gradient: green → yellow → red
                    var gR, gG, gB;
                    if (hpR > 0.55) {
                        // Green
                        gR = 35; gG = 210; gB = 55;
                    } else if (hpR > 0.28) {
                        // Yellow
                        var t = (hpR - 0.28) / 0.27;
                        gR = 225 - 190 * t | 0;
                        gG = 175 + 35 * t | 0;
                        gB = 22;
                    } else {
                        // Red
                        gR = 225; gG = 38; gB = 22;
                    }
                    // Bright top edge (glossy bar)
                    if (by === by0 + 1 || (barH > 4 && by === by0 + 2)) {
                        gR = gR + (255 - gR) * 0.28 | 0;
                        gG = gG + (255 - gG) * 0.28 | 0;
                        gB = gB + (255 - gB) * 0.15 | 0;
                    }
                    buf[idx]     = gR * isEdge | 0;
                    buf[idx | 1] = gG * isEdge | 0;
                    buf[idx | 2] = gB * isEdge | 0;
                    buf[idx | 3] = 225;
                } else {
                    // Depleted region (dark)
                    buf[idx]     = 16;
                    buf[idx | 1] = 16;
                    buf[idx | 2] = 18;
                    buf[idx | 3] = 140;
                }

                // Outer border (1px dark frame)
                if (bx === bx0 || bx === bx1 - 1 || by === by0 || by === by1 - 1) {
                    buf[idx] = 8; buf[idx | 1] = 8; buf[idx | 2] = 10;
                    buf[idx | 3] = 200;
                }
            }
        }
    }
}
