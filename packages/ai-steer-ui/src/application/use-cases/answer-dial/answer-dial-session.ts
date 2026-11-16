import { isOriginal, valuesKey, type Dial, type DialValues } from "../../../domain/dial/dial.js";
import { buildRewriteInstruction } from "../../../domain/dial/rewrite-instruction.js";

/** Qué hacer al llegar a una combinación de posiciones. */
export type DialSelection =
  /** Todas en el centro: mostrar la respuesta original. */
  | { readonly kind: "original"; readonly key: string; readonly text: string }
  /** Ya se reescribió antes: mostrar sin volver a pedirla. */
  | { readonly kind: "cached"; readonly key: string; readonly text: string }
  /** Hay que pedirle la reescritura al modelo. */
  | { readonly kind: "request"; readonly key: string; readonly instruction: string };

/**
 * Caso de uso: recuerda la respuesta original y cada reescritura por combinación de perillas,
 * y decide si una reescritura que llega sigue siendo la que se espera (si el usuario ya movió
 * otra vez las perillas, la respuesta vieja se guarda pero no se muestra).
 */
export class AnswerDialSession {
  private original = "";
  private readonly cache = new Map<string, string>();
  private pendingKey: string | null = null;

  /** Empieza con una respuesta nueva: olvida todas las reescrituras anteriores. */
  start(original: string): void {
    this.original = original;
    this.cache.clear();
    this.pendingKey = null;
  }

  get originalText(): string {
    return this.original;
  }

  /** `true` mientras se espera una reescritura. */
  get pending(): boolean {
    return this.pendingKey !== null;
  }

  select(dials: readonly Dial[], values: DialValues): DialSelection {
    const key = valuesKey(dials, values);
    if (isOriginal(dials, values)) {
      this.pendingKey = null;
      return { kind: "original", key, text: this.original };
    }
    const cached = this.cache.get(key);
    if (cached !== undefined) {
      this.pendingKey = null;
      return { kind: "cached", key, text: cached };
    }
    this.pendingKey = key;
    return { kind: "request", key, instruction: buildRewriteInstruction(dials, values) };
  }

  /**
   * Guarda una reescritura. Devuelve `true` si es la que se esperaba (hay que mostrarla) y
   * `false` si llegó tarde porque el usuario ya eligió otra posición.
   */
  resolve(key: string, text: string): boolean {
    this.cache.set(key, text);
    if (key !== this.pendingKey) return false;
    this.pendingKey = null;
    return true;
  }

  /** La reescritura esperada falló. Devuelve `true` si era la vigente. */
  reject(key: string): boolean {
    if (key !== this.pendingKey) return false;
    this.pendingKey = null;
    return true;
  }
}
