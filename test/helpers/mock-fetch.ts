import { vi } from "vitest";

interface QueuedResponse {
  response: Response;
}

export interface MockFetchCall {
  input: RequestInfo | URL;
  init?: RequestInit;
}

export function installMockFetch() {
  const calls: MockFetchCall[] = [];
  const queue: QueuedResponse[] = [];
  const originalFetch = globalThis.fetch;

  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ input, init });

    const next = queue.shift();
    if (!next) {
      throw new Error("No queued fetch response available");
    }

    return next.response;
  });

  vi.stubGlobal("fetch", fetchMock);

  return {
    calls,
    fetchMock,
    queueJsonResponse(payload: unknown, init: ResponseInit = {}) {
      queue.push({
        response: new Response(JSON.stringify(payload), {
          ...init,
          headers: {
            "content-type": "application/json",
            ...(init.headers ?? {}),
          },
        }),
      });
    },
    queueTextResponse(body: string, init: ResponseInit = {}) {
      queue.push({
        response: new Response(body, init),
      });
    },
    restore() {
      if (originalFetch) {
        vi.stubGlobal("fetch", originalFetch);
        return;
      }

      vi.unstubAllGlobals();
    },
  };
}
