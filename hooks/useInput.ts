
// FIX: Import React to provide the React namespace for types like React.RefObject.
import React, { useState, useEffect, useRef } from 'react';
import type { InputState } from '../types';

const KEY_MAP: { [key: string]: keyof InputState } = {
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  Space: 'jump',
  ShiftLeft: 'roll', ShiftRight: 'roll',
  KeyX: 'dash',
  KeyC: 'shoot',
  KeyV: 'throw',
};

const GAMEPAD_MAP = {
    jump: 0, // A button
    roll: 1, // B button
    dash: 2, // X button
    shoot: 3, // Y button
    throw: 5, // R1 button
};

export const TOUCH_CONFIG = {
  dpad: { x: 0.15, y: 0.75, radius: 0.12 },
  jump: { x: 0.85, y: 0.75, radius: 0.09 },
  dash: { x: 0.70, y: 0.85, radius: 0.07 },
  roll: { x: 0.80, y: 0.55, radius: 0.07 },
  shoot: { x: 0.9, y: 0.55, radius: 0.07 },
  throw: { x: 0.70, y: 0.65, radius: 0.07 },
};

export const useInput = (containerRef: React.RefObject<HTMLElement>): InputState => {
  const [keys, setKeys] = useState<Record<string, boolean>>({});
  const [gamepad, setGamepad] = useState<Gamepad | null>(null);
  const [touchInput, setTouchInput] = useState<Partial<InputState>>({});

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => setKeys(prev => ({ ...prev, [e.code]: true }));
    const handleKeyUp = (e: KeyboardEvent) => setKeys(prev => ({ ...prev, [e.code]: false }));

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
      const updateGamepad = () => {
          const gp = navigator.getGamepads()[0];
          setGamepad(gp);
          requestAnimationFrame(updateGamepad);
      };
      const frameId = requestAnimationFrame(updateGamepad);
      return () => cancelAnimationFrame(frameId);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !('ontouchstart' in window)) return;

    const activeTouches = new Map<number, { x: number; y: number }>();

    const calculateTouchInput = () => {
      let left = false, right = false, up = false, down = false;
      let jump = false, roll = false, dash = false, shoot = false, throwInput = false;

      const rect = el.getBoundingClientRect();

      for (const touch of activeTouches.values()) {
        const normalizedX = (touch.x - rect.left) / rect.width;
        const normalizedY = (touch.y - rect.top) / rect.height;

        // D-pad logic
        const dxDpad = normalizedX - TOUCH_CONFIG.dpad.x;
        const dyDpad = normalizedY - TOUCH_CONFIG.dpad.y;
        const distDpad = Math.hypot(dxDpad, dyDpad);

        if (distDpad > 0.02 && distDpad < TOUCH_CONFIG.dpad.radius) {
          if (Math.abs(dxDpad) > Math.abs(dyDpad)) {
            if (dxDpad > 0) right = true; else left = true;
          } else {
            if (dyDpad > 0) down = true; else up = true;
          }
        }
        
        // Action buttons
        const checkButton = (name: 'jump' | 'dash' | 'roll' | 'shoot' | 'throw') => {
            const config = TOUCH_CONFIG[name];
            const dx = normalizedX - config.x;
            const dy = normalizedY - config.y;
            return Math.hypot(dx, dy) < config.radius;
        }

        if (checkButton('jump')) jump = true;
        if (checkButton('dash')) dash = true;
        if (checkButton('roll')) roll = true;
        if (checkButton('shoot')) shoot = true;
        if (checkButton('throw')) throwInput = true;
      }
      setTouchInput({ left, right, up, down, jump, roll, dash, shoot, throw: throwInput });
    };

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      Array.from(e.changedTouches).forEach(t => activeTouches.set(t.identifier, { x: t.clientX, y: t.clientY }));
      calculateTouchInput();
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      Array.from(e.changedTouches).forEach(t => {
        if (activeTouches.has(t.identifier)) activeTouches.set(t.identifier, { x: t.clientX, y: t.clientY });
      });
      calculateTouchInput();
    };

    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      Array.from(e.changedTouches).forEach(t => activeTouches.delete(t.identifier));
      calculateTouchInput();
    };

    el.addEventListener('touchstart', handleTouchStart, { passive: false });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd, { passive: false });
    el.addEventListener('touchcancel', handleTouchEnd, { passive: false });

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
      el.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [containerRef]);

  const getButton = (buttonIndex: number) => gamepad?.buttons[buttonIndex]?.pressed ?? false;
  const getAxis = (axisIndex: number) => gamepad?.axes[axisIndex] ?? 0;
  
  const currentInput: InputState = {
    left: keys.ArrowLeft || keys.KeyA || getAxis(0) < -0.5 || !!touchInput.left,
    right: keys.ArrowRight || keys.KeyD || getAxis(0) > 0.5 || !!touchInput.right,
    up: keys.ArrowUp || keys.KeyW || getAxis(1) < -0.5 || !!touchInput.up,
    down: keys.ArrowDown || keys.KeyS || getAxis(1) > 0.5 || !!touchInput.down,
    jump: keys.Space || getButton(GAMEPAD_MAP.jump) || !!touchInput.jump,
    roll: keys.ShiftLeft || keys.ShiftRight || getButton(GAMEPAD_MAP.roll) || !!touchInput.roll,
    dash: keys.KeyX || getButton(GAMEPAD_MAP.dash) || !!touchInput.dash,
    shoot: keys.KeyC || getButton(GAMEPAD_MAP.shoot) || !!touchInput.shoot,
    throw: keys.KeyV || getButton(GAMEPAD_MAP.throw) || !!touchInput.throw,
    // Hover logic: Hold Jump while in air (simplified for single button) OR Hold Up
    hover: false, 
    
    // Edge detection (handled in game loop now)
    jumpDown: false,
    rollDown: false,
    downDown: false,
    dashDown: false,
    shootDown: false,
    throwDown: false,
  };

  // Hover is explicitly holding Jump
  currentInput.hover = currentInput.jump;

  return currentInput;
};
