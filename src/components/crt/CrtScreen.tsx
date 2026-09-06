import React from "react";
import { CrtShaderConfig } from "../../types";

interface CrtScreenProps {
  shaderConfig: CrtShaderConfig;
  onUpdateShaderConfig: (config: Partial<CrtShaderConfig>) => void;
  isPoweredOn: boolean;
  onTogglePower: () => void;
  onReset?: () => void;
  channelDisplay?: string;
  isMuted: boolean;
  onToggleMute: () => void;
  volume: number;
  onChangeVolume: (vol: number) => void;
  children: React.ReactNode;
  onOpenSettings: () => void;
}


export const CrtScreen: React.FC<CrtScreenProps> = ({ children }) => {
  return (
    <div
      id="screen-viewport"
      className="relative w-full h-full flex-1 flex flex-col items-center justify-center overflow-hidden"
    >
      {children}
    </div>
  );
};

