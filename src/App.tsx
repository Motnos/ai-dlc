import { useState } from 'react';
import type { JSX } from 'react';
import { IPhoneFrame } from './components/phone/IPhoneFrame';
import { GameScreen } from './components/game/GameScreen';
import { HistoryScreen } from './components/history/HistoryScreen';
import { TabBar } from './components/ui/TabBar';
import type { Tab } from './components/ui/TabBar';
import { useMinesweeper } from './hooks/useMinesweeper';
import { usePlayerId } from './hooks/usePlayerId';
import { useGamePersistence } from './hooks/useGamePersistence';
import { memoryRepository } from './persistence/memoryRepository';

function App(): JSX.Element {
  const playerId = usePlayerId();
  const game = useMinesweeper();
  const repository = memoryRepository;

  useGamePersistence({
    repository,
    playerId,
    state: game.state,
    restore: game.restore,
    newGame: game.newGame,
  });

  const [tab, setTab] = useState<Tab>('game');

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 25%, #4c1d95 50%, #1e3a5f 75%, #0f172a 100%)',
      }}
    >
      <IPhoneFrame>
        <div className="flex flex-col flex-1 overflow-hidden">
          {tab === 'game' ? (
            <GameScreen game={game} />
          ) : (
            <HistoryScreen repository={repository} playerId={playerId} />
          )}
          <TabBar active={tab} onChange={setTab} />
        </div>
      </IPhoneFrame>
    </div>
  );
}

export default App;
