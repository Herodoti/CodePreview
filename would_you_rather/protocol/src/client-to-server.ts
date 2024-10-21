import { z } from 'zod';

const StartGameEvent = z.object({
    type: z.literal('StartGame'),
});

const SubmitScenarioEvent = z.object({
    type: z.literal('SubmitScenario'),
    data: z.object({
        scenarioText: z.string(),
    }),
});

const SubmitAnswerEvent = z.object({
    type: z.literal('SubmitAnswer'),
    data: z.object({
        choice: z.union([z.literal('A'), z.literal('B')]),
    }),
});

const SelectGuessEvent = z.object({
    type: z.literal('SelectGuess'),
    data: z.object({
        guess: z.union([z.literal('A'), z.literal('B')]),
    }),
});

export const ClientToServerEventSchema = z.union([
    StartGameEvent,
    SubmitScenarioEvent,
    SubmitAnswerEvent,
    SelectGuessEvent,
]);

export type GameEvent = z.infer<typeof ClientToServerEventSchema>;

export type ClientToServerEventsMap = {
    'create-game-server': (nickname: string) => void;
    'join-game-server': (gameCode: string, nickname: string) => void;
    'leave-game-server': () => void;
    'invoke-game-event': (event: GameEvent) => void;
};
