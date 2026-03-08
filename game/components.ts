
import type { Vec2, Facing, AttachmentSpec, EntityId } from '../types';

export interface Transform {
  pos: Vec2;
  vel: Vec2;
  size: Vec2;
  facing: Facing;
  onGround: boolean;
  onWall: -1 | 0 | 1;
  groundY: number;
  onLadder: boolean;
  lastCheckpoint: Vec2;
}

export interface Kinematics {
  gravity: number;
  runSpeed: number;
  runAcceleration: number;
  runFriction: number;
  maxRollSpeed: number;
  rollSpeedBoost: number;
  rollDeceleration: number;
  rollMinSpeed: number;
  wallSlideSpeed: number;
  jumpForce: number;
  wallJumpXBoost: number;
  wallJumpYForce: number;
  airAcceleration: number;
  airFriction: number;
  maxAirSpeed: number;
  coyoteFrames: number;
  maxJumps: number;
  dashSpeed: number;
  dashDuration: number;
  dashCooldown: number;
  bottleChargeTime: number;
  bottleLaserDuration: number;
}

export interface StateMachine {
  state: string;
  animTime: number;
  invulnFrames: number;
  respawnFrames: number;
  timers: Record<string, number>;
  enemyId?: string;
}

export interface Boss {
    state: 'intro' | 'idle' | 'jumping' | 'pounding_anticipation' | 'pounding' | 'barrel_throw' | 'coconut_toss' | 'banana_throw' | 'roll_charge' | 'hurt' | 'dying';
    phase: number;
}

export interface Health {
  hp: number;
  maxHp: number;
  dead: boolean;
}

export interface Abilities {
  active?: string;
  available: Set<string>;
  context: Record<string, any>; // jumpsLeft, coyote, rollMomentum, etc.
}

export interface Input {
  left: boolean; right: boolean; up: boolean; down: boolean;
  jump: boolean; roll: boolean; dash: boolean; shoot: boolean; throw: boolean;
  hover: boolean;
  jumpDown: boolean; rollDown: boolean; downDown: boolean; dashDown: boolean;
  shootDown: boolean; throwDown: boolean;
}

export interface RendererRef {
  painterId: string;
}

export interface Palette {
  [name: string]: string;
}

export interface Attachments {
  list: AttachmentSpec[];
}

export interface Projectile {
    owner: EntityId;
    damage: number;
    life: number;
    type: string;
}
