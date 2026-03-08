
import type { World, InputState } from '../../types';
import { abilitySystem } from './abilitySystem';
import { physicsSystem } from './physicsSystem';
import { collisionSystem } from './collisionSystem';
import { renderSystem } from './renderSystem';
import { attachmentSystem } from './attachmentSystem';
import { statusSystem } from './statusSystem';
import { combatSystem } from './combatSystem';
import { movingPlatformSystem } from './movingPlatformSystem';
import { entitySystem } from './entitySystem';
import { targetSystem } from './targetSystem';
import { bossSystem } from './bossSystem';

export function runSystems(world: World, canvas: HTMLCanvasElement, input: InputState) {
    // Run game logic for playing AND victory sequence (to animate dance)
    if (world.status === 'playing' || world.status === 'victory_dance') {
        if (world.respawnPlayer) {
            statusSystem.respawn(world, world.playerId);
            world.respawnPlayer = false;
        }

        abilitySystem(world, input);
        movingPlatformSystem(world);
        entitySystem(world);
        bossSystem(world); 
        physicsSystem(world);
        collisionSystem(world);
        targetSystem(world);
        
        // Only allow combat interactions during active gameplay
        if (world.status === 'playing') {
            combatSystem(world);
        }
        
        attachmentSystem(world);
        statusSystem.update(world);
    }
    
    // Always render, even during levelComplete stats screen for background ambience
    renderSystem(world, canvas);
}
