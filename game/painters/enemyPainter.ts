
import type { World } from '../../types';
import { get } from '../ecs';
import type { StateMachine, Transform, Health } from '../components';

const p = 4; // pixel size

const drawPart = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, c: string) => {
    ctx.fillStyle = c;
    ctx.fillRect(Math.floor(x * p), Math.floor(y * p), w * p, h * p);
};
const drawPixel = (ctx: CanvasRenderingContext2D, x: number, y: number, c: string) => {
    ctx.fillStyle = c;
    ctx.fillRect(Math.floor(x * p), Math.floor(y * p), p, p);
};

const KREMLING_PALETTE = {
    skin_dark: '#166534', skin: '#16a34a', skin_highlight: '#4ade80',
    belly_dark: '#ca8a04', belly: '#eab308', belly_highlight: '#fde047',
    armor_dark: '#78350f', armor: '#b45309',
    eye: '#dc2626', white: '#FFFFFF', black: '#000000', mouth: '#991b1b',
};

const drawKremlingHead = (ctx: CanvasRenderingContext2D, x: number, y: number, isOpenMouth: boolean) => {
    const PALETTE = KREMLING_PALETTE;
    // Crest
    drawPart(ctx, x + 2, y - 2, 4, 2, PALETTE.skin_dark);
    drawPart(ctx, x + 3, y - 1, 3, 1, PALETTE.skin);
    // Head Shape
    drawPart(ctx, x, y, 9, 6, PALETTE.skin_dark);
    drawPart(ctx, x + 1, y, 8, 5, PALETTE.skin);
    // Snout
    drawPart(ctx, x + 8, y + 2, 5, 4, PALETTE.skin_dark);
    drawPart(ctx, x + 8, y + 2, 4, 3, PALETTE.skin);
    drawPixel(ctx, x + 11, y + 3, PALETTE.skin_dark); // Nostril
    // Eye
    drawPart(ctx, x + 5, y + 2, 3, 2, PALETTE.white);
    drawPart(ctx, x + 6, y + 2, 1, 2, PALETTE.eye);
    // Eyebrow
    drawPart(ctx, x + 4, y + 1, 4, 1, PALETTE.skin_dark);

    if (isOpenMouth) {
        drawPart(ctx, x + 8, y + 5, 4, 2, PALETTE.black);
        drawPart(ctx, x + 9, y + 6, 3, 1, PALETTE.mouth);
    }
};

const drawKremlingWalkCycle = (ctx: CanvasRenderingContext2D, s: StateMachine, isCharging: boolean) => {
    const PALETTE = KREMLING_PALETTE;
    const animSpeed = isCharging ? 16 : 10;
    const f = Math.floor(s.animTime * animSpeed) % 8;
    const bob = [0, 1, 1.5, 1, 0, 1, 1.5, 1][f];
    const bodyY = isCharging ? 8 + bob : 6 + bob;

    const frames = [
        { bl: { x: 3, y: 20 }, fl: { x: 13, y: 19 }, ba: { x: 17, y: 11 }, fa: { x: 0, y: 12 }, tilt: 1 },
        { bl: { x: 5, y: 20 }, fl: { x: 10, y: 20 }, ba: { x: 16, y: 12 }, fa: { x: 1, y: 13 }, tilt: 0 },
        { bl: { x: 8, y: 19 }, fl: { x: 7, y: 20 }, ba: { x: 15, y: 13 }, fa: { x: 2, y: 14 }, tilt: -1 },
        { bl: { x: 11, y: 19 }, fl: { x: 5, y: 20 }, ba: { x: 14, y: 12 }, fa: { x: 3, y: 13 }, tilt: 0 },
        { bl: { x: 13, y: 19 }, fl: { x: 3, y: 20 }, ba: { x: 4, y: 11 }, fa: { x: 17, y: 12 }, tilt: 1 },
        { bl: { x: 10, y: 20 }, fl: { x: 5, y: 20 }, ba: { x: 3, y: 12 }, fa: { x: 16, y: 13 }, tilt: 0 },
        { bl: { x: 7, y: 20 }, fl: { x: 8, y: 19 }, ba: { x: 2, y: 13 }, fa: { x: 15, y: 14 }, tilt: -1 },
        { bl: { x: 5, y: 20 }, fl: { x: 11, y: 19 }, ba: { x: 3, y: 12 }, fa: { x: 14, y: 13 }, tilt: 0 },
    ];
    const frame = frames[f];
    
    ctx.save();
    ctx.translate(frame.tilt * p, 0);

    // -- DRAWING ORDER (Back to Front) --
    // Tail
    drawPart(ctx, 0, bodyY + 12, 4, 4, PALETTE.skin_dark);
    drawPart(ctx, 1, bodyY + 13, 3, 3, PALETTE.skin);

    // Back Leg
    drawPart(ctx, frame.bl.x, frame.bl.y, 5, 8, PALETTE.skin_dark);
    drawPart(ctx, frame.bl.x, frame.bl.y, 4, 7, PALETTE.skin);

    // Back Arm
    drawPart(ctx, frame.ba.x, frame.ba.y, 4, 8, PALETTE.skin_dark);
    drawPart(ctx, frame.ba.x, frame.ba.y, 3, 7, PALETTE.skin);
    drawPart(ctx, frame.ba.x - 1, frame.ba.y + 6, 5, 3, PALETTE.armor_dark); // Wristband

    // Torso
    drawPart(ctx, 6, bodyY, 11, 15, PALETTE.skin_dark);
    drawPart(ctx, 7, bodyY, 10, 14, PALETTE.skin);
    drawPart(ctx, 9, bodyY + 4, 7, 10, PALETTE.belly_dark);
    drawPart(ctx, 10, bodyY + 4, 6, 9, PALETTE.belly);
    drawPart(ctx, 10, bodyY + 4, 6, 2, PALETTE.belly_highlight);

    // Front Leg
    drawPart(ctx, frame.fl.x, frame.fl.y, 5, 8, PALETTE.skin_dark);
    drawPart(ctx, frame.fl.x + 1, frame.fl.y, 4, 7, PALETTE.skin);

    // Head
    drawKremlingHead(ctx, isCharging ? 10 : 12, bodyY - (isCharging ? 2 : 0), false);
    
    // Front Arm
    drawPart(ctx, frame.fa.x, frame.fa.y, 4, 8, PALETTE.skin_dark);
    drawPart(ctx, frame.fa.x + 1, frame.fa.y, 3, 7, PALETTE.skin);
    drawPart(ctx, frame.fa.x - 1, frame.fa.y + 6, 5, 3, PALETTE.armor); // Wristband
    
    ctx.restore();
};

const drawKremlingChargeAnticipation = (ctx: CanvasRenderingContext2D, s: StateMachine) => {
    const PALETTE = KREMLING_PALETTE;
    const shake = Math.sin(s.animTime * 50) * 0.5;
    const bodyY = 4 + shake;

    // Grounded Leg
    drawPart(ctx, 4, 20, 5, 8, PALETTE.skin_dark);
    // Raised Leg
    drawPart(ctx, 10, 15, 5, 8, PALETTE.skin_dark);

    // Torso (reared back)
    drawPart(ctx, 5, bodyY, 11, 15, PALETTE.skin_dark);
    drawPart(ctx, 6, bodyY, 10, 14, PALETTE.skin);
    drawPart(ctx, 8, bodyY + 4, 7, 10, PALETTE.belly_dark);
    drawPart(ctx, 9, bodyY + 4, 6, 9, PALETTE.belly);
    
    // Head (roaring)
    drawKremlingHead(ctx, 10, bodyY - 4, true);

    // Arms (thrown back)
    drawPart(ctx, 1, bodyY + 2, 4, 8, PALETTE.skin_dark);
    drawPart(ctx, 17, bodyY + 2, 4, 8, PALETTE.skin_dark);
};

const drawKremlingStunned = (ctx: CanvasRenderingContext2D, s: StateMachine) => {
    const PALETTE = KREMLING_PALETTE;
    const sway = Math.sin(s.animTime * 10) * 2;
    const bodyY = 8;
    ctx.save();
    ctx.translate(sway * p, 0);
    ctx.rotate(sway * 0.02);

    // Legs
    drawPart(ctx, 7, 20, 5, 8, PALETTE.skin_dark);
    drawPart(ctx, 12, 20, 5, 8, PALETTE.skin_dark);
    // Torso (slumped)
    drawPart(ctx, 6, bodyY, 11, 15, PALETTE.skin_dark);
    drawPart(ctx, 7, bodyY, 10, 14, PALETTE.skin);
    drawPart(ctx, 9, bodyY + 4, 7, 10, PALETTE.belly);
    // Arms (limp)
    drawPart(ctx, 3, bodyY + 8, 4, 8, PALETTE.skin_dark);
    drawPart(ctx, 16, bodyY + 8, 4, 8, PALETTE.skin_dark);
    // Head (dizzy)
    drawKremlingHead(ctx, 12, bodyY, false);
    // Dizzy stars/spirals
    ctx.fillStyle = PALETTE.belly_highlight;
    drawPixel(ctx, 10 + Math.cos(s.animTime * 20) * 3, bodyY - 4 + Math.sin(s.animTime*20)*2, PALETTE.belly_highlight);
    drawPixel(ctx, 15 + Math.cos(s.animTime * 20 + 2) * 4, bodyY - 4 + Math.sin(s.animTime*20+2)*2, PALETTE.belly_highlight);
    ctx.restore();
}

const drawKremlingDefeated = (ctx: CanvasRenderingContext2D) => {
    const PALETTE = KREMLING_PALETTE;
    // On its back, feet in the air
    const y = 14;
    // Torso
    drawPart(ctx, 6, y, 12, 7, PALETTE.skin); 
    drawPart(ctx, 8, y+2, 8, 5, PALETTE.belly);
    // Head
    drawPart(ctx, 10, y - 5, 8, 6, PALETTE.skin);
    // X for eyes
    ctx.fillStyle = PALETTE.black;
    drawPixel(ctx, 12, y - 3, PALETTE.black); drawPixel(ctx, 13, y - 2, PALETTE.black);
    drawPixel(ctx, 13, y - 3, PALETTE.black); drawPixel(ctx, 12, y - 2, PALETTE.black);
    // Legs up
    drawPart(ctx, 8, y - 4, 4, 5, PALETTE.skin_dark);
    drawPart(ctx, 13, y - 4, 4, 5, PALETTE.skin_dark);
}

export function enemyPainter(ctx: CanvasRenderingContext2D, w: World, e: number) {
    const t = get<Transform>(w, 'transform', e);
    const s = get<StateMachine>(w, 'state', e);
    const h = get<Health>(w, 'health', e);
    if (!t || !s || !h) return;

    if (s.invulnFrames > 0 && Math.floor(s.invulnFrames * 25) % 2 === 0) {
        return;
    }
    
    ctx.save();
    ctx.scale(t.facing, 1);
    ctx.translate(t.facing === -1 ? -t.size.x : 0, 0);

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.beginPath();
    ctx.ellipse(t.size.x / 2, t.size.y, t.size.x / 3, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    switch (s.state) {
        case 'dying':
            drawKremlingDefeated(ctx);
            break;
        case 'stunned':
            drawKremlingStunned(ctx, s);
            break;
        case 'charge_anticipation':
            drawKremlingChargeAnticipation(ctx, s);
            break;
        case 'charging':
            drawKremlingWalkCycle(ctx, s, true);
            break;
        case 'patrol':
        case 'chase':
        default:
            drawKremlingWalkCycle(ctx, s, s.state === 'chase');
            break;
    }

    ctx.restore();
    
    // Health bar
    if (h.hp < h.maxHp && h.hp > 0) {
        const barWidth = t.size.x * 0.6;
        const barHeight = 8;
        const barX = t.pos.x + (t.size.x - barWidth) / 2;
        const barY = t.pos.y - 20;
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        
        const healthPercent = h.hp / h.maxHp;
        ctx.fillStyle = '#f87171';
        ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);
        
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.strokeRect(barX, barY, barWidth, barHeight);
    }
}

// --- KLAPTRAP PAINTER (HD Version) ---
const KLAPTRAP_PALETTE_HD = {
    body_shadow: '#1e40af', body: '#2563eb', body_highlight: '#60a5fa',
    stripe: '#facc15',
    underbelly: '#dbeafe', underbelly_shadow: '#bfdbfe',
    eye: '#ffffff', pupil: '#000000',
    tooth: '#ffffff', mouth_inside: '#4c1d95',
};

const drawKlaptrapWalk = (ctx: CanvasRenderingContext2D, s: StateMachine) => {
    const PALETTE = KLAPTRAP_PALETTE_HD;
    const f = Math.floor(s.animTime * 12) % 8;
    const bob = [0, 1, 1.5, 1, 0, -0.5, -1, -0.5][f];
    const bodyY = 4 + bob;

    const legFrames = [
        { bl: { x: 1, y: 11, h: 4 }, fl: { x: 8, y: 12, h: 3 } },
        { bl: { x: 2, y: 12, h: 3 }, fl: { x: 7, y: 11, h: 4 } },
        { bl: { x: 4, y: 12, h: 3 }, fl: { x: 5, y: 10, h: 5 } },
        { bl: { x: 6, y: 11, h: 4 }, fl: { x: 3, y: 11, h: 4 } },
        { bl: { x: 8, y: 12, h: 3 }, fl: { x: 1, y: 11, h: 4 } },
        { bl: { x: 7, y: 11, h: 4 }, fl: { x: 2, y: 12, h: 3 } },
        { bl: { x: 5, y: 10, h: 5 }, fl: { x: 4, y: 12, h: 3 } },
        { bl: { x: 3, y: 11, h: 4 }, fl: { x: 6, y: 11, h: 4 } },
    ];
    const frame = legFrames[f];
    const mouthOpen = f % 4 < 2;

    // -- DRAWING ORDER --
    // Back Legs
    drawPart(ctx, frame.bl.x, frame.bl.y, 2, frame.bl.h, PALETTE.body_shadow);
    drawPart(ctx, frame.bl.x - 1, frame.bl.y + frame.bl.h, 4, 2, PALETTE.body_shadow); // Foot

    // Front Legs
    drawPart(ctx, frame.fl.x, frame.fl.y, 2, frame.fl.h, PALETTE.body);
    drawPart(ctx, frame.fl.x - 1, frame.fl.y + frame.fl.h, 4, 2, PALETTE.body); // Foot

    // Tail
    drawPart(ctx, -2, bodyY + 4, 4, 2, PALETTE.body_shadow);
    drawPart(ctx, -3, bodyY + 2, 3, 2, PALETTE.body);

    // Body
    drawPart(ctx, 0, bodyY, 14, 8, PALETTE.body_shadow);
    drawPart(ctx, 0, bodyY, 13, 7, PALETTE.body);
    // Stripes
    drawPart(ctx, 1, bodyY + 1, 2, 4, PALETTE.stripe);
    drawPart(ctx, 5, bodyY + 1, 2, 4, PALETTE.stripe);
    // Underbelly
    drawPart(ctx, 1, bodyY + 6, 11, 3, PALETTE.underbelly_shadow);
    drawPart(ctx, 1, bodyY + 6, 11, 2, PALETTE.underbelly);

    // Head/Snout
    if (mouthOpen) {
        // Upper Jaw
        drawPart(ctx, 11, bodyY, 5, 4, PALETTE.body_shadow);
        drawPart(ctx, 11, bodyY, 4, 3, PALETTE.body);
        drawPart(ctx, 12, bodyY + 3, 3, 1, PALETTE.tooth);
        // Lower Jaw
        drawPart(ctx, 11, bodyY + 5, 4, 3, PALETTE.body_shadow);
        drawPart(ctx, 11, bodyY + 5, 4, 2, PALETTE.underbelly);
        drawPart(ctx, 12, bodyY + 5, 3, 1, PALETTE.tooth);
        // Mouth Inside
        drawPart(ctx, 12, bodyY + 3, 2, 2, PALETTE.mouth_inside);
    } else { // Mouth Closed
        drawPart(ctx, 11, bodyY + 2, 5, 4, PALETTE.body_shadow);
        drawPart(ctx, 11, bodyY + 2, 4, 3, PALETTE.body);
        drawPart(ctx, 11, bodyY + 4, 4, 2, PALETTE.underbelly);
        drawPixel(ctx, 15, bodyY + 3, PALETTE.tooth);
    }
    
    // Eyes
    drawPart(ctx, 5, bodyY - 4, 5, 5, PALETTE.eye);
    drawPart(ctx, 6, bodyY - 3, 3, 3, PALETTE.pupil);
    drawPixel(ctx, 6, bodyY - 3, PALETTE.eye); // highlight
};

const drawKlaptrapDefeated = (ctx: CanvasRenderingContext2D, s: StateMachine) => {
    const PALETTE = KLAPTRAP_PALETTE_HD;
    const twitch = Math.sin(s.animTime * 20) * 0.5;
    const y = 8;
    
    // Flipped Body
    drawPart(ctx, 1, y + 2, 14, 8, PALETTE.body_shadow);
    drawPart(ctx, 2, y + 2, 12, 7, PALETTE.underbelly); // Belly is up
    
    // Head
    drawPart(ctx, 4, y - 4, 8, 7, PALETTE.underbelly);
    drawPart(ctx, 5, y - 5, 6, 1, PALETTE.body); // Top of head
    
    // X for eyes
    ctx.fillStyle = PALETTE.pupil;
    drawPixel(ctx, 6, y-2, PALETTE.pupil); drawPixel(ctx, 7, y-3, PALETTE.pupil);
    drawPixel(ctx, 7, y-2, PALETTE.pupil); drawPixel(ctx, 6, y-3, PALETTE.pupil);
    drawPixel(ctx, 10, y-2, PALETTE.pupil); drawPixel(ctx, 11, y-3, PALETTE.pupil);
    drawPixel(ctx, 11, y-2, PALETTE.pupil); drawPixel(ctx, 10, y-3, PALETTE.pupil);
    
    // Legs in the air
    drawPart(ctx, 3 + twitch, y - 2, 2, 5, PALETTE.body_shadow); // back
    drawPart(ctx, 6 - twitch, y - 3, 2, 5, PALETTE.body);      // front
    drawPart(ctx, 11 + twitch, y - 3, 2, 5, PALETTE.body_shadow); // back
    drawPart(ctx, 14 - twitch, y - 2, 2, 5, PALETTE.body);      // front
};

export function klaptrapPainter(ctx: CanvasRenderingContext2D, w: World, e: number) {
     const t = get<Transform>(w, 'transform', e);
    const s = get<StateMachine>(w, 'state', e);
    const h = get<Health>(w, 'health', e);
    if (!t || !s || !h) return;

    if (s.invulnFrames > 0 && Math.floor(s.invulnFrames * 25) % 2 === 0) {
        return;
    }
    
    ctx.save();
    ctx.scale(t.facing, 1);
    ctx.translate(t.facing === -1 ? -t.size.x : 0, 0);

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.beginPath();
    ctx.ellipse(t.size.x / 2, t.size.y - (p*1.5), t.size.x / 3, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    switch (s.state) {
        case 'dying':
            drawKlaptrapDefeated(ctx, s);
            break;
        case 'patrol':
        default:
            drawKlaptrapWalk(ctx, s);
            break;
    }
    
    ctx.restore();
}
