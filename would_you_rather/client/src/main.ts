import './index.css';
import { PhaseData, Runner } from 'ts-hsm';
import { ClientEvent } from './hsm-extension/client-event';
import { ClientPhase } from './hsm-extension/client-phase';
import { io, Socket } from 'socket.io-client';
import { ClientToServerEventsMap, ServerToClientEventsMap } from 'protocol';

class MainPhase extends ClientPhase<{}> {
    private _appElement = document.getElementById('app')!;

    onEnter(): void {
        this._transition(new PhaseData(StartPage, {}, this));
    }

    handleEvent(event: ClientEvent): boolean {
        switch (event.type) {
            case 'UpdatePageContent': {
                this._appElement.innerHTML = event.html;
                return true;
            }
            default: {
                return false;
            }
        }
    }
}

class StartPage extends ClientPhase<{}> {
    onEnter(): void {
        this.parent?.handleEvent({
            type: 'UpdatePageContent',
            html: `
            <div class="flex flex-col gap-4">
                <div class="btn" id="create-game-button">Create Game</div>
                <div class="btn" id="join-game-button">Join Game</div>
            </div>
        `,
        });

        const createGameButton = document.getElementById('create-game-button')!;
        this._listen(createGameButton, 'click', () => {
            this._transition(new PhaseData(CreateGamePage, {}, this.parent));
        });

        const joinGameButton = document.getElementById('join-game-button')!;
        this._listen(joinGameButton, 'click', () => {
            this._transition(new PhaseData(JoinGamePage, {}, this.parent));
        });
    }
}

class CreateGamePage extends ClientPhase<{}> {
    onEnter(): void {
        this.parent?.handleEvent({
            type: 'UpdatePageContent',
            html: `
            <div class="flex flex-col gap-8">
                <div class="flex flex-col gap-2">
                    <label for="nickname-input">Nickname</label>
                    <input class="input" id="nickname-input"/>  
                </div>
                <div class="flex flex-col gap-4">
                    <button class="btn" id="create-button">Create</button>
                    <button class="btn" id="back-button">Go Back</button>
                </div>
            </div>
            `,
        });

        const nicknameInput = document.getElementById('nickname-input') as HTMLInputElement;
        nicknameInput.focus();

        const createButton = document.getElementById('create-button')!;
        this._listen(createButton, 'click', () => {
            this._transition(
                new PhaseData(ConnectingPhase, { nickname: nicknameInput.value }, this.parent)
            );
        });

        const backButton = document.getElementById('back-button')!;
        this._listen(backButton, 'click', () => {
            this._transition(new PhaseData(StartPage, {}, this.parent));
        });
    }
}

class JoinGamePage extends ClientPhase<{}> {
    onEnter(): void {
        this.parent?.handleEvent({
            type: 'UpdatePageContent',
            html: `
            <div class="flex flex-col gap-8">
                <div class="flex flex-col gap-4">
                    <div class="flex flex-col gap-2">
                        <label for="nickname-input">Nickname</label>
                        <input class="input" id="nickname-input"/>  
                    </div>
                    <div class="flex flex-col gap-2">
                        <label for="game-code-input">Game Code</label>
                        <input class="input tracking-[0.25em]" id="game-code-input" type="text" placeholder="XXXXXX" maxlength="6"/>
                    </div>
                </div>
                <div class="flex flex-col gap-4">
                    <button class="btn" id="join-button">Join</button>
                    <button class="btn" id="back-button">Go Back</button>
                </div>
            </div>
        `,
        });

        const nicknameInput = document.getElementById('nickname-input') as HTMLInputElement;
        nicknameInput.focus();

        const gameCodeInput = document.getElementById('game-code-input') as HTMLInputElement;
        this._listen(gameCodeInput, 'input', () => {
            gameCodeInput.value = gameCodeInput.value.toUpperCase();
        });

        const joinButton = document.getElementById('join-button')!;
        this._listen(joinButton, 'click', () => {
            this._transition(
                new PhaseData(
                    ConnectingPhase,
                    { nickname: nicknameInput.value, gameCode: gameCodeInput.value },
                    this.parent
                )
            );
        });

        const backButton = document.getElementById('back-button')!;
        this._listen(backButton, 'click', () => {
            this._transition(new PhaseData(StartPage, {}, this.parent));
        });
    }
}

class ConnectingPhase extends ClientPhase<{ nickname: string; gameCode?: string }> {
    private _socket?: Socket<ServerToClientEventsMap, ClientToServerEventsMap>;

    onEnter(): void {
        this.parent?.handleEvent({
            type: 'UpdatePageContent',
            html: `
            <div>Connecting...</div>
            `,
        });

        const query =
            this._state.gameCode === undefined
                ? { nickname: this._state.nickname }
                : { nickname: this._state.nickname, gameCode: this._state.gameCode };

        this._socket = io('ws://127.0.0.1:3000', { query: query });
        this._socket.on('invoke', this.handleEvent);
    }

    onExit(): void {
        this._socket?.off('invoke', this.handleEvent);
    }

    handleEvent = (event: ClientEvent): boolean => {
        switch (event.type) {
            case 'Connected': {
                this._transition(
                    new PhaseData(
                        ConnectedPhase,
                        { socket: this._socket, gameCode: event.data.gameCode },
                        this.parent
                    )
                );
                return true;
            }
            case 'Error': {
                console.log('There was an error trying to connect:', event);
                // TODO
                return true;
            }
            default: {
                return false;
            }
        }
    };
}

class ConnectedPhase extends ClientPhase<{ socket: Socket; gameCode: string }> {
    onEnter(): void {
        this._state.socket.on('invoke', runner.handleEvent);
        this._transition(new PhaseData(LobbyPage, { gameCode: this._state.gameCode }, this));
    }

    onExit(): void {
        this._state.socket.off('invoke', runner.handleEvent);
    }

    handleEvent(event: ClientEvent): boolean {
        switch (event.type) {
            case 'Disconnected': {
                // TODO
                return true;
            }
            case 'Error': {
                // TODO
                return true;
            }
            default: {
                return false;
            }
        }
    }
}

class LobbyPage extends ClientPhase<{ gameCode: string }> {
    onEnter(): void {
        this.parent?.parent?.handleEvent({
            type: 'UpdatePageContent',
            html: `
            <div>Lobby</div>
            <div>Waiting for the owner to start the game...</div>
            <div id="game-code"></div>
            `,
        });

        const gameCodeElement = document.getElementById('game-code')!;
        gameCodeElement.innerText = this._state.gameCode;
    }
}

const runner = new Runner(new PhaseData(MainPhase, {}));
