
import type { World } from '../../types';
import { get } from '../ecs';
import type { StateMachine, Transform, Health, Boss, Palette } from '../components';

const p = 4; // Elite Pixel Size

/**
 * Pixel-perfect block drawer
 */
const drawPart = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, c: string | CanvasGradient) => {
    ctx.fillStyle = c;
    ctx.fillRect(Math.floor(x * p), Math.floor(y * p), Math.ceil(w * p), Math.ceil(h * p));
};

/**
 * Broad, heavy gorilla foot
 */
const drawFoot = (ctx: CanvasRenderingContext2D, x: number, y: number, pal: Palette, isBack: boolean) => {
    const skin = isBack ? pal.skin_shadow : pal.skin;
    const fur = isBack ? pal.fur_shadow : pal.fur_dark;
    
    // Hairy massive heel
    drawPart(ctx, x - 2, y - 6, 20, 10, fur);
    
    // Broad skin base
    drawPart(ctx, x - 4, y + 4, 30, 10, skin);
    // Large chunky toe segments
    drawPart(ctx, x + 18, y + 4, 12, 10, skin);
    // Depth/Toe gap shading
    drawPart(ctx, x + 16, y + 6, 2, 8, isBack ? pal.skin_shadow : 'rgba(0,0,0,0.2)');
};

/**
 * Titan Arm: Stacked muscle geometry for shoulder, bicep, and forearm
 */
const drawArm = (ctx: CanvasRenderingContext2D, sx: number, sy: number, hx: number, hy: number, pal: Palette, isBack: boolean) => {
    const fur = isBack ? pal.fur_shadow : pal.fur_dark;
    const skin = isBack ? pal.skin_shadow : pal.skin;
    const highlight = 'rgba(255,255,255,0.15)';
    
    const dx = hx - sx;
    const dy = hy - sy;
    const dist = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx);

    // 1. MASSIVE SHOULDER MUSCLE (Top corner anchor)
    drawPart(ctx, sx - 16, sy - 16, 32, 32, fur);
    drawPart(ctx, sx - 10, sy - 17, 22, 6, highlight);

    ctx.save();
    ctx.translate(sx * p, sy * p);
    ctx.rotate(angle);
    
    // 2. BULGING BICEP
    ctx.fillStyle = fur;
    ctx.fillRect(0, -14 * p, (dist * 0.5) * p, 28 * p);
    drawPart(ctx, 4, -15, (dist * 0.4), 4, highlight);
    
    // 3. GIANT FOREARM (Forearm is thicker than bicep in sprites)
    ctx.translate((dist * 0.4) * p, 0);
    ctx.fillStyle = fur;
    ctx.fillRect(0, -18 * p, (dist * 0.7) * p, 36 * p);
    drawPart(ctx, 4, -17, (dist * 0.55), 6, highlight);
    
    ctx.restore();
    
    // 4. MASSIVE FIST
    drawPart(ctx, hx - 18, hy - 18, 36, 36, fur); // Wrist fur
    drawPart(ctx, hx - 16, hy - 16, 32, 32, skin); // Hand skin
    // Knuckle details
    drawPart(ctx, hx - 4, hy - 14, 4, 28, 'rgba(0,0,0,0.1)');
    drawPart(ctx, hx + 6, hy - 14, 4, 28, 'rgba(0,0,0,0.1)');
};

/**
 * Iconic DK head with hair tuft and tracking eyes
 */
const drawHead = (ctx: CanvasRenderingContext2D, w: World, e: number, pal: Palette, x: number, y: number, isRoaring: boolean, isHurt: boolean) => {
    const t = get<Transform>(w, 'transform', e);
    if (!t) return;
    
    // THE SIGNATURE HAIR SWIRL
    drawPart(ctx, x + 8, y - 8, 10, 10, pal.fur_dark);
    drawPart(ctx, x + 11, y - 12, 6, 6, pal.fur_dark);
    drawPart(ctx, x + 13, y - 15, 4, 4, pal.fur_dark);
    drawPart(ctx, x + 14, y - 18, 2, 2, pal.fur_dark);

    // MASSIVE TRAPS (The "Bodybuilder" Neck)
    drawPart(ctx, x + 2, y + 14, 24, 18, pal.fur_shadow);

    // HEAD VOLUME
    drawPart(ctx, x + 1, y, 26, 22, pal.fur_shadow);
    drawPart(ctx, x + 2, y - 1, 24, 21, pal.fur_dark);
    
    // TAN MUZZLE (Significant protrusion)
    drawPart(ctx, x - 2, y + 11, 30, 15, pal.skin_shadow);
    drawPart(ctx, x - 1, y + 11, 28, 14, pal.skin);
    
    // THE BROW (Angry look)
    drawPart(ctx, x, y + 9, 26, 7, pal.fur_shadow);

    // EYES
    const eyeY = y + 12;
    if (isHurt) {
        drawPart(ctx, x + 6, eyeY + 1, 6, 2, 'black');
        drawPart(ctx, x + 18, eyeY + 1, 6, 2, 'black');
    } else {
        drawPart(ctx, x + 6, eyeY, 8, 6, pal.eye_white);
        drawPart(ctx, x + 17, eyeY, 8, 6, pal.eye_white);
        
        let pOX = 0, pOY = 0;
        const playerT = get<Transform>(w, 'transform', w.playerId);
        if (playerT) {
             const hWX = t.pos.x + t.size.x / 2;
             const hWY = t.pos.y + (y + 13) * p;
             const pCX = playerT.pos.x + playerT.size.x / 2;
             const pCY = playerT.pos.y + playerT.size.y / 2;
             const dx = pCX - hWX, dy = pCY - hWY;
             const dist = Math.hypot(dx, dy) || 1;
             pOX = Math.max(-2, Math.min(2, (dx / dist) * 4)) * t.facing;
             pOY = Math.max(-2, Math.min(2, (dy / dist) * 4));
        }
        drawPart(ctx, x + 9 + pOX, eyeY + 1 + pOY, 3, 4, pal.eye_pupil);
        drawPart(ctx, x + 19 + pOX, eyeY + 1 + pOY, 3, 4, pal.eye_pupil);
    }
    
    // MOUTH & TEETH
    if (isRoaring) {
        drawPart(ctx, x + 4, y + 22, 22, 10, pal.mouth_dark);
        drawPart(ctx, x + 4, y + 22, 22, 2, pal.tooth);
        drawPart(ctx, x + 4, y + 30, 22, 2, pal.tooth);
    } else {
        drawPart(ctx, x + 4, y + 22, 22, 5, pal.mouth_dark);
        drawPart(ctx, x + 5, y + 23, 20, 2, pal.tooth);
    }
};

/**
 * Large red tie with yellow DK branding
 */
const drawTieLogo = (ctx: CanvasRenderingContext2D, x: number, y: number, pal: Palette) => {
    drawPart(ctx, x - 7, y - 5, 14, 12, pal.tie_shadow);
    drawPart(ctx, x - 6, y - 5, 12, 10, pal.tie);
    
    ctx.save();
    ctx.fillStyle = '#facc15';
    ctx.font = `bold ${16}px Arial Black, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowBlur = 4;
    ctx.shadowColor = 'black';
    ctx.fillText('DK', x * p, (y + 1) * p);
    ctx.restore();
};

const drawPecs = (ctx: CanvasRenderingContext2D, bodyY: number, pal: Palette) => {
    // Massive Gorilla Pectorals (Wide silhouette)
    drawPart(ctx, 12, bodyY + 8, 28, 34, pal.skin_shadow);
    drawPart(ctx, 13, bodyY + 9, 26, 32, pal.skin);
    drawPart(ctx, 44, bodyY + 8, 28, 34, pal.skin_shadow);
    drawPart(ctx, 45, bodyY + 9, 26, 32, pal.skin);
};

const drawIdlePose = (ctx: CanvasRenderingContext2D, w: World, e: number, s: StateMachine, pal: Palette) => {
    const breath = Math.sin(s.animTime * 1.6) * 2.5;
    const bodyY = 14 + breath;

    // Ordered rendering for depth
    drawFoot(ctx, 10, 62, pal, true); // Back foot

    // TITAN TORSO
    drawPart(ctx, 6, bodyY, 72, 52, pal.fur_shadow);
    drawPart(ctx, 8, bodyY, 68, 50, pal.fur_dark);
    drawPecs(ctx, bodyY, pal);
    // Lower Belly Mass
    drawPart(ctx, 20, bodyY + 32, 44, 20, pal.skin_shadow);
    drawPart(ctx, 21, bodyY + 32, 42, 18, pal.skin);

    drawFoot(ctx, 58, 62, pal, false); // Front foot
    
    // ARMS (Ultra wide shoulder anchor, hunched posture)
    drawArm(ctx, 10, bodyY + 18, -10, bodyY + 48, pal, true); // Back arm
    drawArm(ctx, 74, bodyY + 18, 92, bodyY + 48, pal, false); // Front arm

    const headX = 30;
    const headY = bodyY - 26;
    drawTieLogo(ctx, headX + 15, headY + 28, pal);
    drawHead(ctx, w, e, pal, headX, headY, false, false);
};

const drawThrowPose = (ctx: CanvasRenderingContext2D, w: World, e: number, s: StateMachine, pal: Palette) => {
    const windup = Math.min(1, s.animTime / 0.7);
    const bodyY = 18;
    
    drawFoot(ctx, 10, 62, pal, true);
    drawFoot(ctx, 58, 62, pal, false);

    drawPart(ctx, 6, bodyY, 72, 52, pal.fur_shadow);
    drawPart(ctx, 8, bodyY, 68, 50, pal.fur_dark);
    drawPecs(ctx, bodyY, pal);

    // GIANT POWER WINDUP
    const backArmX = 10 - windup * 55;
    const backArmY = bodyY - 30 + windup * 30;
    drawArm(ctx, 10, bodyY + 18, backArmX, backArmY, pal, true);

    // Bracing arm
    drawArm(ctx, 74, bodyY + 18, 88, bodyY + 55, pal, false);

    const headX = 30;
    const headY = bodyY - 26;
    drawTieLogo(ctx, headX + 15, headY + 28, pal);
    drawHead(ctx, w, e, pal, headX, headY, true, false);
};

const drawBananaThrowPose = (ctx: CanvasRenderingContext2D, w: World, e: number, s: StateMachine, pal: Palette) => {
    const throwProg = s.animTime / 0.3;
    const bodyY = 18;
    
    drawFoot(ctx, 10, 62, pal, true);
    drawFoot(ctx, 58, 62, pal, false);

    drawPart(ctx, 6, bodyY, 72, 52, pal.fur_shadow);
    drawPart(ctx, 8, bodyY, 68, 50, pal.fur_dark);
    drawPecs(ctx, bodyY, pal);

    drawArm(ctx, 10, bodyY + 18, 6, bodyY + 55, pal, true);

    const armX = 74 + Math.cos(throwProg * Math.PI) * 50;
    const armY = bodyY + 15 - Math.sin(throwProg * Math.PI) * 40;
    drawArm(ctx, 74, bodyY + 18, armX, armY, pal, false);

    const headX = 30;
    const headY = bodyY - 26;
    drawTieLogo(ctx, headX + 15, headY + 28, pal);
    drawHead(ctx, w, e, pal, headX, headY, true, false);
};

const drawRoarPose = (ctx: CanvasRenderingContext2D, w: World, e: number, s: StateMachine, pal: Palette) => {
    const bodyY = 16;
    
    drawFoot(ctx, 10, 62, pal, true);
    drawFoot(ctx, 58, 62, pal, false);
    
    drawPart(ctx, 6, bodyY, 72, 52, pal.fur_shadow);
    drawPart(ctx, 8, bodyY, 68, 50, pal.fur_dark);
    drawPecs(ctx, bodyY, pal);
    
    // HEAVY CHEST POUNDING
    const pound = Math.sin(s.animTime * 24) > 0;
    const lhx = pound ? 42 : -10;
    const rhx = pound ? 44 : 95;
    drawArm(ctx, 10, bodyY + 18, lhx, bodyY + 14, pal, true);
    drawArm(ctx, 74, bodyY + 18, rhx, bodyY + 14, pal, false);

    drawHead(ctx, w, e, pal, 30, bodyY - 26, true, false);
    drawTieLogo(ctx, 30 + 15, bodyY - 26 + 28, pal);
};

const drawPoundAnticipation = (ctx: CanvasRenderingContext2D, w: World, e: number, s: StateMachine, pal: Palette) => {
    const bodyY = 30;
    
    drawFoot(ctx, 20, 60, pal, true);
    drawFoot(ctx, 62, 60, pal, false);

    drawPart(ctx, 6, bodyY, 72, 52, pal.fur_shadow);
    drawPart(ctx, 8, bodyY, 68, 50, pal.fur_dark);
    drawPecs(ctx, bodyY, pal);

    // ARMS RAISED TO THE HEAVENS
    drawArm(ctx, 10, bodyY + 18, 5, bodyY - 65, pal, true);
    drawArm(ctx, 74, bodyY + 18, 80, bodyY - 65, pal, false);

    const headX = 30;
    const headY = bodyY - 22;
    drawTieLogo(ctx, headX + 15, headY + 28, pal);
    drawHead(ctx, w, e, pal, headX, headY, true, false);
};

const drawPounding = (ctx: CanvasRenderingContext2D, w: World, e: number, s: StateMachine, pal: Palette) => {
    const squash = Math.max(0, 1 - (s.animTime / 0.5)) * 12;
    const bodyY = 34 + squash;
    
    drawFoot(ctx, 6, 62, pal, true);
    drawFoot(ctx, 66, 62, pal, false);

    drawPart(ctx, 6, bodyY, 72, 52 - squash, pal.fur_shadow);
    drawPart(ctx, 8, bodyY, 68, 50 - squash, pal.fur_dark);
    drawPecs(ctx, bodyY, pal);

    // CRUSHING DOWNWARD SLAM
    drawArm(ctx, 10, bodyY + 18, -25, bodyY + 70, pal, true);
    drawArm(ctx, 74, bodyY + 18, 110, bodyY + 70, pal, false);

    const headX = 30;
    const headY = bodyY - 22;
    drawTieLogo(ctx, headX + 15, headY + 28, pal);
    drawHead(ctx, w, e, pal, headX, headY, true, false);
};

const drawHurt = (ctx: CanvasRenderingContext2D, w: World, e: number, s: StateMachine, pal: Palette) => {
    const recoil = Math.sin(s.animTime * 38) * -10;
    const bodyY = 22 + recoil;
    
    drawFoot(ctx, 10, 62, pal, true);
    drawFoot(ctx, 58, 62, pal, false);

    drawPart(ctx, 6, bodyY, 72, 52, pal.fur_shadow);
    drawPart(ctx, 8, bodyY, 68, 50, pal.fur_dark);
    drawPecs(ctx, bodyY, pal);
    
    // MASSIVE LIMBS FLAILING
    drawArm(ctx, 10, bodyY + 18, -45, bodyY - 45, pal, true);
    drawArm(ctx, 74, bodyY + 18, 125, bodyY - 45, pal, false);

    const headX = 30;
    const headY = bodyY - 24;
    drawTieLogo(ctx, headX + 15, headY + 28, pal);
    drawHead(ctx, w, e, pal, headX, headY, false, true);
};

const drawRollChargePose = (ctx: CanvasRenderingContext2D, w: World, s: StateMachine, pal: Palette) => {
    ctx.save();
    const rot = s.animTime * 35;
    ctx.translate(55 * p, 55 * p);
    ctx.rotate(rot);
    ctx.translate(-55 * p, -55 * p);
    
    // Rotating fur sphere
    const cx = 55, cy = 55, r = 50;
    drawPart(ctx, cx - r/2, cy - r, r, r*2, pal.fur_shadow);
    drawPart(ctx, cx - r, cy - r/2, r*2, r, pal.fur_shadow);
    const inner_r = r - 10;
    drawPart(ctx, cx - inner_r/2, cy - inner_r, inner_r, inner_r*2, pal.fur_dark);
    drawPart(ctx, cx - inner_r, cy - inner_r/2, inner_r*2, inner_r, pal.fur_dark);
    
    // Swirling tie
    const swirlAngle = s.animTime * 45;
    drawPart(ctx, cx + Math.cos(swirlAngle) * 30, cy + Math.sin(swirlAngle) * 30, 24, 24, pal.tie);
    ctx.restore();
};

const drawDefeatedPose = (ctx: CanvasRenderingContext2D, w: World, e: number, s: StateMachine, pal: Palette) => {
    const fallProgress = Math.min(1, s.animTime / 1.5);
    const groundY = 20;
    ctx.save();
    ctx.translate(55 * p, (groundY + 45) * p);
    ctx.rotate(fallProgress * Math.PI / 2);
    ctx.translate(-55 * p, -(groundY + 45) * p);
    
    if (fallProgress < 1) {
        drawHurt(ctx, w, e, s, pal);
    } else {
        const bodyY = groundY + 25;
        drawFoot(ctx, 4, bodyY + 50, pal, true);
        drawFoot(ctx, 65, bodyY + 50, pal, false);
        drawPart(ctx, 6, bodyY, 72, 52, pal.fur_shadow);
        drawPart(ctx, 8, bodyY, 68, 50, pal.skin_shadow);
        
        // Limp, giant arms
        drawArm(ctx, 10, bodyY + 18, -15, bodyY + 80, pal, true);
        drawArm(ctx, 74, bodyY + 18, 105, bodyY + 80, pal, false);
        
        const headX = 30, headY = bodyY - 26;
        drawPart(ctx, headX, headY, 34, 32, pal.fur_dark);
        drawPart(ctx, headX + 8, headY + 14, 8, 4, 'black');
        drawPart(ctx, headX + 24, headY + 14, 8, 4, 'black');
    }
    ctx.restore();
}

export const dkPainter = (ctx: CanvasRenderingContext2D, w: World, e: number) => {
    const t = get<Transform>(w, 'transform', e);
    const s = get<StateMachine>(w, 'state', e);
    const h = get<Health>(w, 'health', e);
    const boss = get<Boss>(w, 'boss', e);
    const pal = get<Palette>(w, 'palette', e);
    if (!t || !s || !h || !boss || !pal) return;

    const centerX = t.pos.x + t.size.x / 2;
    const gY = t.groundY > 0 ? t.groundY : t.pos.y + t.size.y;
    const shadowWidth = t.size.x * 0.65 * (1 - Math.min(1, (gY - (t.pos.y + t.size.y)) / 550));
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(centerX, gY, shadowWidth, shadowWidth * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    const drawingWidth = 110 * p;
    const xOffset = (t.size.x - drawingWidth) / 2;
    ctx.translate(t.facing === -1 ? t.size.x : 0, 0);
    ctx.scale(t.facing, 1);
    ctx.translate(xOffset, 0);

    // Damage flash logic
    if (boss.state === 'hurt' || (s.invulnFrames > 0 && boss.state !== 'dying' && Math.floor(w.time * 30) % 2 === 0)) {
        ctx.filter = 'brightness(2.5) contrast(0.5)';
    }

    switch (boss.state) {
        case 'intro':
            if (t.onGround) drawRoarPose(ctx, w, e, s, pal);
            else drawPoundAnticipation(ctx, w, e, s, pal);
            break;
        case 'jumping':
        case 'pounding_anticipation':
            drawPoundAnticipation(ctx, w, e, s, pal);
            break;
        case 'pounding':
            drawPounding(ctx, w, e, s, pal);
            break;
        case 'barrel_throw':
        case 'coconut_toss':
            drawThrowPose(ctx, w, e, s, pal);
            break;
        case 'banana_throw':
            drawBananaThrowPose(ctx, w, e, s, pal);
            break;
        case 'roll_charge':
            drawRollChargePose(ctx, w, s, pal);
            break;
        case 'hurt':
            drawHurt(ctx, w, e, s, pal);
            break;
        case 'dying':
            drawDefeatedPose(ctx, w, e, s, pal);
            break;
        case 'idle':
        default:
            drawIdlePose(ctx, w, e, s, pal);
            break;
    }
    ctx.restore();
};
