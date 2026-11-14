import type { ClipboardWriter } from "../../application/ports/clipboard-writer.js";

/** Adaptador de `ClipboardWriter` sobre `navigator.clipboard`. */
export class NavigatorClipboard implements ClipboardWriter {
  async write(text: string): Promise<void> {
    if (typeof navigator === "undefined" || !navigator.clipboard) {
      throw new Error("Clipboard API is not available.");
    }
    await navigator.clipboard.writeText(text);
  }
}
