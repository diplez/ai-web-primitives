import type { StreamEvent } from "../../domain/stream/stream-event.js";
import { FetchStreamEventSource } from "./fetch-stream-event-source.js";

const encoder = new TextEncoder();

/** ReadableStream de bytes con los trozos dados (simula la red partiendo los mensajes). */
const bytes = (...chunks: string[]) =>
  new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });

const response = (contentType: string, ...chunks: string[]) =>
  new Response(bytes(...chunks), { headers: { "content-type": contentType } });

async function collect(source: unknown, format: "auto" | "text" = "auto"): Promise<StreamEvent[]> {
  const events: StreamEvent[] = [];
  for await (const event of new FetchStreamEventSource().open(source, { format })) {
    events.push(event);
  }
  return events;
}

const sseLine = (json: unknown) => `data: ${JSON.stringify(json)}\n\n`;

describe("FetchStreamEventSource", () => {
  it("lee un Response SSE de OpenAI partido en trozos arbitrarios", async () => {
    const body =
      sseLine({ choices: [{ delta: { content: "Ho" } }] }) +
      sseLine({ choices: [{ delta: { content: "la" } }] }) +
      "data: [DONE]\n\n";
    const events = await collect(response("text/event-stream", body.slice(0, 17), body.slice(17)));
    expect(events).toEqual([
      { type: "text", delta: "Ho" },
      { type: "text", delta: "la" },
    ]);
  });

  it("detecta SSE aunque falte el content-type", async () => {
    const body = sseLine({ type: "content_block_delta", delta: { type: "text_delta", text: "A" } });
    expect(await collect(bytes(body))).toEqual([{ type: "text", delta: "A" }]);
  });

  it("lee el data stream de AI SDK v4", async () => {
    expect(await collect(bytes('0:"Ho"\n0:', '"la"\ng:"r"\n'))).toEqual([
      { type: "text", delta: "Ho" },
      { type: "text", delta: "la" },
      { type: "reasoning", delta: "r" },
    ]);
  });

  it("trata el resto como texto plano", async () => {
    expect(await collect(response("text/plain", "Hola ", "mundo"))).toEqual([
      { type: "text", delta: "Hola " },
      { type: "text", delta: "mundo" },
    ]);
  });

  it("acepta iterables async de texto o eventos", async () => {
    async function* source() {
      yield "a";
      yield { type: "reasoning", delta: "r" } as const;
      yield { nope: true };
    }
    expect(await collect(source())).toEqual([
      { type: "text", delta: "a" },
      { type: "reasoning", delta: "r" },
    ]);
  });

  it("rechaza fuentes no soportadas con un mensaje claro", async () => {
    await expect(collect(42)).rejects.toThrow(/Unsupported stream source/);
  });
});
