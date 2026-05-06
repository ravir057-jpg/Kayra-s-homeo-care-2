export const generateJitsiUrl = (roomName: string) => {
  const cleanRoomName = roomName.replace(/\s+/g, '-').toLowerCase();
  // Standard prefix to avoid confusion with other Jitsi meetings
  return `https://meet.jit.si/KayraConsult-${cleanRoomName}`;
};

export const startVideoCall = (roomName: string) => {
  const url = generateJitsiUrl(roomName);
  window.open(url, '_blank', 'noopener,noreferrer');
};
