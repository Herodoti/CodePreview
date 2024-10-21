import { z } from 'zod';

const ErrorEvent = z.object({
    type: z.literal('Error'),
    data: z.object({
        message: z.string(),
    }),
});

const WaitEvent = z.object({
    type: z.literal('Wait'),
});

const ConnectedEvent = z.object({
    type: z.literal('Connected'),
    data: z.object({
        gameCode: z.string(),
    }),
});

const DisconnectedEvent = z.object({
    type: z.literal('Disconnected'),
    data: z.object({
        reason: z.string(),
    }),
});

const PromptSubmitScenarioEvent = z.object({
    type: z.literal('PromptSubmitScenario'),
    data: z.object({
        targetPlayerName: z.string(),
        timeLimitSeconds: z.number(),
    }),
});

const PromptAnswerQuestionEvent = z.object({
    type: z.literal('PromptAnswerQuestion'),
    data: z.object({
        optionA: z.string(),
        optionB: z.string(),
        timeLimitSeconds: z.number(),
    }),
});

const PromptSelectGuessEvent = z.object({
    type: z.literal('PromptSelectGuess'),
    data: z.object({
        question: z.object({
            targetPlayerName: z.string(),
            optionA: z.string(),
            optionB: z.string(),
        }),
        selectedGuess: z.union([z.literal('A'), z.literal('B'), z.undefined()]),
        timeLimitSeconds: z.number(),
    }),
});

const DisplayResultsEvent = z.object({
    type: z.literal('DisplayResults'),
    data: z.object({
        results: z.array(
            z.object({
                player: z.object({
                    id: z.string(),
                    name: z.string(),
                }),
                isCorrect: z.boolean(),
                totalScore: z.number(),
                positionChange: z.number(),
            })
        ),
    }),
});

export const ServerToClientEventSchema = z.union([
    ErrorEvent,
    WaitEvent,
    ConnectedEvent,
    DisconnectedEvent,
    PromptSubmitScenarioEvent,
    PromptAnswerQuestionEvent,
    PromptSelectGuessEvent,
    DisplayResultsEvent,
]);

export type ServerToClientEvent = z.infer<typeof ServerToClientEventSchema>;

export type ServerToClientEventsMap = {
    invoke: (event: ServerToClientEvent) => void;
};
