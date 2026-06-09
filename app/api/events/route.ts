import { NextRequest } from 'next/server';

import { addEventClient } from '../../lib/events';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const client = {
        id: crypto.randomUUID(),
        send(event: { type: string; payload?: unknown }) {
          controller.enqueue(
            encoder.encode(
              `event: ${event.type}\ndata: ${JSON.stringify(event.payload ?? {})}\n\n`
            )
          );
        }
      };
      const removeClient = addEventClient(client);
      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode('event: heartbeat\ndata: {}\n\n'));
      }, 25_000);

      client.send({ type: 'connected' });

      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
        removeClient();
        controller.close();
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-store',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no'
    }
  });
}
