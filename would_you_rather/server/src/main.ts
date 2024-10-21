import { Server } from 'socket.io';
import { GameServer } from './game-server';
import { ClientToServerEventsMap, ServerToClientEventsMap } from 'protocol';

const io = new Server<ClientToServerEventsMap, ServerToClientEventsMap>({ cors: { origin: '*' } });

io.on('connection', (socket) => {
    function handleError(error: unknown): void {
        if (typeof error === 'string') {
            socket.emit('invoke', { type: 'Error', data: { message: error } });
        } else if (error instanceof Error) {
            socket.emit('invoke', { type: 'Error', data: { message: error.message } });
        }
    }

    socket.on('create-game-server', (nickname: string) => {
        try {
            GameServer.create(socket, nickname);
        } catch (error) {
            handleError(error);
        }
    });

    socket.on('join-game-server', (gameCode: string, nickname: string) => {
        try {
            GameServer.join(gameCode, socket, nickname);
        } catch (error) {
            handleError(error);
        }
    });

    socket.on('leave-game-server', () => {
        try {
            GameServer.leave(socket);
        } catch (error) {
            handleError(error);
        }
    });
});

io.listen(3000);
