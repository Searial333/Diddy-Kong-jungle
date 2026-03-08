
import type { World, Particle, Platform } from '../../types';
import { get } from '../ecs';
import type { Transform, RendererRef, Palette, StateMachine, Health, Abilities, Kinematics } from '../components';
import { pixelTeddyPainter, milkProjectilePainter } from '../painters/pixelTeddyPainter';
import { diddyV2Painter } from '../painters/diddyPainter';
import { enemyPainter, klaptrapPainter } from '../painters/enemyPainter';
import { dkPainter } from '../painters/bossPainter';
import { drawAttachments } from './attachmentSystem';
import { activeCollectibles } from './entitySystem';

// Placeholder for missing painter to avoid crash
function diaperBombProjectilePainter(ctx: CanvasRenderingContext2D, w: World, e: number) {
    const t = get<Transform>(w, 'transform', e);
    if (!t) return;
    ctx.save();
    ctx.translate(t.pos.x + t.size.x/2, t.pos.y + t.size.y/2);
    ctx.rotate(w.time * 10);
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    // Diaper shape
    ctx.moveTo(-6, -6);
    ctx.lineTo(6, -6);
    ctx.lineTo(4, 6);
    ctx.lineTo(-4, 6);
    ctx.fill();
    ctx.fillStyle = '#8bc34a'; // Stink lines color
    ctx.fillRect(-8, -2, 16, 4);
    ctx.restore();
}

function peanutPainter(ctx: CanvasRenderingContext2D, w: World, e: number) {
    const t = get<Transform>(w, 'transform', e);
    if (!t) return;
    
    ctx.save();
    // Center rotation
    const cx = t.pos.x + t.size.x / 2;
    const cy = t.pos.y + t.size.y / 2;
    ctx.translate(cx, cy);
    
    // Rotate based on time and direction
    ctx.rotate(w.time * 20 * t.facing);
    
    // Peanut Shell (Double Ellipse)
    ctx.fillStyle = '#D7CCC8'; // Light Brown
    ctx.beginPath();
    // Top/Front part
    ctx.ellipse(3, 0, 5, 4, 0, 0, Math.PI*2);
    // Bottom/Back part
    ctx.ellipse(-3, 0, 5, 4, 0, 0, Math.PI*2);
    ctx.fill();
    
    // Contour/Shading
    ctx.strokeStyle = '#8D6E63'; // Darker Brown
    ctx.lineWidth = 1;
    ctx.stroke();
    
    // Texture/Highlight
    ctx.fillStyle = '#EFEBE9';
    ctx.beginPath();
    ctx.ellipse(3, -1, 2, 1, 0, 0, Math.PI*2);
    ctx.fill();
    
    ctx.restore();
}

function barrelPainter(ctx: CanvasRenderingContext2D, w: World, e: number) {
    const t = get<Transform>(w, 'transform', e);
    if (!t) return;
    ctx.save();
    ctx.translate(t.pos.x + t.size.x/2, t.pos.y + t.size.y/2);
    ctx.rotate(w.time * 8 * (t.vel.x > 0 ? 1 : -1));
    
    // Barrel Body
    ctx.fillStyle = '#5D4037';
    ctx.beginPath();
    ctx.arc(0, 0, t.size.x/2, 0, Math.PI*2);
    ctx.fill();
    
    // Bands
    ctx.strokeStyle = '#212121';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, t.size.x/2 - 4, 0, Math.PI*2);
    ctx.stroke();
    
    // DK Logo (rough)
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('DK', 0, 0);
    
    ctx.restore();
}

const painters: { [id: string]: (ctx: CanvasRenderingContext2D, w: World, e: number) => void } = {
    'pixel:teddy': pixelTeddyPainter,
    'pixel:diddy': diddyV2Painter,
    'enemy:patrol': enemyPainter,
    'enemy:klaptrap': klaptrapPainter,
    'boss:dk': dkPainter,
    'projectile:milk': milkProjectilePainter,
    'projectile:diaperBomb': diaperBombProjectilePainter,
    'projectile:peanut': peanutPainter,
    'projectile:barrel': barrelPainter,
};

function updateCamera(w: World) {
    const playerT = get<Transform>(w, 'transform', w.playerId);
    if (!playerT) return;

    // Smooth camera follow with lookahead
    const lookAhead = playerT.facing * 80;
    const targetX = playerT.pos.x - 960 / 2 + playerT.size.x / 2 + lookAhead;
    const targetY = playerT.pos.y - 540 / 2 + playerT.size.y / 2;
    
    // Non-linear interpolation for "heavy" camera feel
    w.camera.x += (targetX - w.camera.x) * 0.08;
    w.camera.y += (targetY - w.camera.y) * 0.1;

    // Hard bounds
    w.camera.x = Math.max(w.level.bounds.left, Math.min(w.camera.x, w.level.bounds.right - 960));
    w.camera.y = Math.max(w.level.bounds.top, Math.min(w.camera.y, w.level.bounds.bottom - 540));

    // Screen Shake
    if (w.camera.shakeDuration > 0) {
        w.camera.shakeDuration -= w.dt;
        if (w.camera.shakeDuration <= 0) w.camera.shakeMagnitude = 0;
    }
}

// --- ART ASSETS & DRAWING HELPERS ---

function drawJungleBackground(ctx: CanvasRenderingContext2D, w: World) {
    const { camera, time } = w;
    const name = w.level.name.toLowerCase();

    // 1. Sky Gradient (Contextual)
    const skyGrad = ctx.createLinearGradient(0, 0, 0, 540);
    
    if (name.includes('cave') || name.includes('temple')) {
        // Dark blue/purple for cave
        skyGrad.addColorStop(0, '#0a0510');
        skyGrad.addColorStop(0.5, '#1a1025');
        skyGrad.addColorStop(1.0, '#2d1b4e');
    } else if (name.includes('boss') || name.includes('sunset')) {
        // Red/Orange menacing sunset for Boss
        skyGrad.addColorStop(0, '#3e1a1a');
        skyGrad.addColorStop(0.4, '#7f2a15');
        skyGrad.addColorStop(1.0, '#ff9100');
    } else {
        // Standard Jungle Golden Hour
        skyGrad.addColorStop(0, '#261C2C');     // Deep Purple Zenith
        skyGrad.addColorStop(0.4, '#5C2A52');   // Mid
        skyGrad.addColorStop(0.7, '#C95D46');   // Horizon Orange
        skyGrad.addColorStop(1.0, '#EBB55F');   // Golden Haze
    }
    
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, 960, 540);

    // 2. Sun/Moon (Hide in cave)
    if (!name.includes('cave')) {
        ctx.save();
        ctx.translate(800, 150);
        const sunGrad = ctx.createRadialGradient(0,0, 20, 0,0, 100);
        sunGrad.addColorStop(0, '#FFECA1');
        sunGrad.addColorStop(0.4, 'rgba(255, 200, 100, 0.4)');
        sunGrad.addColorStop(1, 'rgba(255, 200, 100, 0)');
        ctx.fillStyle = sunGrad;
        ctx.beginPath();
        ctx.arc(0, 0, 100, 0, Math.PI*2);
        ctx.fill();
        ctx.restore();
    }

    // 3. Layered Parallax
    // Helper to draw layer
    const drawLayer = (layerName: string, scrollRatioX: number, scrollRatioY: number, drawFn: (offsetX: number) => void) => {
        ctx.save();
        const offsetX = -(camera.x * scrollRatioX) % 1200; // Loop every 1200px
        const offsetY = -(camera.y * scrollRatioY);
        
        ctx.translate(offsetX, offsetY);
        // Draw 3 times to cover the screen seams
        for(let i = -1; i <= 1; i++) {
            ctx.save();
            ctx.translate(i * 1200, 0);
            drawFn(i);
            ctx.restore();
        }
        ctx.restore();
    };

    // Layer: Distant Ruins (Silhouettes)
    drawLayer('ruins', 0.05, 0.02, () => {
        ctx.fillStyle = '#2E1A36'; // Very dark purple/brown
        ctx.beginPath();
        // Jagged mountains
        ctx.moveTo(0, 540);
        ctx.lineTo(0, 300);
        ctx.lineTo(200, 150); // Peak
        ctx.lineTo(350, 280);
        ctx.lineTo(500, 100); // High Peak
        ctx.lineTo(700, 350);
        ctx.lineTo(900, 200);
        ctx.lineTo(1200, 400);
        ctx.lineTo(1200, 540);
        ctx.fill();

        // Ruin shapes
        ctx.fillStyle = '#3D2442';
        ctx.fillRect(550, 180, 80, 200); // Tower
        ctx.fillRect(540, 160, 100, 20); // Top
        ctx.fillRect(560, 200, 20, 40); // Window
    });

    // Layer: Ancient Trees (Mid ground)
    drawLayer('trees', 0.2, 0.1, () => {
        ctx.fillStyle = '#3E2723'; // Dark Wood
        // Massive trunks
        [100, 500, 900].forEach(x => {
            ctx.fillRect(x, 0, 120, 600);
            // Texture
            ctx.fillStyle = '#4E342E';
            ctx.fillRect(x + 20, 0, 20, 600);
            ctx.fillRect(x + 80, 0, 10, 600);
            ctx.fillStyle = '#3E2723'; // Reset
        });
        
        // Canopy shadows
        ctx.fillStyle = 'rgba(20, 40, 20, 0.8)';
        ctx.beginPath();
        ctx.arc(160, 100, 200, 0, Math.PI*2);
        ctx.arc(560, 50, 250, 0, Math.PI*2);
        ctx.arc(960, 120, 200, 0, Math.PI*2);
        ctx.fill();
    });

    // Layer: Jungle Atmosphere (Fog)
    drawLayer('fog', 0.5, 0.3, () => {
        ctx.fillStyle = 'rgba(255, 230, 200, 0.05)';
        ctx.beginPath();
        ctx.arc(600, 400, 300, 0, Math.PI*2);
        ctx.fill();
    });
    
    // Layer: God Rays
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    const rayOffset = (time * 10) % 400;
    const rayGradient = ctx.createLinearGradient(0, 0, 200, 540);
    rayGradient.addColorStop(0, 'rgba(255, 255, 255, 0.2)');
    rayGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    ctx.fillStyle = rayGradient;
    ctx.transform(1, 0, -0.4, 1, 0, 0); // Skew
    for(let i=0; i<5; i++) {
        ctx.fillRect(i * 300 + rayOffset - 200, -100, 100, 800);
    }
    ctx.restore();
}

// --- TILE ENGINE ---

const TILE_SIZE = 40;

function drawRoughRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string, roughness: number = 2) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x, y + h);
    ctx.fill();
}

function renderGrassPlatform(ctx: CanvasRenderingContext2D, p: Platform, camX: number, camY: number) {
    // Only render if visible
    if (p.x + p.w < camX || p.x > camX + 960 || p.y + p.h < camY || p.y > camY + 540) return;

    // 1. Dirt Body
    ctx.fillStyle = '#3E2723'; // Dark Dirt
    ctx.fillRect(p.x, p.y + 10, p.w, p.h - 10);
    
    // Dirt Texture (Stones)
    ctx.fillStyle = '#4E342E';
    const seed = p.x + p.y; // deterministic random
    const numStones = Math.floor(p.w * p.h / 1000);
    for(let i=0; i<numStones; i++) {
        const sx = ((seed * (i+1) * 17) % p.w);
        const sy = ((seed * (i+1) * 23) % (p.h - 20)) + 20;
        if(sy < p.h) ctx.fillRect(p.x + sx, p.y + sy, 6, 4);
    }

    // 2. Grass Top
    ctx.fillStyle = '#2E7D32'; // Base Green
    ctx.fillRect(p.x, p.y, p.w, 15);
    
    // 3. Grass Blades (The lush look)
    ctx.fillStyle = '#43A047'; // Lighter Green
    for(let x = 0; x < p.w; x += 8) {
        const height = 4 + (Math.sin(x * 0.1 + p.y) + 1) * 4;
        ctx.fillRect(p.x + x, p.y - height + 4, 6, height);
    }

    // 4. Hanging Roots/Vines
    ctx.fillStyle = '#2E7D32';
    for(let x = 20; x < p.w; x += 60) {
        if (((x * p.y) % 100) > 50) {
            const len = 10 + ((x * p.y) % 30);
            ctx.fillRect(p.x + x, p.y + p.h, 4, len);
        }
    }
}

function renderWoodPlatform(ctx: CanvasRenderingContext2D, p: Platform, camX: number, camY: number) {
    if (p.x + p.w < camX || p.x > camX + 960 || p.y + p.h < camY || p.y > camY + 540) return;

    // Wood Planks
    ctx.fillStyle = '#5D4037';
    ctx.fillRect(p.x, p.y, p.w, p.h);

    // Plank Separators
    ctx.fillStyle = '#3E2723';
    for(let x = 0; x < p.w; x += 40) {
        ctx.fillRect(p.x + x, p.y, 2, p.h);
        // Nails
        ctx.fillStyle = '#8D6E63';
        ctx.fillRect(p.x + x + 5, p.y + 4, 4, 4);
        ctx.fillRect(p.x + x + 5, p.y + p.h - 8, 4, 4);
        ctx.fillStyle = '#3E2723';
    }

    // Horizontal Beam support
    if (p.h > 20) {
        ctx.fillStyle = '#4E342E';
        ctx.fillRect(p.x, p.y + p.h/2 - 5, p.w, 10);
    }
}

function renderBouncePlatform(ctx: CanvasRenderingContext2D, p: Platform, w: World) {
    // Flower petals
    const cx = p.x + p.w / 2;
    const cy = p.y + p.h / 2;
    
    ctx.save();
    ctx.translate(cx, cy);
    const pulse = Math.sin(w.time * 8) * 0.1 + 1;
    ctx.scale(pulse, pulse);

    // Petals
    ctx.fillStyle = '#E91E63'; // Pink
    for(let i=0; i<8; i++) {
        ctx.save();
        ctx.rotate(i * Math.PI / 4);
        ctx.beginPath();
        ctx.ellipse(25, 0, 15, 8, 0, 0, Math.PI*2);
        ctx.fill();
        ctx.restore();
    }
    
    // Center
    ctx.fillStyle = '#FDD835'; // Yellow
    ctx.beginPath();
    ctx.arc(0, 0, 15, 0, Math.PI*2);
    ctx.fill();
    
    ctx.restore();
}

function renderSecretPlatform(ctx: CanvasRenderingContext2D, p: Platform, w: World) {
    const playerT = get<Transform>(w, 'transform', w.playerId);
    // Distance based opacity
    const cx = p.x + p.w/2;
    const cy = p.y + p.h/2;
    let dist = 1000;
    if (playerT) {
        dist = Math.hypot(cx - (playerT.pos.x + playerT.size.x/2), cy - (playerT.pos.y + playerT.size.y/2));
    }
    
    const alpha = Math.max(0.1, Math.min(1, (dist - 100) / 300));
    
    ctx.save();
    ctx.globalAlpha = alpha;
    // Ancient Brick Pattern
    ctx.fillStyle = '#263238'; // Dark Slate
    ctx.fillRect(p.x, p.y, p.w, p.h);
    
    ctx.fillStyle = '#37474F';
    for(let y=0; y<p.h; y+=20) {
        const offset = (y/20)%2 === 0 ? 0 : 20;
        for(let x=0; x<p.w; x+=40) {
            ctx.fillRect(p.x + x + offset + 2, p.y + y + 2, 36, 16);
        }
    }
    ctx.restore();
}

function renderPlatforms(ctx: CanvasRenderingContext2D, w: World) {
    w.level.platforms.forEach(p => {
        switch (p.style) {
            case 'grass': renderGrassPlatform(ctx, p, w.camera.x, w.camera.y); break;
            case 'dirt': renderGrassPlatform(ctx, p, w.camera.x, w.camera.y); break; // Fallback
            case 'wood': renderWoodPlatform(ctx, p, w.camera.x, w.camera.y); break;
            case 'bounce': renderBouncePlatform(ctx, p, w); break;
            case 'secret': renderSecretPlatform(ctx, p, w); break;
            case 'brick': renderSecretPlatform(ctx, p, w); break; // Reusing secret texture for brick for now
        }
    });
}

function renderZones(ctx: CanvasRenderingContext2D, w: World) {
    w.level.zones.forEach(z => {
        if (z.type === 'goal') {
            const centerX = z.x + z.w / 2;
            const centerY = z.y + z.h / 2;
            
            ctx.save();
            ctx.translate(centerX, centerY);

            // 1. GOLDEN DOORFRAME
            const frameW = 120;
            const frameH = 200;
            
            // Outer Frame
            ctx.fillStyle = '#FFD700'; // Gold
            ctx.fillRect(-frameW/2, -frameH/2, frameW, frameH);
            
            // Detail (Bevel)
            ctx.strokeStyle = '#B8860B'; // Dark Gold
            ctx.lineWidth = 6;
            ctx.strokeRect(-frameW/2, -frameH/2, frameW, frameH);

            // Arch Top
            ctx.beginPath();
            ctx.arc(0, -frameH/2, frameW/2, Math.PI, 0);
            ctx.fillStyle = '#FFD700';
            ctx.fill();
            ctx.stroke();

            // 2. SWIRLING PURPLE VORTEX
            // Clip region to inside frame
            ctx.beginPath();
            ctx.rect(-frameW/2 + 10, -frameH/2 + 10, frameW - 20, frameH - 10);
            ctx.arc(0, -frameH/2 + 10, (frameW - 20)/2, Math.PI, 0);
            ctx.clip();

            // Background of vortex
            ctx.fillStyle = '#240046'; // Deep Indigo
            ctx.fillRect(-frameW/2, -frameH, frameW, frameH * 2);

            // Spiral Animation
            const time = w.time;
            ctx.translate(0, 0); // Center of vortex
            
            for(let i=0; i<8; i++) {
                ctx.save();
                ctx.rotate(time * 2 + (i * Math.PI / 4));
                const scale = (Math.sin(time * 3 + i) + 2) * 0.5;
                
                // Gradient for spiral arm
                const grad = ctx.createRadialGradient(0, 0, 10, 0, 0, 100);
                grad.addColorStop(0, '#9D4EDD'); // Bright Purple
                grad.addColorStop(1, 'rgba(60, 9, 108, 0)'); // Fade out

                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.quadraticCurveTo(50, 50, 0, 150); // Curved arm
                ctx.lineTo(-20, 150);
                ctx.quadraticCurveTo(30, 50, 0, 0);
                ctx.fill();
                ctx.restore();
            }

            // Center glow
            const centerGlow = ctx.createRadialGradient(0, 0, 5, 0, 0, 40);
            centerGlow.addColorStop(0, '#E0AAFF');
            centerGlow.addColorStop(1, 'rgba(224, 170, 255, 0)');
            ctx.fillStyle = centerGlow;
            ctx.beginPath();
            ctx.arc(0, 0, 40, 0, Math.PI*2);
            ctx.fill();

            ctx.restore();
        } else if (z.type === 'barrel') {
            ctx.save();
            ctx.translate(z.x + z.w/2, z.y + z.h/2);
            ctx.rotate(w.time * 4); 
            
            // Barrel Body
            const grad = ctx.createLinearGradient(-30, -30, 30, 30);
            grad.addColorStop(0, '#5D4037');
            grad.addColorStop(1, '#3E2723');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(0, 0, 40, 0, Math.PI*2);
            ctx.fill();
            
            // Iron Bands
            ctx.strokeStyle = '#263238';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(0, 0, 30, 0, Math.PI*2);
            ctx.stroke();

            // DK Star (or generic star)
            ctx.fillStyle = '#FFD54F';
            ctx.font = '30px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('★', 0, 2);

            ctx.restore();
        } else if (z.type === 'warp') {
            // WARP PIPE VISUAL
            const pipeX = z.x + (z.w - 60)/2; // Center horizontally
            const pipeY = z.y;
            
            ctx.fillStyle = '#2E7D32'; // Green Pipe
            ctx.fillRect(pipeX, pipeY, 60, z.h);
            
            // Rim
            ctx.fillStyle = '#388E3C';
            ctx.fillRect(pipeX - 4, pipeY, 68, 20);
            
            // Highlight
            ctx.fillStyle = '#66BB6A';
            ctx.fillRect(pipeX + 10, pipeY, 10, z.h);
            ctx.fillRect(pipeX + 6, pipeY, 10, 20);
            
            // Dark interior if top entrance
            ctx.fillStyle = '#1B5E20';
            ctx.fillRect(pipeX + 4, pipeY, 52, 4);
        } else if (z.type === 'vine') {
            const centerX = z.x + z.w/2;
            
            // Main Vine
            ctx.strokeStyle = '#2E7D32';
            ctx.lineWidth = 6;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(centerX, z.y);
            
            const segments = Math.ceil(z.h / 20);
            for(let i=0; i<=segments; i++) {
                const y = z.y + i * 20;
                // Swing calculation
                const swing = Math.sin(w.time * 1.5 + i * 0.2) * (i * 0.5);
                ctx.lineTo(centerX + swing, y);
            }
            ctx.stroke();

            // Leaves on Vine
            ctx.fillStyle = '#66BB6A';
            for(let i=1; i<segments; i+=2) {
                const y = z.y + i * 20;
                const swing = Math.sin(w.time * 1.5 + i * 0.2) * (i * 0.5);
                ctx.beginPath();
                ctx.ellipse(centerX + swing + 8, y, 6, 3, Math.PI/4, 0, Math.PI*2);
                ctx.fill();
                ctx.beginPath();
                ctx.ellipse(centerX + swing - 8, y, 6, 3, -Math.PI/4, 0, Math.PI*2);
                ctx.fill();
            }
        }
    });
}

function renderCollectibles(ctx: CanvasRenderingContext2D, w: World) {
    w.level.collectibles.forEach(c => {
        if (!activeCollectibles.has(c.id)) return;
        const bob = Math.sin(w.time * 4) * 5;
        
        ctx.save();
        ctx.translate(c.x + 12, c.y + 12 + bob);
        
        // Spin effect
        const scaleX = Math.sin(w.time * 3);
        ctx.scale(scaleX, 1);
        
        // Gem Shape
        ctx.fillStyle = '#FFD700'; // Gold
        ctx.beginPath();
        ctx.moveTo(0, -16);
        ctx.lineTo(12, -4);
        ctx.lineTo(0, 16);
        ctx.lineTo(-12, -4);
        ctx.fill();

        // Facets
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.beginPath();
        ctx.moveTo(0, -16);
        ctx.lineTo(6, -4);
        ctx.lineTo(0, -4);
        ctx.fill();

        ctx.restore();
    });
}

function renderForeground(ctx: CanvasRenderingContext2D, w: World) {
    // Fast moving silhouette leaves in foreground for depth
    const { camera, time } = w;
    const scrollX = -(camera.x * 1.5) % 1200;
    
    ctx.save();
    ctx.translate(scrollX, 0);
    ctx.fillStyle = '#0F150F'; // Almost black green
    
    // Draw 2 sets
    for(let offset of [0, 1200]) {
        ctx.save();
        ctx.translate(offset, 0);
        
        // Random leaf clusters
        const drawCluster = (x: number, y: number) => {
            ctx.beginPath();
            ctx.ellipse(x, y, 60, 20, Math.PI/6, 0, Math.PI*2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(x+20, y+30, 50, 25, -Math.PI/3, 0, Math.PI*2);
            ctx.fill();
        };

        drawCluster(100, 520);
        drawCluster(500, 550);
        drawCluster(900, 500);
        
        // Top hanging leaves
        drawCluster(300, -20);
        drawCluster(700, -10);

        ctx.restore();
    }
    ctx.restore();
}

export function renderSystem(w: World, canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Disable smoothing for crisp pixel art sprites
    ctx.imageSmoothingEnabled = false;

    updateCamera(w);

    // --- PARTICLE SIMULATION ---
    // Update Particles
    for (let i = w.particles.length - 1; i >= 0; i--) {
        const p = w.particles[i];
        p.life -= w.dt;
        p.x += p.vx * w.dt;
        p.y += p.vy * w.dt;
        
        if (p.life <= 0) {
            w.particles.splice(i, 1);
        }
    }
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawJungleBackground(ctx, w);

    ctx.save();
    // Camera Transform
    let sx = (Math.random() - 0.5) * w.camera.shakeMagnitude;
    let sy = (Math.random() - 0.5) * w.camera.shakeMagnitude;
    ctx.translate(Math.floor(-w.camera.x + sx), Math.floor(-w.camera.y + sy));

    renderPlatforms(ctx, w);
    renderZones(ctx, w);
    renderCollectibles(ctx, w);

    // Entities (Behind Player)
    w.entities.forEach(e => {
        if(e === w.playerId) return; // Draw player last
        drawEntity(ctx, w, e);
    });

    // Player Attachments (Tail)
    if(w.playerId !== -1) drawAttachments(ctx, w, w.playerId);
    
    // Player
    if(w.playerId !== -1) drawEntity(ctx, w, w.playerId);

    // Particles
    w.particles.forEach(p => {
        ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
        ctx.fillStyle = p.color;
        
        if (p.type === 'burst' || p.type === 'fountain') {
            ctx.beginPath();
            ctx.rect(p.x, p.y, p.size, p.size); // Square particles for retro feel
            ctx.fill();
        } else if (p.type === 'ring') {
            ctx.strokeStyle = p.color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * (2 - p.life/p.maxLife), 0, Math.PI*2);
            ctx.stroke();
        } else {
             ctx.beginPath();
            ctx.rect(p.x, p.y, p.size, p.size);
            ctx.fill();
        }
    });
    ctx.globalAlpha = 1.0;

    // Floating Text
    w.floatingTexts = w.floatingTexts.filter(ft => ft.life > 0);
    w.floatingTexts.forEach(ft => {
        ft.life -= w.dt;
        ft.y += ft.vy * w.dt;
        ctx.fillStyle = ft.color;
        ctx.font = 'bold 20px monospace';
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 3;
        ctx.strokeText(ft.text, ft.x, ft.y);
        ctx.fillText(ft.text, ft.x, ft.y);
    });

    ctx.restore();

    // Foreground parallax (Leaves passing by camera)
    renderForeground(ctx, w);
}

function drawEntity(ctx: CanvasRenderingContext2D, w: World, e: number) {
    const s = get<StateMachine>(w, 'state', e);
    const t = get<Transform>(w, 'transform', e);
    const r = get<RendererRef>(w, 'renderer', e);
    const h = get<Health>(w, 'health', e);

    const isDead = h && h.dead;
    const deadTimer = s?.timers?.dead;
    // Don't draw if dead and the death animation timer is expired (timer missing/undefined means expired in this logic context)
    if (isDead && (deadTimer === undefined || deadTimer <= 0)) return;

    if (!s || !t) return;

    ctx.save();
    ctx.translate(Math.floor(t.pos.x), Math.floor(t.pos.y));
    
    if (s.invulnFrames > 0 && Math.floor(s.invulnFrames * 10) % 2 === 0) {
        ctx.globalAlpha = 0.5;
    }
    
    // Shadow
    if (t.onGround) {
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(t.size.x/2, t.size.y - 2, t.size.x/2, 4, 0, 0, Math.PI*2);
        ctx.fill();
    }

    const painter = r ? painters[r.painterId] : undefined;
    if (painter) painter(ctx, w, e);
    
    ctx.restore();
}
