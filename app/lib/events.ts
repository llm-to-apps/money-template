type AppEvent = {
  type: string;
  payload?: unknown;
};

type EventClient = {
  id: string;
  send: (event: AppEvent) => void;
};

const globalForEvents = globalThis as unknown as {
  moneyEventClients?: Set<EventClient>;
};

const clients = globalForEvents.moneyEventClients ?? new Set<EventClient>();
globalForEvents.moneyEventClients = clients;

export function addEventClient(client: EventClient) {
  clients.add(client);

  return () => {
    clients.delete(client);
  };
}

export function broadcastAppEvent(event: AppEvent) {
  for (const client of clients) {
    client.send(event);
  }
}
