import { ClientToServerEventSchema, ServerToClientEventSchema } from 'protocol';
import { z } from 'zod';

const PlayerSchema = z.object({
    id: z.string(),
    name: z.string(),
    isAdmin: z.boolean(),
    invoke: z.function(z.tuple([ServerToClientEventSchema]), z.void()),
});

export const PlayerEventSchema = ClientToServerEventSchema.and(
    z.object({
        player: PlayerSchema,
    })
);

export type Player = z.infer<typeof PlayerSchema>;
export type PlayerEvent = z.infer<typeof PlayerEventSchema>;

// Internal events

interface PlayerJoinEvent {
    type: 'PlayerJoin';
    data: {
        player: Player;
    };
}

interface PlayerLeaveEvent {
    type: 'PlayerLeave';
    data: {
        player: Player;
    };
}

interface GetPlayersEvent {
    type: 'GetPlayers';
    callback: (players: Set<Player>) => void;
}

interface GetPlayerScoresEvent {
    type: 'GetPlayerScores';
    callback: (playerScores: Map<Player, number>) => void;
}

interface ContinueEvent {
    type: 'Continue';
}

type InternalEvent =
    | PlayerJoinEvent
    | PlayerLeaveEvent
    | GetPlayersEvent
    | GetPlayerScoresEvent
    | ContinueEvent;

export type ServerEvent = InternalEvent | PlayerEvent;
