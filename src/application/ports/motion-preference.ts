/** Puerto de salida: preferencia del usuario sobre animaciones (accesibilidad). */
export interface MotionPreference {
  prefersReducedMotion(): boolean;
  /** Notifica cambios de la preferencia. Devuelve una función para cancelar la suscripción. */
  subscribe(onChange: (prefersReducedMotion: boolean) => void): () => void;
}
