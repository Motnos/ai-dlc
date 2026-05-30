import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createApiRepository } from './apiRepository';
import { serialize, deserialize } from '../game/serialize';
import { createGame } from '../game/engine';
import type { GameState } from '../game/types';
import type { GameResultInput } from './types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeBeginnerState(): GameState {
  return createGame('beginner');
}

function makeFakeResponse(opts: {
  ok: boolean;
  status: number;
  body?: unknown;
}): Response {
  return {
    ok: opts.ok,
    status: opts.status,
    json: async () => opts.body,
  } as unknown as Response;
}

// ---------------------------------------------------------------------------
// saveGame
// ---------------------------------------------------------------------------

describe('apiRepository.saveGame', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(makeFakeResponse({ ok: true, status: 204 })));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('issues a PUT request to /api/saves/<encodedPlayerId>', async () => {
    const repo = createApiRepository();
    const state = makeBeginnerState();
    await repo.saveGame('player-1', state);

    const mockFetch = vi.mocked(globalThis.fetch);
    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/saves/player-1');
    expect(init.method).toBe('PUT');
  });

  it('encodes special characters in playerId', async () => {
    const repo = createApiRepository();
    const state = makeBeginnerState();
    await repo.saveGame('player/one two', state);

    const mockFetch = vi.mocked(globalThis.fetch);
    const [url] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/saves/player%2Fone%20two');
  });

  it('sends Content-Type: application/json header', async () => {
    const repo = createApiRepository();
    await repo.saveGame('player-1', makeBeginnerState());

    const [, init] = vi.mocked(globalThis.fetch).mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers['Content-Type']).toBe('application/json');
  });

  it('sends body with difficulty equal to state.difficulty', async () => {
    const repo = createApiRepository();
    const state = makeBeginnerState();
    await repo.saveGame('player-1', state);

    const [, init] = vi.mocked(globalThis.fetch).mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string) as { difficulty: string; state: unknown };
    expect(body.difficulty).toBe(state.difficulty);
  });

  it('sends body.state equal to serialize(state)', async () => {
    const repo = createApiRepository();
    const state = makeBeginnerState();
    await repo.saveGame('player-1', state);

    const [, init] = vi.mocked(globalThis.fetch).mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string) as { difficulty: string; state: unknown };
    expect(body.state).toEqual(serialize(state));
  });

  it('resolves void and does not throw even if fetch rejects', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network down')));
    const repo = createApiRepository();
    await expect(repo.saveGame('player-1', makeBeginnerState())).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// loadSave
// ---------------------------------------------------------------------------

describe('apiRepository.loadSave', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('issues a GET request to /api/saves/<encodedPlayerId>', async () => {
    const state = makeBeginnerState();
    const serialized = serialize(state);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      makeFakeResponse({ ok: true, status: 200, body: { difficulty: 'beginner', state: serialized } })
    ));

    const repo = createApiRepository();
    await repo.loadSave('player-1');

    const mockFetch = vi.mocked(globalThis.fetch);
    const [url] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/saves/player-1');
  });

  it('returns deserialized { difficulty, state } on 2xx response', async () => {
    const state = makeBeginnerState();
    const serialized = serialize(state);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      makeFakeResponse({ ok: true, status: 200, body: { difficulty: 'beginner', state: serialized } })
    ));

    const repo = createApiRepository();
    const result = await repo.loadSave('player-1');

    expect(result).not.toBeNull();
    expect(result!.difficulty).toBe('beginner');
    expect(result!.state).toEqual(state);
  });

  it('returns null on 404', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      makeFakeResponse({ ok: false, status: 404, body: null })
    ));

    const repo = createApiRepository();
    const result = await repo.loadSave('missing-player');
    expect(result).toBeNull();
  });

  it('returns null on non-2xx status (e.g. 500)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      makeFakeResponse({ ok: false, status: 500, body: null })
    ));

    const repo = createApiRepository();
    const result = await repo.loadSave('player-1');
    expect(result).toBeNull();
  });

  it('returns null on network error (fetch rejects)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('connection refused')));

    const repo = createApiRepository();
    const result = await repo.loadSave('player-1');
    expect(result).toBeNull();
  });

  it('returns null when body.state is corrupt (deserialize throws)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      makeFakeResponse({ ok: true, status: 200, body: { difficulty: 'beginner', state: { v: 999 } } })
    ));

    const repo = createApiRepository();
    const result = await repo.loadSave('player-1');
    expect(result).toBeNull();
  });

  it('encodes special characters in playerId', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      makeFakeResponse({ ok: false, status: 404, body: null })
    ));

    const repo = createApiRepository();
    await repo.loadSave('player/one two');

    const mockFetch = vi.mocked(globalThis.fetch);
    const [url] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/saves/player%2Fone%20two');
  });
});

// ---------------------------------------------------------------------------
// clearSave
// ---------------------------------------------------------------------------

describe('apiRepository.clearSave', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('issues a DELETE request to /api/saves/<encodedPlayerId>', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(makeFakeResponse({ ok: true, status: 204 })));

    const repo = createApiRepository();
    await repo.clearSave('player-1');

    const mockFetch = vi.mocked(globalThis.fetch);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/saves/player-1');
    expect(init.method).toBe('DELETE');
  });

  it('resolves void and does not throw on network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network down')));

    const repo = createApiRepository();
    await expect(repo.clearSave('player-1')).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// recordResult
// ---------------------------------------------------------------------------

describe('apiRepository.recordResult', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('issues a POST request to /api/results', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      makeFakeResponse({ ok: true, status: 201, body: { id: 'some-uuid' } })
    ));

    const repo = createApiRepository();
    const result: GameResultInput = {
      difficulty: 'beginner',
      outcome: 'won',
      durationMs: 12345,
      mines: 10,
      rows: 9,
      cols: 9,
    };
    await repo.recordResult('player-1', result);

    const mockFetch = vi.mocked(globalThis.fetch);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/results');
    expect(init.method).toBe('POST');
  });

  it('sends Content-Type: application/json header', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      makeFakeResponse({ ok: true, status: 201, body: { id: 'uuid' } })
    ));

    const repo = createApiRepository();
    const result: GameResultInput = {
      difficulty: 'beginner',
      outcome: 'won',
      durationMs: 1000,
      mines: 10,
      rows: 9,
      cols: 9,
    };
    await repo.recordResult('player-1', result);

    const [, init] = vi.mocked(globalThis.fetch).mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers['Content-Type']).toBe('application/json');
  });

  it('sends camelCase body including playerId', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      makeFakeResponse({ ok: true, status: 201, body: { id: 'uuid' } })
    ));

    const repo = createApiRepository();
    const result: GameResultInput = {
      difficulty: 'expert',
      outcome: 'lost',
      durationMs: 5000,
      mines: 99,
      rows: 16,
      cols: 30,
    };
    await repo.recordResult('player-42', result);

    const [, init] = vi.mocked(globalThis.fetch).mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body['playerId']).toBe('player-42');
    expect(body['difficulty']).toBe('expert');
    expect(body['outcome']).toBe('lost');
    expect(body['durationMs']).toBe(5000);
    expect(body['mines']).toBe(99);
    expect(body['rows']).toBe(16);
    expect(body['cols']).toBe(30);
  });

  it('resolves void and does not throw on network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network down')));

    const repo = createApiRepository();
    const result: GameResultInput = {
      difficulty: 'beginner',
      outcome: 'won',
      durationMs: 1000,
      mines: 10,
      rows: 9,
      cols: 9,
    };
    await expect(repo.recordResult('player-1', result)).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// listResults
// ---------------------------------------------------------------------------

describe('apiRepository.listResults', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const fakeResults = [
    {
      id: 'r1',
      difficulty: 'beginner',
      outcome: 'won',
      durationMs: 12345,
      mines: 10,
      rows: 9,
      cols: 9,
      playedAt: 1780170824734,
    },
    {
      id: 'r2',
      difficulty: 'expert',
      outcome: 'lost',
      durationMs: 9000,
      mines: 99,
      rows: 16,
      cols: 30,
      playedAt: 1780170700000,
    },
  ];

  it('issues a GET request to /api/results/<encodedPlayerId>?limit=...', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      makeFakeResponse({ ok: true, status: 200, body: fakeResults })
    ));

    const repo = createApiRepository();
    await repo.listResults('player-1', 10);

    const mockFetch = vi.mocked(globalThis.fetch);
    const [url] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/results/player-1?limit=10');
  });

  it('defaults limit to 50 when not specified', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      makeFakeResponse({ ok: true, status: 200, body: [] })
    ));

    const repo = createApiRepository();
    await repo.listResults('player-1');

    const [url] = vi.mocked(globalThis.fetch).mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/results/player-1?limit=50');
  });

  it('returns parsed GameResult array on success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      makeFakeResponse({ ok: true, status: 200, body: fakeResults })
    ));

    const repo = createApiRepository();
    const results = await repo.listResults('player-1', 50);
    expect(results).toHaveLength(2);
    expect(results[0].id).toBe('r1');
    expect(results[0].playedAt).toBe(1780170824734);
    expect(results[1].outcome).toBe('lost');
  });

  it('returns [] on non-2xx response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      makeFakeResponse({ ok: false, status: 500 })
    ));

    const repo = createApiRepository();
    const results = await repo.listResults('player-1', 50);
    expect(results).toEqual([]);
  });

  it('returns [] on network error (fetch rejects)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('timeout')));

    const repo = createApiRepository();
    const results = await repo.listResults('player-1', 50);
    expect(results).toEqual([]);
  });

  it('encodes special characters in playerId', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      makeFakeResponse({ ok: true, status: 200, body: [] })
    ));

    const repo = createApiRepository();
    await repo.listResults('player/one two', 5);

    const [url] = vi.mocked(globalThis.fetch).mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/results/player%2Fone%20two?limit=5');
  });
});

// ---------------------------------------------------------------------------
// Serialize / Deserialize round-trip via apiRepository contract
// ---------------------------------------------------------------------------

describe('apiRepository serialize/deserialize round-trip', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('saveGame serializes and loadSave deserializes back to original state', async () => {
    const originalState = makeBeginnerState();

    // Capture what saveGame would PUT
    const putMock = vi.fn().mockResolvedValue(makeFakeResponse({ ok: true, status: 204 }));
    vi.stubGlobal('fetch', putMock);

    const repo = createApiRepository();
    await repo.saveGame('player-1', originalState);

    const putBody = JSON.parse(
      (putMock.mock.calls[0] as [string, RequestInit])[1].body as string
    ) as { difficulty: string; state: unknown };

    // Now mock loadSave to return that same body (as the server would after JSON.parse)
    const getMock = vi.fn().mockResolvedValue(
      makeFakeResponse({
        ok: true,
        status: 200,
        body: { difficulty: putBody.difficulty, state: putBody.state },
      })
    );
    vi.stubGlobal('fetch', getMock);

    const loaded = await repo.loadSave('player-1');

    expect(loaded).not.toBeNull();
    expect(loaded!.difficulty).toBe(originalState.difficulty);
    expect(loaded!.state).toEqual(originalState);
  });

  it('serialize output is valid JSON and deserialize restores state', () => {
    const state = makeBeginnerState();
    const jsonString = JSON.stringify(serialize(state));
    const parsed = JSON.parse(jsonString) as unknown;
    const restored = deserialize(parsed);
    expect(restored).toEqual(state);
  });

  it('loadSave returns null when state field cannot be deserialized', async () => {
    // Simulate server returning a corrupt/wrong-version state
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      makeFakeResponse({
        ok: true,
        status: 200,
        body: { difficulty: 'beginner', state: { v: 99, corrupted: true } },
      })
    ));

    const repo = createApiRepository();
    const result = await repo.loadSave('player-1');
    expect(result).toBeNull();
  });
});
