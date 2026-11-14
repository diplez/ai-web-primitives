/**
 * Forma mínima de una señal de cancelación. Compatible con `AbortSignal` del navegador y de
 * Node, sin que la capa de aplicación dependa de los tipos del DOM.
 */
export interface AbortSignalLike {
  readonly aborted: boolean;
  addEventListener?(type: "abort", listener: () => void, options?: { once?: boolean }): void;
  removeEventListener?(type: "abort", listener: () => void): void;
}
