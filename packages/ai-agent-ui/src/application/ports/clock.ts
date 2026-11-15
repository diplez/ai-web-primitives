/** Puerto de salida: tiempo de reloj y temporizadores. */
export interface Clock {
  /** Instante actual en milisegundos. */
  now(): number;
  /** Llama a `callback` cada `milliseconds`. Devuelve una función que cancela el intervalo. */
  every(milliseconds: number, callback: () => void): () => void;
}
