
import type { World } from '../../types';
import { get } from '../ecs';
import type { Palette, StateMachine, Transform, Abilities, Input } from '../components';

const draw = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, c: string) => {
    ctx.fillStyle = c;
    ctx.fillRect(Math.floor(x), Math.floor(y), Math.ceil(w), Math.ceil(h));
};

const getLookOffset = (input: Input | undefined, facing: number): { x: number, y: number } => {
    if (!input) return { x: 0, y: 0 };
    let x = 0, y = 0;
    if (input.up) y = -2;
    if (input.down) y = 2;
    if (input.right && facing > 0) x = 2;
    if (input.left && facing < 0) x = 2;
    if (x !== 0 && y !== 0) { x *= 0.7; y *= 0.7; }
    return { x, y };
};

const drawHead = (ctx: CanvasRenderingContext2D, pal: Palette, x: number, y: number, facing: 'front' | 'side' | 'back', lookOff: {x:number, y:number}) => {
    const hatY = y;
    draw(ctx, x+4, hatY, 40, 12, pal.hat || '#D32F2F'); 
    draw(ctx, x+8, hatY-6, 32, 8, pal.hat || '#D32F2F'); 
    
    if (facing === 'front') {
        draw(ctx, x, hatY+10, 48, 4, pal.hat_brim || '#B71C1C'); 
        draw(ctx, x+2, hatY+12, 44, 2, '#B71C1C'); 
    } else if (facing === 'side') {
        draw(ctx, x+24, hatY+8, 28, 4, pal.hat_brim || '#B71C1C'); 
    } else {
        draw(ctx, x-4, hatY+10, 56, 4, pal.hat_brim || '#B71C1C');
    }

    const headY = y + 10;
    draw(ctx, x+6, headY, 36, 30, pal.fur || '#8B4513');
    
    if (facing === 'back') return;

    const faceX = x + 10 + lookOff.x;
    const faceY = headY + 4 + lookOff.y;
    draw(ctx, faceX, faceY, 28, 20, pal.skin || '#FFD39B');
    
    const snoutY = faceY + 12;
    draw(ctx, faceX + 2, snoutY, 24, 12, pal.skin_shadow || '#D2B48C'); 
    draw(ctx, faceX + 6, snoutY + 6, 16, 2, '#3E2723'); 

    const eyeY = faceY + 2;
    draw(ctx, faceX + 4, eyeY, 8, 10, 'white'); 
    draw(ctx, faceX + 16, eyeY, 8, 10, 'white'); 
    
    const pY = eyeY + 4;
    draw(ctx, faceX + 6 + lookOff.x, pY + lookOff.y, 3, 4, 'black');
    draw(ctx, faceX + 18 + lookOff.x, pY + lookOff.y, 3, 4, 'black');
};

const drawJetpack = (ctx: CanvasRenderingContext2D, pal: Palette, x: number, y: number, intensity: number, tilt: number) => {
    ctx.save();
    ctx.translate(x+14, y+25);
    ctx.rotate(tilt);
    ctx.translate(-(x+14), -(y+25));

    draw(ctx, x, y, 28, 40, pal.jetpack_wood || '#5D4037');
    draw(ctx, x+2, y-8, 24, 8, '#D32F2F');
    draw(ctx, x+8, y-12, 12, 4, '#D32F2F');
    draw(ctx, x, y+8, 28, 6, pal.jetpack_band || '#263238');
    draw(ctx, x+2, y+10, 14, 2, '#9E9E9E'); 
    draw(ctx, x, y+28, 28, 6, pal.jetpack_band || '#263238');
    draw(ctx, x+2, y+30, 14, 2, '#9E9E9E');
    draw(ctx, x+6, y+40, 16, 8, '#212121');
    draw(ctx, x+8, y+48, 12, 4, '#616161');
    
    if (intensity > 0.05) {
        const flicker = 0.8 + Math.random() * 0.4;
        const flameLen = (35 * intensity + 15) * flicker;
        const flameW = (12 * intensity + 6) * flicker;
        const centerX = x + 14;
        const startY = y + 50;

        ctx.fillStyle = `rgba(255, 87, 34, ${0.4 * Math.min(1, intensity)})`;
        ctx.beginPath();
        ctx.ellipse(centerX, startY + flameLen * 0.6, flameW * 1.5, flameLen * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();

        const grad = ctx.createLinearGradient(centerX, startY, centerX, startY + flameLen);
        grad.addColorStop(0, '#FFFFFF');     
        grad.addColorStop(0.15, '#FFEB3B');  
        grad.addColorStop(0.5, '#FF5722');    
        grad.addColorStop(1, 'rgba(255, 0, 0, 0)');
        
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(centerX - flameW/2, startY);
        ctx.quadraticCurveTo(centerX - flameW, startY + flameLen * 0.6, centerX, startY + flameLen);
        ctx.quadraticCurveTo(centerX + flameW, startY + flameLen * 0.6, centerX + flameW/2, startY);
        ctx.fill();
        
        if (intensity > 0.3) {
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.ellipse(centerX, startY + 4, flameW * 0.4, 6 + intensity * 4, 0, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    ctx.restore();
};

const drawGun = (ctx: CanvasRenderingContext2D, pal: Palette, x: number, y: number, angle: number, firing: boolean) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle * Math.PI / 180);
    
    const kickX = firing ? -4 : 0;
    ctx.translate(kickX, 0);

    draw(ctx, 0, -8, 36, 16, pal.gun || '#5D4037'); 
    draw(ctx, 2, -6, 28, 4, '#8D6E63'); 
    draw(ctx, 6, 8, 10, 12, pal.gun || '#5D4037');
    draw(ctx, 16, 8, 2, 8, '#3E2723');
    draw(ctx, 36, -10, 6, 20, '#5D4037'); 
    draw(ctx, 38, -6, 4, 12, '#212121'); 

    if (firing) {
        ctx.fillStyle = '#FFF';
        ctx.beginPath();
        ctx.moveTo(42, 0);
        ctx.lineTo(54, -8);
        ctx.lineTo(50, 0);
        ctx.lineTo(54, 8);
        ctx.fill();
    }

    ctx.restore();
};

const drawHurt = (ctx: CanvasRenderingContext2D, pal: Palette, cx: number, cy: number) => {
    // Grimace, hands up, body crunched
    const bodyY = cy + 2;
    
    // Arms Flailing Up
    draw(ctx, cx-22, bodyY-8, 10, 24, pal.fur || '#8B4513'); // Left Arm
    draw(ctx, cx-24, bodyY-14, 12, 10, pal.skin || '#FFD39B'); // Hand
    
    draw(ctx, cx+12, bodyY-8, 10, 24, pal.fur || '#8B4513'); // Right Arm
    draw(ctx, cx+14, bodyY-14, 12, 10, pal.skin || '#FFD39B'); // Hand

    // Body
    draw(ctx, cx-12, bodyY+8, 24, 24, pal.shirt || '#D32F2F');
    draw(ctx, cx-6, bodyY+14, 12, 12, pal.star || '#FFD700');
    
    // Legs dangling
    draw(ctx, cx-14, bodyY+32, 10, 12, pal.fur || '#8B4513');
    draw(ctx, cx-16, bodyY+44, 12, 6, pal.skin || '#FFD39B');
    draw(ctx, cx+4, bodyY+32, 10, 12, pal.fur || '#8B4513');
    draw(ctx, cx+4, bodyY+44, 12, 6, pal.skin || '#FFD39B');

    // Head (Mouth Open)
    const headX = cx-20;
    const headY = bodyY-30;
    
    // Hat
    draw(ctx, headX+4, headY, 40, 12, pal.hat || '#D32F2F'); 
    draw(ctx, headX-4, headY+10, 56, 4, pal.hat_brim || '#B71C1C');

    // Face
    draw(ctx, headX+6, headY+10, 36, 30, pal.fur || '#8B4513');
    draw(ctx, headX+10, headY+14, 28, 20, pal.skin || '#FFD39B');
    
    // Eyes (X or shut)
    draw(ctx, headX+14, headY+18, 8, 2, '#3E2723'); 
    draw(ctx, headX+26, headY+18, 8, 2, '#3E2723');
    
    // Mouth (O)
    draw(ctx, headX+18, headY+26, 12, 8, 'black');
};

const drawDying = (ctx: CanvasRenderingContext2D, pal: Palette, cx: number, cy: number, time: number) => {
    // Spinning chaos
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(time * 20); // Fast spin
    ctx.translate(-cx, -cy);
    drawHurt(ctx, pal, cx, cy);
    ctx.restore();
}

export function diddyV2Painter(ctx: CanvasRenderingContext2D, w: World, e: number) {
    const t = get<Transform>(w, 'transform', e);
    const s = get<StateMachine>(w, 'state', e);
    const pal = get<Palette>(w, 'palette', e);
    const a = get<Abilities>(w, 'abilities', e);
    const input = get<Input>(w, 'input', e);
    
    if (!t || !s || !pal || !a) return;

    ctx.save();
    const cx = 32;
    const cy = 40; 

    // Don't flip for dying animation, handled by rotation
    if (s.state !== 'dying') {
        ctx.scale(t.facing, 1);
        ctx.translate(t.facing === -1 ? -t.size.x : 0, 0);
    }

    const lookOff = getLookOffset(input, t.facing);
    const hasJetpack = a.available.has('jetpack');
    
    let flameIntensity = 0;
    let packTilt = 0;

    if (hasJetpack && !t.onGround && s.state !== 'climbing' && s.state !== 'victory') {
        const isThrusting = (input?.jump || s.state === 'jetpack' || s.state === 'doubleJump');
        
        packTilt = -(t.vel.x / 1500) * t.facing;

        if (isThrusting) {
            flameIntensity = 1.0;
            if (t.vel.y < 0) flameIntensity += Math.min(0.8, Math.abs(t.vel.y) / 1000);
        } else if (t.vel.y < 0) {
            flameIntensity = 0.4;
        } else {
            flameIntensity = 0.2;
        }
        flameIntensity *= (0.9 + Math.random() * 0.2);
    }
    
    const isShooting = s.state === 'bottleShootTap' || s.state === 'bottleCharge' || s.state === 'bottleShootBeam';

    // --- DYING ---
    if (s.state === 'dying') {
        // Draw centered in the entity box
        drawDying(ctx, pal, t.size.x/2, t.size.y/2, s.animTime);
    }
    // --- HURT ---
    else if (s.state === 'hurt') {
        drawHurt(ctx, pal, cx, cy);
    }
    // --- VICTORY DANCE ---
    else if (s.state === 'victory') {
        const danceTime = s.animTime;
        
        // Spin Logic for big jump
        if (danceTime > 2.0 && danceTime < 2.5) {
             const spin = danceTime * 20;
             ctx.save();
             ctx.translate(cx, cy);
             ctx.rotate(spin);
             ctx.translate(-cx, -cy);
             // Draw air sprite while spinning
             draw(ctx, cx-14, cy+24, 10, 8, pal.fur || '#8B4513'); // Legs tucked
             draw(ctx, cx+4, cy+24, 10, 8, pal.fur || '#8B4513');
             draw(ctx, cx-12, cy, 24, 26, pal.shirt || '#D32F2F');
             draw(ctx, cx-6, cy+6, 12, 12, pal.star || '#FFD700');
             drawHead(ctx, pal, cx-22, cy-32, 'side', {x:0, y:0});
             ctx.restore();
        } 
        // Pose Logic
        else if (danceTime > 2.5) {
            const bodyY = cy;
            // Hands UP!
            draw(ctx, cx-22, bodyY-12, 10, 24, pal.fur || '#8B4513'); // L Arm up
            draw(ctx, cx-24, bodyY-18, 12, 10, pal.skin || '#FFD39B'); // Hand
            draw(ctx, cx+12, bodyY-12, 10, 24, pal.fur || '#8B4513'); // R Arm up
            draw(ctx, cx+14, bodyY-18, 12, 10, pal.skin || '#FFD39B'); // Hand
            
            // Body
            draw(ctx, cx-12, bodyY, 24, 28, pal.shirt || '#D32F2F');
            draw(ctx, cx-6, bodyY+6, 12, 12, pal.star || '#FFD700');
            
            // Legs wide
            draw(ctx, cx-14, bodyY+28, 10, 12, pal.fur || '#8B4513');
            draw(ctx, cx+4, bodyY+28, 10, 12, pal.fur || '#8B4513');
            
            drawHead(ctx, pal, cx-24, bodyY-32, 'front', {x:0,y:0});
        }
        // Jumping Logic
        else {
             // Normal Jump visual
             const bodyY = cy - 4;
             draw(ctx, cx-14, bodyY+24, 10, 8, pal.fur || '#8B4513');
             draw(ctx, cx+4, bodyY+24, 10, 8, pal.fur || '#8B4513');
             draw(ctx, cx-12, bodyY, 24, 26, pal.shirt || '#D32F2F');
             draw(ctx, cx-6, bodyY+6, 12, 12, pal.star || '#FFD700');
             drawHead(ctx, pal, cx-22, bodyY-32, 'side', {x:0, y:0});
        }
    }
    // --- IDLE ---
    else if (s.state === 'idle' || s.state === 'slamLand') {
        const bob = Math.sin(w.time * 3) * 2; 
        const bodyY = cy + bob;

        if (hasJetpack) drawJetpack(ctx, pal, cx-30, bodyY-20 + bob, 0, 0);

        draw(ctx, cx-14, bodyY+8, 6, 14, pal.fur || '#8B4513');
        draw(ctx, cx-16, bodyY+22, 8, 6, pal.skin || '#FFD39B');
        draw(ctx, cx-12, bodyY+28, 8, 12, pal.fur || '#8B4513'); 
        draw(ctx, cx-14, bodyY+40, 12, 6, pal.skin || '#FFD39B'); 
        draw(ctx, cx+4, bodyY+28, 8, 12, pal.fur || '#8B4513');
        draw(ctx, cx+2, bodyY+40, 12, 6, pal.skin || '#FFD39B'); 
        draw(ctx, cx-12, bodyY, 24, 28, pal.shirt || '#D32F2F');
        draw(ctx, cx-6, bodyY+6, 12, 12, pal.star || '#FFD700');
        draw(ctx, cx-8, bodyY+24, 16, 6, pal.skin || '#FFD39B'); 
        drawHead(ctx, pal, cx-24, bodyY-32 + bob*0.5, 'front', lookOff);
        draw(ctx, cx+8, bodyY+8, 6, 14, pal.fur || '#8B4513');
        draw(ctx, cx+6, bodyY+22, 8, 6, pal.skin || '#FFD39B');
    }

    // --- SHOOTING ---
    else if (isShooting && t.onGround) {
        const bodyY = cy + 2;
        const recoil = s.animTime < 0.1 ? -4 : 0; 
        if (hasJetpack) drawJetpack(ctx, pal, cx-32+recoil, bodyY-20, 0, 0);
        draw(ctx, cx-20, bodyY+28, 10, 14, pal.fur || '#8B4513');
        draw(ctx, cx-24, bodyY+42, 14, 6, pal.skin || '#FFD39B');
        draw(ctx, cx+10, bodyY+28, 10, 14, pal.fur || '#8B4513');
        draw(ctx, cx+12, bodyY+42, 14, 6, pal.skin || '#FFD39B');
        draw(ctx, cx-16+recoil, bodyY, 24, 28, pal.shirt || '#D32F2F');
        draw(ctx, cx-10+recoil, bodyY+6, 12, 12, pal.star || '#FFD700');
        draw(ctx, cx-12+recoil, bodyY+24, 16, 6, pal.skin || '#FFD39B');
        drawHead(ctx, pal, cx-24+recoil, bodyY-32, 'side', lookOff);
        draw(ctx, cx-12+recoil, bodyY+8, 6, 12, pal.fur || '#8B4513');
        draw(ctx, cx-14+recoil, bodyY+20, 8, 6, pal.skin || '#FFD39B');
        draw(ctx, cx+4+recoil, bodyY+8, 14, 6, pal.fur || '#8B4513');
        draw(ctx, cx+18+recoil, bodyY+6, 8, 8, pal.skin || '#FFD39B'); 
        drawGun(ctx, pal, cx+16+recoil, bodyY+4, 0, s.animTime < 0.1);
    }

    // --- RUNNING ---
    else if (s.state === 'running') {
        const f = s.animTime * 15;
        const strideY = Math.abs(Math.sin(f)) * 8;
        const bodyY = cy + 4 - strideY;
        
        const legAngle = Math.sin(f); 
        
        if (hasJetpack) drawJetpack(ctx, pal, cx-30 - (legAngle*5), bodyY-16, 0, legAngle * 0.2);

        draw(ctx, cx-8 - legAngle*10, bodyY+12, 6, 18, pal.fur || '#8B4513'); 
        draw(ctx, cx-10 - legAngle*10, bodyY+30, 8, 8, pal.skin || '#FFD39B');

        draw(ctx, cx-8 + legAngle*15, bodyY+28, 8, 10, pal.fur || '#8B4513'); 
        draw(ctx, cx-10 + legAngle*15, bodyY+38, 12, 6, pal.skin || '#FFD39B');

        draw(ctx, cx-12, bodyY, 20, 28, pal.shirt || '#D32F2F'); 
        draw(ctx, cx-4, bodyY+6, 8, 10, pal.star || '#FFD700');

        draw(ctx, cx + legAngle*15, bodyY+28, 8, 10, pal.fur || '#8B4513'); 
        draw(ctx, cx-2 + legAngle*15, bodyY+38, 12, 6, pal.skin || '#FFD39B');

        drawHead(ctx, pal, cx-20, bodyY-30, 'side', lookOff);

        draw(ctx, cx+4 - legAngle*10, bodyY+12, 6, 18, pal.fur || '#8B4513');
        draw(ctx, cx+2 - legAngle*10, bodyY+30, 8, 8, pal.skin || '#FFD39B');
    }

    // --- DASH (CARTWHEEL) ---
    else if (s.state === 'dashing') {
        for(let i=2; i>=0; i--) {
            ctx.save();
            ctx.globalAlpha = 1.0 - (i * 0.3);
            const lag = i * 0.05;
            const rot = (s.animTime - lag) * 25;
            const centerY = cy + 16;
            
            ctx.translate(cx - (i*15), centerY);
            ctx.rotate(rot);
            ctx.translate(-(cx - (i*15)), -centerY);

            draw(ctx, cx-10, centerY-10, 20, 20, pal.shirt || '#D32F2F');
            draw(ctx, cx-4, centerY-4, 8, 8, pal.star || '#FFD700');
            draw(ctx, cx-20, centerY-20, 10, 10, pal.fur || '#8B4513');
            draw(ctx, cx+10, centerY-20, 10, 10, pal.fur || '#8B4513');
            draw(ctx, cx-20, centerY+10, 10, 10, pal.fur || '#8B4513');
            draw(ctx, cx+10, centerY+10, 10, 10, pal.fur || '#8B4513');
            draw(ctx, cx-24, centerY-24, 8, 8, pal.skin || '#FFD39B');
            draw(ctx, cx+16, centerY-24, 8, 8, pal.skin || '#FFD39B');
            draw(ctx, cx-24, centerY+16, 8, 8, pal.skin || '#FFD39B');
            draw(ctx, cx+16, centerY+16, 8, 8, pal.skin || '#FFD39B');
            drawHead(ctx, pal, cx-16, centerY-36, 'front', {x:0,y:0});
            
            ctx.restore();
        }
    }
    
    // --- AIR / JETPACK ---
    else {
        const bodyY = cy - 4;
        
        ctx.translate(cx, bodyY);
        const bodyTilt = (t.vel.x / 2000) * t.facing;
        ctx.rotate(bodyTilt);
        ctx.translate(-cx, -bodyY);
        
        if (hasJetpack) drawJetpack(ctx, pal, cx-32, bodyY-14, flameIntensity, packTilt);

        draw(ctx, cx-14, bodyY+24, 10, 8, pal.fur || '#8B4513');
        draw(ctx, cx-16, bodyY+32, 10, 6, pal.skin || '#FFD39B');
        draw(ctx, cx+4, bodyY+24, 10, 8, pal.fur || '#8B4513');
        draw(ctx, cx+2, bodyY+32, 10, 6, pal.skin || '#FFD39B');
        draw(ctx, cx-12, bodyY, 24, 26, pal.shirt || '#D32F2F');
        draw(ctx, cx-6, bodyY+6, 12, 12, pal.star || '#FFD700');
        drawHead(ctx, pal, cx-22, bodyY-32, 'side', {x:0, y:0});

        if (isShooting) {
            draw(ctx, cx+8, bodyY+8, 12, 6, pal.fur || '#8B4513'); 
            drawGun(ctx, pal, cx+20, bodyY+4, -10, s.animTime < 0.1);
        } else {
            draw(ctx, cx+10, bodyY+4, 4, 12, pal.fur || '#8B4513');
            draw(ctx, cx-14, bodyY+4, 4, 12, pal.fur || '#8B4513');
        }
    }
    
    ctx.restore();
}
