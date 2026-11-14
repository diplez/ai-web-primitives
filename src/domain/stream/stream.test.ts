import {
  detectJsonFormat,
  eventsFromDataStreamLine,
  eventsFromSseMessage,
} from "./provider-formats.js";
import { SseDecoder } from "./sse-decoder.js";

const sse = (data: unknown, event: string | null = null) => ({
  event,
  data: typeof data === "string" ? data : JSON.stringify(data),
});

describe("SseDecoder", () => {
  it("reconstruye eventos partidos entre chunks", () => {
    const decoder = new SseDecoder();
    expect(decoder.push('data: {"a"')).toEqual([]);
    expect(decoder.push(":1}\n")).toEqual([]);
    expect(decoder.push("\n")).toEqual([{ event: null, data: '{"a":1}' }]);
  });

  it("soporta event, data multilínea, comentarios y CRLF", () => {
    const decoder = new SseDecoder();
    const messages = decoder.push(": ping\r\nevent: delta\r\ndata: a\r\ndata: b\r\n\r\n");
    expect(messages).toEqual([{ event: "delta", data: "a\nb" }]);
  });

  it("no corta un CRLF partido entre chunks", () => {
    const decoder = new SseDecoder();
    expect(decoder.push("data: x\r")).toEqual([]);
    expect(decoder.push("\n\r\n")).toEqual([{ event: null, data: "x" }]);
  });

  it("flush entrega el último evento sin línea en blanco final", () => {
    const decoder = new SseDecoder();
    decoder.push("data: fin");
    expect(decoder.flush()).toEqual([{ event: null, data: "fin" }]);
  });
});

describe("eventsFromSseMessage", () => {
  it("OpenAI Chat Completions", () => {
    const message = sse({ choices: [{ delta: { content: "Hola" } }] });
    expect(eventsFromSseMessage(message, "auto")).toEqual([{ type: "text", delta: "Hola" }]);
    expect(eventsFromSseMessage(sse("[DONE]"), "auto")).toEqual([]);
  });

  it("OpenAI Responses API, con razonamiento", () => {
    expect(
      eventsFromSseMessage(sse({ type: "response.output_text.delta", delta: "Hi" }), "auto"),
    ).toEqual([{ type: "text", delta: "Hi" }]);
    expect(
      eventsFromSseMessage(
        sse({ type: "response.reasoning_summary_text.delta", delta: "Pienso" }),
        "openai",
      ),
    ).toEqual([{ type: "reasoning", delta: "Pienso" }]);
  });

  it("Anthropic Messages, con thinking", () => {
    const textDelta = sse({
      type: "content_block_delta",
      index: 0,
      delta: { type: "text_delta", text: "Hola" },
    });
    const thinking = sse({
      type: "content_block_delta",
      index: 0,
      delta: { type: "thinking_delta", thinking: "Mmm" },
    });
    expect(eventsFromSseMessage(textDelta, "auto")).toEqual([{ type: "text", delta: "Hola" }]);
    expect(eventsFromSseMessage(thinking, "anthropic")).toEqual([
      { type: "reasoning", delta: "Mmm" },
    ]);
    expect(eventsFromSseMessage(sse({ type: "message_start" }), "auto")).toEqual([]);
  });

  it("Vercel AI SDK v5", () => {
    expect(
      eventsFromSseMessage(sse({ type: "text-delta", id: "1", delta: "Hey" }), "auto"),
    ).toEqual([{ type: "text", delta: "Hey" }]);
    expect(eventsFromSseMessage(sse({ type: "reasoning-delta", delta: "r" }), "ai-sdk")).toEqual([
      { type: "reasoning", delta: "r" },
    ]);
  });

  it("ignora JSON inválido y eventos desconocidos", () => {
    expect(eventsFromSseMessage(sse("{roto"), "auto")).toEqual([]);
    expect(eventsFromSseMessage(sse({ foo: 1 }), "auto")).toEqual([]);
  });

  it("detecta el formato por la forma del JSON", () => {
    expect(detectJsonFormat({ choices: [] })).toBe("openai");
    expect(detectJsonFormat({ type: "content_block_delta" })).toBe("anthropic");
    expect(detectJsonFormat({ type: "text-delta" })).toBe("ai-sdk");
    expect(detectJsonFormat("x")).toBeNull();
  });
});

describe("eventsFromDataStreamLine (AI SDK v4)", () => {
  it("interpreta texto y razonamiento", () => {
    expect(eventsFromDataStreamLine('0:"Hola \\"mundo\\""')).toEqual([
      { type: "text", delta: 'Hola "mundo"' },
    ]);
    expect(eventsFromDataStreamLine('g:"pienso"')).toEqual([
      { type: "reasoning", delta: "pienso" },
    ]);
    expect(eventsFromDataStreamLine('d:{"finishReason":"stop"}')).toEqual([]);
  });
});
