/** Puerto de salida: temporizadores. */
export interface Clock {
  /** Llama a `callback` una vez, dentro de `milliseconds`. Devuelve una función que lo cancela. */
  after(milliseconds: number, callback: () => void): () => void;
}
