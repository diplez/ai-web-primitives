export interface SseMessage {
  readonly event: string | null;
  readonly data: string;
}

/**
 * Decodificador incremental de Server-Sent Events (text/event-stream).
 * Recibe el texto en trozos arbitrarios (un evento puede llegar partido en varios
 * chunks) y devuelve los mensajes completos a medida que se cierran.
 */
export class SseDecoder {
  private buffer = "";
  private event: string | null = null;
  private data: string[] = [];

  push(chunk: string): SseMessage[] {
    this.buffer += chunk;
    const messages: SseMessage[] = [];
    let newline = this.nextLineBreak();

    while (newline !== -1) {
      const line = this.buffer.slice(0, newline);
      const breakLength =
        this.buffer[newline] === "\r" && this.buffer[newline + 1] === "\n" ? 2 : 1;
      this.buffer = this.buffer.slice(newline + breakLength);
      const message = this.line(line);
      if (message) messages.push(message);
      newline = this.nextLineBreak();
    }
    return messages;
  }

  /** Cierra el stream: entrega un último mensaje que no terminó con línea en blanco. */
  flush(): SseMessage[] {
    const messages = this.buffer ? this.push("\n") : [];
    const last = this.dispatch();
    return last ? [...messages, last] : messages;
  }

  private nextLineBreak(): number {
    const match = /\r\n|\r|\n/.exec(this.buffer);
    // Un "\r" al final puede ser la mitad de un "\r\n": se espera al próximo chunk.
    if (!match || (match[0] === "\r" && match.index === this.buffer.length - 1)) return -1;
    return match.index;
  }

  private line(line: string): SseMessage | null {
    if (line === "") return this.dispatch();
    if (line.startsWith(":")) return null; // comentario / keep-alive

    const colon = line.indexOf(":");
    const field = colon === -1 ? line : line.slice(0, colon);
    let value = colon === -1 ? "" : line.slice(colon + 1);
    if (value.startsWith(" ")) value = value.slice(1);

    if (field === "data") this.data.push(value);
    else if (field === "event") this.event = value;
    return null;
  }

  private dispatch(): SseMessage | null {
    if (this.data.length === 0) {
      this.event = null;
      return null;
    }
    const message = { event: this.event, data: this.data.join("\n") };
    this.event = null;
    this.data = [];
    return message;
  }
}
