import { Socket } from 'socket.io';
import { GameRunner } from './game/game';

import { fromZodError } from 'zod-validation-error';
import { Player, PlayerEventSchema } from './game/event-types';

type Connection = {
    server: GameServer;
    player: Player;
    invokeListener: (event: any) => void;
};

export class GameServer extends GameRunner {
    static create(socket: Socket, nickname: string) {
        if (this._socketConnectionMap.has(socket)) {
            throw new Error('You are already in a game.');
        }
        const gameServer = new GameServer();
        GameServer._gameCodeServerMap.set(gameServer._gameCode, gameServer);
        gameServer._connect(socket, nickname, true);
    }

    static join(gameCode: string, socket: Socket, nickname: string) {
        if (this._socketConnectionMap.has(socket)) {
            throw new Error('You are already in a game.');
        }
        const gameServer = this._gameCodeServerMap.get(gameCode);
        if (!gameServer) {
            throw new Error('Game not found.');
        }
        gameServer._connect(socket, nickname, false);
    }

    static leave(socket: Socket) {
        const connection = GameServer._socketConnectionMap.get(socket);
        if (!connection) {
            throw new Error('You are not in any game.');
        }
        socket.off('invoke', connection.invokeListener);
        connection.server.handleEvent({
            type: 'PlayerLeave',
            data: { player: connection.player },
        });
        GameServer._socketConnectionMap.delete(socket);
        socket.emit('invoke', { type: 'Disconnected', data: { reason: 'You left the game.' } });
    }

    private static _gameCodeServerMap = new Map<string, GameServer>();

    private static _socketConnectionMap = new Map<Socket, Connection>();

    private static _generateUniqueGameCode() {
        let gameCode: string | undefined = undefined;

        while (gameCode === undefined || GameServer._gameCodeServerMap.has(gameCode)) {
            gameCode = (() => {
                const charSet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

                let gameCode = '';

                while (gameCode.length < 6) {
                    gameCode += charSet[Math.round(Math.random() * charSet.length)];
                }
                return gameCode;
            })();
        }
        return gameCode;
    }

    private _gameCode: string;

    private constructor() {
        super();
        this._gameCode = GameServer._generateUniqueGameCode();
    }

    private _connect(socket: Socket, nickname: string, isAdmin: boolean) {
        const player: Player = {
            id: socket.id,
            name: nickname,
            isAdmin: isAdmin,
            invoke: (event) => {
                socket.emit('invoke', event);
            },
        };

        const invokeListener = (event: any) => {
            event.player = player;
            const result = PlayerEventSchema.safeParse(event);
            if (result.success) {
                this.handleEvent(result.data);
            } else {
                const message = `Invalid event: ${fromZodError(result.error).message}`;
                socket.emit('invoke', { type: 'Error', data: { message: message } });
            }
        };

        socket.on('invoke', invokeListener);
        this.handleEvent({ type: 'PlayerJoin', data: { player: player } });
        GameServer._socketConnectionMap.set(socket, {
            server: this,
            player: player,
            invokeListener,
        });
        socket.emit('invoke', { type: 'Connected', data: { gameCode: this._gameCode } });
    }
}
