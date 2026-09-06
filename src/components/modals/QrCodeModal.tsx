import React from "react";
import { ConnectPhoneModal } from "./ConnectPhoneModal";
import { PlayerStatus } from "../../types";

interface QrCodeModalProps {
  roomId: string;
  p1Status: PlayerStatus;
  p2Status: PlayerStatus;
  onClose: () => void;
  onOpenSplitTest: () => void;
  onJoinCustomRoom?: (targetRoomId: string) => void;
}

export const QrCodeModal: React.FC<QrCodeModalProps> = (props) => {
  return <ConnectPhoneModal {...props} />;
};

export default QrCodeModal;
