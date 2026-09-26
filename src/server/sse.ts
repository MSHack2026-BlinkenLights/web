const KEEPALIVE_MS = 25_000;

/**
 * Builds a Server-Sent Events response that stays open until the client
 * disconnects. A comment every 25 s keeps proxies from closing it.
 *
 * @param request - The request; closing it ends the stream.
 * @param start - Called once the stream is open with a function that sends
 * one event's data as JSON; returns what to clean up at the end.
 * @returns The streaming response.
 */
export function eventStream(
  request: Request,
  start: (send: (data: unknown) => void) => () => void,
) {
  const encoder = new TextEncoder();
  let cleanup: () => void = () => undefined;

  const stream = new ReadableStream<Uint8Array>({
    start(streamController) {
      const write = (text: string) => {
        try {
          streamController.enqueue(encoder.encode(text));
        } catch {
          cleanup();
        }
      };

      const stop = start((data) => write(`data: ${JSON.stringify(data)}\n\n`));
      const keepalive = setInterval(
        () => write(": keepalive\n\n"),
        KEEPALIVE_MS,
      );

      cleanup = () => {
        clearInterval(keepalive);
        stop();
        request.signal.removeEventListener("abort", onAbort);
      };
      const onAbort = () => {
        cleanup();
        try {
          streamController.close();
        } catch {
          // Already closed.
        }
      };
      request.signal.addEventListener("abort", onAbort);
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // Tells nginx not to buffer the stream.
      "X-Accel-Buffering": "no",
    },
  });
}
