import { Phase, PhaseData, Runner } from 'ts-hsm';
import { Player, ServerEvent } from './event-types';

type Scenario = {
    author: Player;
    target: Player;
    text?: string;
};

type Option = {
    author: Player;
    text: string;
};

type Question = {
    optionA: Option;
    optionB: Option;
    choice?: 'A' | 'B';
};

type TargetedQuestion = Question & {
    target: Player;
};

abstract class GamePhase<TState> extends Phase<ServerEvent, TState> {}

class LobbyingPhase extends GamePhase<{}> {
    private _players = new Set<Player>();

    handleEvent(event: ServerEvent): boolean {
        switch (event.type) {
            case 'PlayerJoin': {
                this._players.add(event.data.player);
                return true;
            }
            case 'PlayerLeave': {
                this._players.delete(event.data.player);
                return true;
            }
            case 'StartGame': {
                this._transition(
                    new PhaseData(PlayingPhase, { players: this._players }, this.parent)
                );
                return true;
            }
            default: {
                return false;
            }
        }
    }
}

class PlayingPhase extends GamePhase<{ players: Set<Player> }> {
    private _playerScores = new Map<Player, number>();
    private _round = 0;

    onEnter(): void {
        for (const player of this._state.players) {
            this._playerScores.set(player, 0);
        }
        this._startRound();
    }

    handleEvent(event: ServerEvent): boolean {
        switch (event.type) {
            // Interphase
            case 'GetPlayers': {
                event.callback(this._state.players);
                return true;
            }
            case 'GetPlayerScores': {
                event.callback(this._playerScores);
                return true;
            }
            case 'Continue': {
                if (this._round === 3) {
                    // TODO: Display final scores and return to lobby
                    console.log('Game finished!');
                } else {
                    this._startRound();
                }
                return true;
            }
            default: {
                return false;
            }
        }
    }

    private _startRound() {
        this._round += 1;

        const playerList = Array.from(this._state.players);
        const targetPool = playerList.concat(playerList);

        const authorTargetsMap = new Map(
            playerList.map((player) => {
                let options = targetPool.filter((target) => target !== player);

                const targetOne = options[Math.floor(Math.random() * options.length)];

                options = options.filter((target) => target !== targetOne);

                const targetTwo = options[Math.floor(Math.random() * options.length)];

                targetPool.splice(targetPool.indexOf(targetOne), 1);
                targetPool.splice(targetPool.indexOf(targetTwo), 1);

                return [player, [targetOne, targetTwo]];
            })
        );

        const authorScenariosMap = new Map(
            playerList.map((player) => {
                const [targetOne, targetTwo] = authorTargetsMap.get(player)!;
                return [
                    player,
                    [
                        { target: targetOne, author: player },
                        { target: targetTwo, author: player },
                    ],
                ];
            })
        );

        this._transition(new PhaseData(WritingPhase, { authorScenariosMap }, this));
    }
}

class WritingPhase extends GamePhase<{ authorScenariosMap: Map<Player, Scenario[]> }> {
    private _playerPromtMap = new Map<Player, { scenario: Scenario; timeout: NodeJS.Timeout }>();

    onEnter(): void {
        for (const player of this._state.authorScenariosMap.keys()) {
            this._promptForNextScenario(player);
        }
        if (this._playerPromtMap.size === 0) {
            this._transitionToAnsweringPhase();
        }
    }

    onExit(): void {
        this._playerPromtMap.forEach(({ timeout }) => clearTimeout(timeout));
    }

    handleEvent(event: ServerEvent): boolean {
        switch (event.type) {
            case 'SubmitScenario': {
                const prompt = this._playerPromtMap.get(event.player);

                if (prompt) {
                    if (event.data.scenarioText.length >= 3) {
                        prompt.scenario.text === event.data.scenarioText;
                        clearTimeout(prompt.timeout);
                        this._playerPromtMap.delete(event.player);
                        this._promptForNextScenario(event.player);

                        if (this._playerPromtMap.size === 0) {
                            this._transitionToAnsweringPhase();
                        }
                    } else {
                        event.player.invoke({
                            type: 'Error',
                            data: { message: 'The scenario must be longer than 3 characters.' },
                        });
                    }
                    return true;
                } else {
                    return false;
                }
            }
            default: {
                return false;
            }
        }
    }

    private _promptForNextScenario(player: Player) {
        const scenarios = this._state.authorScenariosMap.get(player)!;

        const scenario = scenarios.find((scenario) => scenario.text === undefined);

        if (scenario) {
            player.invoke({
                type: 'PromptSubmitScenario',
                data: {
                    targetPlayerName: scenario.target.name,
                    timeLimitSeconds: 30,
                },
            });

            const timeout = setTimeout(() => {
                scenario.text = '';
                this._playerPromtMap.delete(player);
                this._promptForNextScenario(player);
            }, 30000);

            this._playerPromtMap.set(player, {
                scenario: scenario,
                timeout: timeout,
            });
        } else {
            player.invoke({ type: 'Wait' });
        }
    }

    private _transitionToAnsweringPhase() {
        const players = Array.from(this._state.authorScenariosMap).map(([player]) => player);

        const targetOptionsMap = new Map<Player, Option[]>(players.map((player) => [player, []]));

        for (const scenarios of this._state.authorScenariosMap.values()) {
            for (const scenario of scenarios) {
                targetOptionsMap.get(scenario.target)!.push(scenario as Option);
            }
        }

        const targetQuestionMap = new Map(
            Array.from(targetOptionsMap).map(([target, [optionA, optionB]]) => [
                target,
                { optionA, optionB },
            ])
        );

        this._transition(new PhaseData(AnsweringPhase, { targetQuestionMap }, this.parent));
    }
}

class AnsweringPhase extends GamePhase<{ targetQuestionMap: Map<Player, Question> }> {
    private _timeout?: NodeJS.Timeout;
    private _finishedPlayers = new Set<Player>();

    onEnter(): void {
        for (const [target, question] of this._state.targetQuestionMap) {
            if (question.choice === undefined) {
                target.invoke({
                    type: 'PromptAnswerQuestion',
                    data: {
                        optionA: question.optionA.text,
                        optionB: question.optionB.text,
                        timeLimitSeconds: 30,
                    },
                });
            } else {
                target.invoke({ type: 'Wait' });
            }
        }
        this._timeout = setTimeout(() => {
            this._transitionToGuessingPhase();
        }, 30000);
    }

    onExit(): void {
        clearTimeout(this._timeout);
    }

    handleEvent(event: ServerEvent): boolean {
        switch (event.type) {
            case 'SubmitAnswer': {
                const question = this._state.targetQuestionMap.get(event.player)!;
                if (question.choice === undefined) {
                    question.choice = event.data.choice;

                    event.player.invoke({ type: 'Wait' });

                    this._finishedPlayers.add(event.player);

                    if (this._finishedPlayers.size === this._state.targetQuestionMap.size) {
                        this._transitionToGuessingPhase();
                    }
                    return true;
                } else {
                    return false;
                }
            }
            default: {
                return false;
            }
        }
    }

    private _transitionToGuessingPhase() {
        const questions = Array.from(this._state.targetQuestionMap).map(([target, question]) => {
            return { target, ...question };
        });
        this._transition(new PhaseData(GuessingMasterPhase, { questions }, this.parent));
    }
}

class GuessingMasterPhase extends GamePhase<{
    questions: TargetedQuestion[];
}> {
    onEnter(): void {
        this._startNextGuessingPhase();
    }

    handleEvent(event: ServerEvent): boolean {
        switch (event.type) {
            // Interphase
            case 'Continue': {
                this._startNextGuessingPhase();
                return true;
            }
            default: {
                return false;
            }
        }
    }

    private _startNextGuessingPhase() {
        const question = this._state.questions.shift();
        if (question) {
            this._transition(
                new PhaseData(GuessingPhase, {
                    question: question,
                    playerSelectedGuessMap: new Map(),
                })
            );
        } else {
            this.parent?.handleEvent({ type: 'Continue' });
        }
    }
}

class GuessingPhase extends GamePhase<{
    question: TargetedQuestion;
    playerSelectedGuessMap: Map<Player, 'A' | 'B' | undefined>;
}> {
    private _timeout?: NodeJS.Timeout;

    onEnter(): void {
        this.parent?.handleEvent({
            type: 'GetPlayers',
            callback: (players) => {
                for (const player of players) {
                    player.invoke({
                        type: 'PromptSelectGuess',
                        data: {
                            question: {
                                targetPlayerName: this._state.question.target.name,
                                optionA: this._state.question.optionA.text,
                                optionB: this._state.question.optionB.text,
                            },
                            selectedGuess: this._state.playerSelectedGuessMap.get(player),
                            timeLimitSeconds: 30,
                        },
                    });
                }
            },
        });
        this._timeout = setTimeout(() => {
            this._transition(new PhaseData(ScoringPhase, this._state, this.parent));
        }, 30000);
    }

    onExit(): void {
        clearTimeout(this._timeout);
    }

    handleEvent(event: ServerEvent): boolean {
        switch (event.type) {
            case 'SelectGuess': {
                this._state.playerSelectedGuessMap.set(event.player, event.data.guess);
                return true;
            }
            default: {
                return false;
            }
        }
    }
}

class ScoringPhase extends GamePhase<{
    question: TargetedQuestion;
    playerSelectedGuessMap: Map<Player, 'A' | 'B' | undefined>;
}> {
    private _timeout?: NodeJS.Timeout;

    onEnter(): void {
        this.parent?.handleEvent({
            type: 'GetPlayerScores',
            callback: (playerScores) => {
                const playerIsCorrectMap = new Map<Player, boolean>();

                for (const [player, selectedGuess] of this._state.playerSelectedGuessMap) {
                    const isCorrect = selectedGuess === this._state.question.choice;
                    playerIsCorrectMap.set(player, isCorrect);
                }

                const oldPlayerScores = Array.from(playerScores);
                oldPlayerScores.sort((a, b) => a[1] - b[1]);

                // Update scores
                for (const [player, oldScore] of oldPlayerScores) {
                    const isCorrect = playerIsCorrectMap.get(player);
                    playerScores.set(player, isCorrect ? oldScore + 1 : oldScore);
                }

                const newPlayerScores = Array.from(playerScores);
                newPlayerScores.sort((a, b) => a[1] - b[1]);

                const playerOldPositionMap = new Map(
                    oldPlayerScores.map(([player], index) => [player, index])
                );

                const playerNewPositionMap = new Map(
                    newPlayerScores.map(([player], index) => [player, index])
                );

                const results = newPlayerScores.map(([player, score]) => {
                    const isCorrect = playerIsCorrectMap.get(player);
                    const oldPosition = playerOldPositionMap.get(player)!;
                    const newPosition = playerNewPositionMap.get(player)!;
                    return {
                        player: {
                            id: player.id,
                            name: player.name,
                        },
                        isCorrect: Boolean(isCorrect),
                        totalScore: score,
                        positionChange: newPosition - oldPosition,
                    };
                });

                this.parent?.handleEvent({
                    type: 'GetPlayers',
                    callback: (players) => {
                        for (const player of players) {
                            player.invoke({
                                type: 'DisplayResults',
                                data: { results: results },
                            });
                        }
                    },
                });
            },
        });

        setTimeout(() => {
            this.parent?.handleEvent({ type: 'Continue' });
        }, 20000);
    }

    onExit(): void {
        clearTimeout(this._timeout);
    }
}

export class GameRunner extends Runner<ServerEvent> {
    constructor() {
        super(new PhaseData(LobbyingPhase, {}));
    }
}
