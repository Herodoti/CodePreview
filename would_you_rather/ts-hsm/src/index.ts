interface Constructor<T> {
    new (...args: any[]): T;
}

export class PhaseData<TEvent, TState> {
    constructor(
        public ctor: Constructor<Phase<TEvent, TState>>,
        public state: TState,
        public parent?: Phase<TEvent, any>
    ) {}
}

export abstract class Phase<TEvent, TState> {
    protected _state: TState;
    protected _transition: (newPhase: PhaseData<TEvent, any>) => void;
    readonly parent?: Phase<TEvent, any>;

    constructor(
        state: TState,
        transition: (caller: Phase<TEvent, any>, newPhase: PhaseData<TEvent, any>) => void,
        parent?: Phase<TEvent, any>
    ) {
        this._state = state;
        this._transition = (newPhase) => {
            transition(this, newPhase);
        };
        this.parent = parent;
    }

    onEnter() {}
    onExit() {}
    handleEvent(event: TEvent): boolean {
        return false;
    }

    get state() {
        return this._state as Readonly<TState>;
    }
}

export class Runner<TEvent> {
    private _currentPhase: Phase<TEvent, any>;

    constructor(initialPhase: PhaseData<TEvent, any>) {
        this._currentPhase = new initialPhase.ctor(
            initialPhase.state,
            this._transition,
            initialPhase.parent
        );
        this._currentPhase.onEnter();
    }

    private _transition = (caller: Phase<TEvent, any>, newPhase: PhaseData<TEvent, any>) => {
        if (this._isAncestor(caller, this._currentPhase)) {
            this._currentPhase.onExit(); // Call onExit on old phase
            this._currentPhase = new newPhase.ctor(
                newPhase.state,
                this._transition,
                newPhase.parent
            );
            this._currentPhase.onEnter(); // Call onEnter on new phase
        }
    };

    /** Returns true if 'a' and 'b' is the same or if 'a' is an ancestor of 'b'. */
    private _isAncestor(a: Phase<TEvent, any>, b: Phase<TEvent, any>): boolean {
        let isAncestor = false;
        let phase: Phase<TEvent, any> | undefined = b;
        while (!isAncestor && phase) {
            isAncestor = phase === a;
            phase = b.parent;
        }
        return isAncestor;
    }

    handleEvent(event: TEvent) {
        let phase: Phase<TEvent, any> | undefined = this._currentPhase;

        while (phase && !phase.handleEvent(event)) {
            phase = this._currentPhase.parent;
        }
    }
}
