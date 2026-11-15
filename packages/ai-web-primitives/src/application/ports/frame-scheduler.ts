/** Puerto de salida: entrega "ticks" de animación sincronizados con el refresco de pantalla. */
export interface FrameScheduler {
  /**
   * Empieza a llamar a `onFrame` en cada frame con el instante actual en segundos.
   * Devuelve una función que detiene el bucle.
   */
  start(onFrame: (nowSeconds: number) => void): () => void;
}
