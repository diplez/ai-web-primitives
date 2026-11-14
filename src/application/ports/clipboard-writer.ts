/** Puerto de salida: copiar texto al portapapeles. */
export interface ClipboardWriter {
  /** Rechaza si el navegador no lo permite. */
  write(text: string): Promise<void>;
}
