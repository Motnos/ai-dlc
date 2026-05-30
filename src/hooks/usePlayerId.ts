import { useState } from 'react';
import { getPlayerId } from '../lib/playerId';

export function usePlayerId(): string {
  const [playerId] = useState(() => getPlayerId());
  return playerId;
}
