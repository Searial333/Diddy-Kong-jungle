
import React from 'react';
import type { InputState } from '../types';
import { TOUCH_CONFIG } from '../hooks/useInput';

interface TouchControlsProps {
  input: InputState;
  opacity: number;
}

const ControlButton: React.FC<{ config: { x: number; y: number; radius: number }; label: string; active: boolean }> = ({ config, label, active }) => (
  <div
    className="absolute pointer-events-none"
    style={{
      left: `${config.x * 100}%`,
      top: `${config.y * 100}%`,
      width: `${config.radius * 2 * 100}%`,
      height: `${config.radius * 2 * 100}%`,
      transform: 'translate(-50%, -50%)',
    }}
  >
    <div className={`w-full h-full rounded-full border-2 border-white/30 transition-colors ${active ? 'bg-white/40' : 'bg-white/20'}`}>
      <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white/80 font-bold text-lg uppercase tracking-wider">{label}</span>
    </div>
  </div>
);

const DPad: React.FC<{ input: InputState }> = ({ input }) => {
    const { dpad } = TOUCH_CONFIG;
    return (
        <div
            className="absolute pointer-events-none"
            style={{
                left: `${dpad.x * 100}%`,
                top: `${dpad.y * 100}%`,
                width: `${dpad.radius * 2 * 100}%`,
                height: `${dpad.radius * 2 * 100}%`,
                transform: 'translate(-50%, -50%)',
            }}
        >
            <div className="w-full h-full rounded-full border-2 border-white/30 bg-white/10 flex items-center justify-center">
                 <div className="w-[90%] h-[90%] relative">
                     <div className={`absolute w-[30%] h-[30%] top-1/2 -translate-y-1/2 left-0 rounded-full transition-colors ${input.left ? 'bg-white/40' : 'bg-white/20'}`}></div>
                     <div className={`absolute w-[30%] h-[30%] top-1/2 -translate-y-1/2 right-0 rounded-full transition-colors ${input.right ? 'bg-white/40' : 'bg-white/20'}`}></div>
                     <div className={`absolute w-[30%] h-[30%] left-1/2 -translate-x-1/2 top-0 rounded-full transition-colors ${input.up ? 'bg-white/40' : 'bg-white/20'}`}></div>
                     <div className={`absolute w-[30%] h-[30%] left-1/2 -translate-x-1/2 bottom-0 rounded-full transition-colors ${input.down ? 'bg-white/40' : 'bg-white/20'}`}></div>
                 </div>
            </div>
        </div>
    );
};

export const TouchControls: React.FC<TouchControlsProps> = ({ input, opacity }) => {
  return (
    <div className="absolute inset-0 z-50 pointer-events-none transition-opacity duration-300" style={{ opacity }}>
      <DPad input={input} />
      <ControlButton config={TOUCH_CONFIG.jump} label="A" active={input.jump} />
      <ControlButton config={TOUCH_CONFIG.dash} label="X" active={input.dash} />
      <ControlButton config={TOUCH_CONFIG.roll} label="B" active={input.roll} />
      <ControlButton config={TOUCH_CONFIG.shoot} label="Y" active={input.shoot} />
      <ControlButton config={TOUCH_CONFIG.throw} label="R1" active={input.throw} />
    </div>
  );
};
