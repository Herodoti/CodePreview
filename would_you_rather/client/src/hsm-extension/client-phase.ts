import { Phase } from 'ts-hsm';
import { ClientEvent } from './client-event';

type EventListener<K extends keyof HTMLElementEventMap> = {
    element: HTMLElement;
    type: K;
    listener: (this: HTMLElement, ev: HTMLElementEventMap[K]) => any;
};

export abstract class ClientPhase<TState> extends Phase<ClientEvent, TState> {
    private _eventListeners: EventListener<any>[] = [];

    protected _listen<K extends keyof HTMLElementEventMap>(
        element: HTMLElement,
        type: K,
        listener: (this: HTMLElement, ev: HTMLElementEventMap[K]) => any
    ) {
        element.addEventListener(type, listener);
        this._eventListeners.push({ element, type, listener });
    }

    onExit(): void {
        for (const { element, type, listener } of this._eventListeners) {
            element.removeEventListener(type, listener);
        }
        super.onExit();
    }
}
