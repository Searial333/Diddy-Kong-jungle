
import type { ActorPreset } from '../types';

const SHARED_PHYSICS = {
  gravity: 3600,
  runSpeed: 7.2 * 60,
  runAcceleration: 30 * 60,
  runFriction: 0.85,
  maxRollSpeed: 13 * 60,
  rollSpeedBoost: 5 * 60,
  rollDeceleration: 12 * 60,
  rollMinSpeed: 4 * 60,
  wallSlideSpeed: 3.4 * 60,
  jumpForce: 22 * 60, 
  wallJumpXBoost: 12 * 60,
  wallJumpYForce: 22 * 60,
  airAcceleration: 15 * 60,
  airFriction: 0.97,
  maxAirSpeed: 8.0 * 60,
  coyoteFrames: 10,
  maxJumps: 2,
  dashSpeed: 25 * 60,
  dashDuration: 0.15,
  dashCooldown: 0.5,
  bottleChargeTime: 1.2,
  bottleLaserDuration: 0.4,
};


export const CHARACTER_PRESETS: { [key: string]: ActorPreset } = {
    TEDDY: {
        id: 'teddy',
        size: { x: 20 * 4, y: 24 * 4 },
        physics: SHARED_PHYSICS,
        abilities: ['run', 'jump', 'doubleJump', 'roll', 'wallSlide', 'slam', 'climb', 'dash', 'bottleBlaster', 'diaperBomb'],
        painterId: 'pixel:teddy',
        palette: {
          body_shadow: '#6a3805', body: '#8B4513', body_light: '#A0522D',
          vest_shadow: '#4a2e1d', vest: '#5a3a22', vest_light: '#6d4c38',
          snout: '#D2B48C', snout_dark: '#C19A6B', nose: '#4a2e1d', eye: '#000',
          bandana: '#5b21b6', bandana_dark: '#4c1d95', bandana_highlight: '#7c3aed',
        },
        attachments: [
          { id: 'tailA', type: 'chain', anchor: { x: 28, y: 24 }, segments: 8, segmentLength: 6, colorA: '#5b21b6', colorB: '#7c3aed' },
          { id: 'tailB', type: 'chain', anchor: { x: 36, y: 24 }, segments: 8, segmentLength: 6, colorA: '#5b21b6', colorB: '#7c3aed' },
        ],
    },
    DIDDY: {
        id: 'diddy',
        size: { x: 20 * 4, y: 24 * 4 },
        physics: {
            ...SHARED_PHYSICS,
            runSpeed: 8.5 * 60, // Faster than Teddy
            jumpForce: 24 * 60, // Higher jump
        },
        abilities: ['run', 'jump', 'doubleJump', 'roll', 'wallSlide', 'slam', 'climb', 'dash', 'bottleBlaster', 'jetpack'],
        painterId: 'pixel:diddy',
        palette: {
          fur: '#8B4513',
          skin: '#FFD39B',
          skin_shadow: '#D2B48C',
          hat: '#D32F2F',
          hat_brim: '#B71C1C',
          shirt: '#D32F2F',
          star: '#FFD700',
          jetpack_wood: '#5D4037',
          jetpack_band: '#263238',
          gun: '#5D4037'
        },
        attachments: [
          { 
            id: 'monkeyTail', 
            type: 'chain', 
            anchor: { x: 12, y: 44 }, 
            segments: 12, 
            segmentLength: 8, 
            colorA: '#5D4037', 
            colorB: '#8B4513',
            tension: 0.4, // Pre-coiled muscle tone
            damage: 1,    // Slap damage
            width: 10     // Thicker tail
          }
        ]
    }
};
