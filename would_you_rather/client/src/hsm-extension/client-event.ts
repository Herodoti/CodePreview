import { ClientToServerEvent, ServerToClientEvent } from 'protocol';

interface UpdatePageContent {
    type: 'UpdatePageContent';
    html: string;
}

interface InvokeServerEvent {
    type: 'InvokeServerEvent';
    event: ClientToServerEvent;
}

export type ClientEvent = ServerToClientEvent | UpdatePageContent | InvokeServerEvent;
