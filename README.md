# @diplez/ai-web-primitives

Componentes de interfaz para aplicaciones de IA, como **Web Components**: funcionan igual en
React, Vue, Angular, Svelte o HTML plano. Muestran lo que hace el modelo (piensa, razona, pide
permiso, responde y cita) con una sola línea de código y se adaptan a tu marca cambiando una
variable de color.

> Estado: desarrollo temprano (`0.x`). La API pública puede cambiar entre versiones menores hasta
> la `1.0.0`. Roadmap: [`docs/ideas-libreria-componentes-ia.md`](docs/ideas-libreria-componentes-ia.md).

| Componente                | Para qué sirve                                                                  |
| ------------------------- | ------------------------------------------------------------------------------- |
| `<dz-markdown>`           | Respuesta del modelo en markdown, **en streaming**, segura y conectada a tu API |
| `<dz-reasoning>`          | Pasos del agente en vivo: "Pensando… 2 de 5 pasos" → "Pensó durante 12 s"       |
| `<dz-approval>`           | El agente pide permiso antes de una acción, con cuenta regresiva opcional       |
| `<dz-citation>`           | Cita de una fuente (RAG) con fragmento y nivel de coincidencia                  |
| `<dz-thinking-orb>`       | Orbe animado que expresa la fase del modelo con movimiento                      |
| `<dz-thinking-indicator>` | Indicador de estado en texto, sin estilos propios                               |

---

## Tabla de contenidos

- [Empezar en 1 minuto](#empezar-en-1-minuto)
- [Componentes](#componentes)
- [Colores y tema](#colores-y-tema)
- [Conectar con tu modelo (streaming)](#conectar-con-tu-modelo-streaming)
- [Idiomas](#idiomas)
- [Uso con frameworks](#uso-con-frameworks)
- [Concepto de arquitectura](#concepto-de-arquitectura)
- [Cómo se hace cumplir la arquitectura](#cómo-se-hace-cumplir-la-arquitectura)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Flujo de un render](#flujo-de-un-render)
- [Requisitos previos](#requisitos-previos)
- [Configuración inicial](#configuración-inicial)
- [Scripts disponibles](#scripts-disponibles)
- [API pública y versionado](#api-pública-y-versionado)
- [Tecnologías y paquetes](#tecnologías-y-paquetes)
- [Estándares de código](#estándares-de-código)
- [Estándares de componentes](#estándares-de-componentes)
- [Tests](#tests)
- [Cómo agregar un nuevo componente](#cómo-agregar-un-nuevo-componente)
- [Convención de commits](#convención-de-commits)
- [Publicación en npm](#publicación-en-npm)

---

## Empezar en 1 minuto

```bash
npm install @diplez/ai-web-primitives
```

```js
import { defineAll } from "@diplez/ai-web-primitives";
defineAll({ locale: "es" }); // registra todos los componentes, con textos en español
```

```html
<dz-reasoning id="pasos"></dz-reasoning>
<dz-markdown id="respuesta"></dz-markdown>

<script type="module">
  const respuesta = document.querySelector("#respuesta");
  // Funciona con la respuesta de OpenAI, Anthropic, Vercel AI SDK o texto plano.
  await respuesta.stream(await fetch("/api/chat", { method: "POST", body: "…" }));
</script>
```

Otras formas de registrar:

```js
import "@diplez/ai-web-primitives/define"; // todo, en inglés
import "@diplez/ai-web-primitives/markdown/define"; // solo un componente (mejor tree-shaking)
import { defineMarkdown } from "@diplez/ai-web-primitives";
defineMarkdown({ tagName: "mi-markdown", locale: "es", messages: { copy: "Copiar código" } });
```

> El import raíz (`@diplez/ai-web-primitives`) **no registra nada** por sí solo: registrar es
> siempre explícito, con `defineAll()`, un `define*()` o un import `…/define`.

**Sin bundler** (HTML plano, prototipos):

```html
<script type="module">
  import { defineAll } from "https://cdn.jsdelivr.net/npm/@diplez/ai-web-primitives/+esm";
  defineAll({ locale: "es" });
</script>
```

---

## Componentes

### `<dz-markdown>`: respuestas en streaming

```html
<dz-markdown> # Puedes escribir el markdown **dentro** de la etiqueta </dz-markdown>
```

```js
const md = document.querySelector("dz-markdown");

md.content = "# Hola"; // reemplazar
md.appendText(" mundo"); // agregar (si manejas el stream tú)
const { text, aborted } = await md.stream(response, { signal: controller.signal });
```

- **Seguro por construcción**: el markdown se convierte en un árbol y se pinta con plantillas;
  nunca se usa `innerHTML`. Se descartan enlaces `javascript:`/`data:` y las imágenes se muestran
  como enlaces (no se cargan recursos de terceros). Apto para texto no confiable.
- **Tolerante al streaming**: `**negrita`, `` `código `` y enlaces a medio llegar se ven bien;
  las tablas aparecen recién cuando su estructura es inequívoca; cursor parpadeante mientras escribe.
- **Rendimiento**: aunque lleguen cientos de deltas por segundo, renderiza como mucho una vez por frame.
- Soporta CommonMark + tablas, tachado, listas de tareas y URLs sueltas (GFM). Bloques de código
  con lenguaje y botón **Copiar**.

| Propiedad / atributo | Tipo      | Descripción                                          |
| -------------------- | --------- | ---------------------------------------------------- |
| `content`            | `string`  | Texto markdown                                       |
| `streaming`          | `boolean` | Activa la tolerancia a contenido cortado y el cursor |

| Método                     | Descripción                                                                                                   |
| -------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `stream(source, options?)` | Consume `Response`, `ReadableStream` o `AsyncIterable`. Opciones: `format`, `signal`, `append`, `onReasoning` |
| `appendText(text)`         | Agrega texto al final                                                                                         |
| `clear()`                  | Vacía el contenido                                                                                            |

Eventos: `dz-stream-start`, `dz-stream-end` (`{ text, aborted }`), `dz-stream-error` (`{ error }`),
`dz-reasoning` (`{ delta }`), `dz-copy` (`{ text, language }`).

### `<dz-reasoning>`: pasos del agente

```html
<dz-reasoning steps='["Leer el repositorio", "Buscar usos de la API"]'></dz-reasoning>
```

```js
const panel = document.querySelector("dz-reasoning");
const paso = panel.addStep("Buscando en la documentación"); // queda "en curso"
panel.appendDetail(paso, "3 resultados en docs/api.md");
panel.updateStep(paso, { status: "done" });
panel.finish(); // marca lo pendiente como hecho → "Pensó durante 4 s"

// O todo de una vez, p. ej. desde el estado de tu app:
panel.steps = [
  { title: "Leer", status: "done" },
  { title: "Buscar", status: "running", detail: "…" },
  { title: "Responder", status: "pending" },
];
```

Estados de un paso: `pending`, `running`, `done`, `error`. Atributos: `steps` (JSON), `open`,
`heading` (titular fijo). Evento: `dz-toggle` (`{ open }`). El cronómetro arranca solo con el
primer paso en curso.

### `<dz-approval>`: permiso antes de actuar

```html
<dz-approval heading="Borrar 3 archivos" tone="danger" timeout="15">
  El agente quiere eliminar la carpeta <code>build/</code>.
  <pre slot="details">rm -rf build/</pre>
</dz-approval>
```

```js
document.querySelector("dz-approval").addEventListener("dz-decision", (event) => {
  const { decision, reason } = event.detail; // "approved" | "denied", "user" | "timeout"
});
```

| Atributo                      | Valores                           | Descripción                                |
| ----------------------------- | --------------------------------- | ------------------------------------------ |
| `heading`                     | texto                             | Título de la solicitud                     |
| `tone`                        | `neutral` · `warning` · `danger`  | Énfasis según el riesgo                    |
| `timeout`                     | segundos                          | Cuenta regresiva (sin valor: sin límite)   |
| `timeout-action`              | `deny` (por defecto) · `approve`  | Qué pasa al vencer. Por seguridad, deniega |
| `approve-label`, `deny-label` | texto                             | Textos de los botones                      |
| `status`                      | `pending` · `approved` · `denied` | Estado (reflejado, para estilizar)         |

La cuenta regresiva **se pausa** mientras la persona pasa el mouse o tiene el foco en la tarjeta
(WCAG 2.2.1). Métodos: `approve()`, `deny()`, `reset()`. Eventos: `dz-approve`, `dz-deny`,
`dz-decision`.

### `<dz-citation>`: fuentes (RAG)

```html
<p>
  La API admite paginación por cursor
  <dz-citation
    index="1"
    source="Guía de la API"
    href="https://docs.example.com/pagination"
    snippet="Use the cursor returned in the previous page…"
    confidence="0.92"
  ></dz-citation
  >.
</p>
```

Al pasar el mouse, enfocar o tocar la pastilla se muestra la fuente, su dominio, el fragmento y
el nivel de coincidencia (`0.92`, `92` o `"92%"`). La tarjeta usa la Popover API, así que no
la recortan los contenedores con `overflow`. Evento: `dz-citation-open`.

### `<dz-thinking-orb>`: orbes de pensamiento

Un orbe animado que comunica en qué está el modelo **con movimiento, no solo con color**. Cada
fase tiene una metáfora propia y el orbe se transforma de una a otra de forma continua:

| Fase         | Metáfora    | Qué se ve                                                                       |
| ------------ | ----------- | ------------------------------------------------------------------------------- |
| `idle`       | Respiración | Esfera gris azulada casi inmóvil que respira lento                              |
| `analyzing`  | Escáner     | Anillos inclinados que giran y barren el orbe, pasando por delante y por detrás |
| `searching`  | Sonar       | Pulsos que se expanden y partículas que salen en rayos y vuelven                |
| `generating` | Forja       | Superficie turbulenta, núcleo que gira rápido y tokens emitidos en espiral      |
| `done`       | Calma       | Se asienta en verde                                                             |

```html
<dz-thinking-orb phase="generating" show-label style="--dz-orb-size: 64px"></dz-thinking-orb>
```

Respeta `prefers-reduced-motion` (pose estática), se pausa fuera de pantalla y anuncia el estado
a lectores de pantalla. Método `refreshColors()` para aplicar colores nuevos sin cambiar de fase.

### `<dz-thinking-indicator>`: estado en texto

```html
<dz-thinking-indicator phase="searching"></dz-thinking-indicator>
```

Muestra "Buscando fuentes…" con `role="status"`. Sin estilos propios: se estiliza con
`::part(indicator)` y `[phase="…"]`.

---

## Colores y tema

Todos los componentes comparten tokens de tema. **Cambiar uno lo cambia en toda la librería**:

```css
:root {
  --dz-accent: #e11d48; /* tu color de marca */
  --dz-radius: 14px;
  --dz-font: "Inter", system-ui, sans-serif;
}
```

| Token                                         | Uso                                              |
| --------------------------------------------- | ------------------------------------------------ |
| `--dz-accent`                                 | Color principal: enlaces, botones, paso en curso |
| `--dz-accent-contrast`                        | Texto sobre el color principal                   |
| `--dz-text`, `--dz-muted`                     | Texto principal y secundario                     |
| `--dz-surface`, `--dz-surface-raised`         | Fondos de tarjetas y cabeceras                   |
| `--dz-border`                                 | Bordes                                           |
| `--dz-success`, `--dz-warning`, `--dz-danger` | Estados                                          |
| `--dz-radius`                                 | Radio de las esquinas                            |
| `--dz-font`, `--dz-font-mono`                 | Tipografías                                      |
| `--dz-code-bg`                                | Fondo de los bloques de código                   |
| `--dz-focus`                                  | Anillo de foco (por defecto, el acento)          |

**Modo oscuro automático**: los valores por defecto siguen el `color-scheme` de tu página. Si tu
sitio declara `color-scheme: light dark` (o `dark`), los componentes se adaptan solos.

**Más control**: cada componente expone `::part(...)` para estilizar piezas internas y refleja su
estado como atributo (`dz-approval[status="approved"]`, `dz-thinking-orb[phase="done"]`).

**Orbes**: aceptan cualquier color CSS, por fase o para todas:

```css
dz-thinking-orb {
  --dz-orb-color: var(--dz-accent); /* el orbe toma tu color de marca */
}
dz-thinking-orb[phase="generating"] {
  --dz-orb-color: hotpink;
  --dz-orb-accent: orange; /* núcleo, anillos y partículas */
}
```

---

## Conectar con tu modelo (streaming)

`<dz-markdown>.stream()` reconoce solo el formato de la respuesta:

| Proveedor / formato                           | Detecta                         |
| --------------------------------------------- | ------------------------------- |
| OpenAI Chat Completions y Responses API       | texto y resumen de razonamiento |
| Anthropic Messages                            | texto y `thinking`              |
| Vercel AI SDK (v4 data stream y v5 UI stream) | texto y razonamiento            |
| Texto plano                                   | todo como texto                 |

```js
const md = document.querySelector("dz-markdown");
const pasos = document.querySelector("dz-reasoning");
const paso = pasos.addStep("Pensando");

await md.stream(await fetch("/api/chat", { method: "POST", body }), {
  onReasoning: (delta) => pasos.appendDetail(paso, delta), // el "thinking" del modelo
});
pasos.finish();
```

También acepta un `AsyncIterable<string>`, útil con los SDKs oficiales:

```js
const stream = await openai.chat.completions.create({ model, messages, stream: true });
await md.stream(
  (async function* () {
    for await (const chunk of stream) yield chunk.choices[0]?.delta?.content ?? "";
  })(),
);
```

Sin componentes, los mismos adaptadores están disponibles como funciones:

```js
import { toStreamEvents, toTextStream, parseMarkdown } from "@diplez/ai-web-primitives";

for await (const event of toStreamEvents(await fetch("/api/chat"))) {
  // { type: "text" | "reasoning", delta }
}
```

---

## Idiomas

Inglés (`en`, por defecto) y español (`es`) incluidos: `defineAll({ locale: "es" })`. Cada
`define*()` acepta además `messages` para cambiar cualquier texto, o para traducir a otro idioma:

```js
defineApproval({ messages: { approve: "Autorizar", autoDenyIn: "Se cancela en {seconds} s" } });
```

---

## Uso con frameworks

| Entorno           | Cómo usarlo                                                                                                                         |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **React 19+**     | `defineAll()` una vez y usar las etiquetas. Tipos: `import type {} from "@diplez/ai-web-primitives/react"`                          |
| **Next.js / SSR** | Llamar `defineAll()` dentro de un componente `"use client"` (se registran en el navegador)                                          |
| **Vue 3**         | `isCustomElement: (tag) => tag.startsWith("dz-")` en el plugin de Vue. Tipos: `import type {} from "@diplez/ai-web-primitives/vue"` |
| **Angular**       | Agregar `CUSTOM_ELEMENTS_SCHEMA` al componente                                                                                      |
| **Svelte / HTML** | Funciona directo                                                                                                                    |

**React**: las propiedades (`phase`, `steps`, `content`…) se pasan como props y quedan tipadas. Los
eventos se escuchan con una `ref`:

```tsx
import type {} from "@diplez/ai-web-primitives/react";

function Aprobacion({ onDecision }: { onDecision: (approved: boolean) => void }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current!;
    const handler = (e: Event) => onDecision((e as CustomEvent).detail.decision === "approved");
    el.addEventListener("dz-decision", handler);
    return () => el.removeEventListener("dz-decision", handler);
  }, [onDecision]);
  return <dz-approval ref={ref} heading="Enviar el correo" tone="warning" timeout={20} />;
}
```

El paquete incluye `custom-elements.json` (manifiesto estándar) para autocompletado en VS Code y
herramientas de documentación.

---

## Concepto de arquitectura

El proyecto aplica **Clean Architecture** adaptada a una librería de componentes. La lógica de
cada componente (reglas, estados, máquinas de estado, parsers de streaming, temporizadores) vive
en un **núcleo de TypeScript puro**, sin DOM ni Lit. Los Web Components son solo una capa de
presentación delgada que renderiza lo que el núcleo decide.

Esto permite:

- **Testear la lógica sin navegador** — el dominio y la aplicación se prueban como funciones puras.
- **Intercambiar lo externo** — idioma, reloj, fuente de audio, parser de markdown: todo entra por
  puertos (interfaces) y se reemplaza sin tocar el componente.
- **Sobrevivir a cambios de tecnología** — si Lit se reemplaza mañana, solo cambia `presentation/`.

```
                ┌──────────────────────────────────────────────┐
[Usuario]   ──► │  index.ts / define.ts   (API pública)        │
                │                                              │
                │  composition/   ← arma dependencias y        │
                │                   registra el custom element │
                │                                              │
                │  ┌────────────────────────────────────────┐  │
[Navegador] ◄── │  │ presentation/  Web Components (Lit)    │  │
                │  │                                        │  │
                │  │  ┌──────────────────────────────────┐  │  │
                │  │  │ application/  Casos de uso,      │  │  │
                │  │  │               Puertos, DTOs      │  │  │
                │  │  │  ┌────────────────────────────┐  │  │  │
                │  │  │  │ domain/  Reglas puras      │  │  │  │  ← núcleo puro
                │  │  │  └────────────────────────────┘  │  │  │
                │  │  └──────────────────────────────────┘  │  │
                │  └────────────────────────────────────────┘  │
                │                                              │
[i18n, reloj,   │  infrastructure/  Adaptadores que            │
 audio, APIs] ◄─│                   implementan los puertos    │
                └──────────────────────────────────────────────┘
```

### Las capas

| Capa               | Responsabilidad                                                                                              | Ejemplo actual                                   |
| ------------------ | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------ |
| **domain**         | Tipos, value objects y reglas de negocio puras. No conoce nada externo.                                      | `ThinkingPhase`, `isBusyPhase`, `ThinkingStatus` |
| **application**    | Casos de uso que orquestan el dominio. Define **puertos** (interfaces) para lo externo y **DTOs** de salida. | `GetThinkingStatus`, `ThinkingLabelProvider`     |
| **infrastructure** | **Adaptadores**: implementaciones concretas de los puertos (i18n, `setTimeout`, Web Audio, fetch…).          | `StaticThinkingLabelProvider`                    |
| **presentation**   | Web Components Lit. Reciben casos de uso **inyectados**, renderizan el DTO, emiten eventos.                  | `DzThinkingIndicator`                            |
| **composition**    | _Composition root_: instancia adaptadores + casos de uso, los inyecta y registra el custom element.          | `defineThinkingIndicator()`                      |

### Regla de dependencia

Las capas internas **nunca** conocen a las externas:

| Capa             | Puede depender de                                     |
| ---------------- | ----------------------------------------------------- |
| domain           | Nadie (ni paquetes npm)                               |
| application      | domain                                                |
| infrastructure   | application, domain                                   |
| presentation     | application, domain, `lit`                            |
| composition      | todas las capas                                       |
| `index`/`define` | composition y re-exports de tipos/constantes públicas |

### Inyección de dependencias en Web Components

Un custom element lo instancia el navegador, no nosotros, así que no hay inyección por
constructor. La solución del proyecto:

1. El componente declara sus dependencias como **propiedad estática tipada**
   (`static dependencies?: ThinkingIndicatorDependencies`).
2. La capa de composición crea una **subclase** con las dependencias ya resueltas y registra
   esa subclase con `customElements.define`.
3. Si alguien registra la clase base sin pasar por la composición, el componente falla con un
   error claro que indica qué función usar.

Esto además permite registrar el mismo componente con distinta configuración bajo distintas
etiquetas (p. ej. una en inglés y otra en español).

---

## Cómo se hace cumplir la arquitectura

La arquitectura no depende de la disciplina: la verifican herramientas en cada commit y en CI.

| Qué se verifica                                               | Herramienta                                      | Comando                      |
| ------------------------------------------------------------- | ------------------------------------------------ | ---------------------------- |
| Regla de dependencia entre capas, sin ciclos                  | `dependency-cruiser` (`.dependency-cruiser.cjs`) | `npm run lint:arch`          |
| `domain` y `application` no usan DOM ni globals del navegador | `tsconfig.core.json` (sin lib `DOM`)             | `npm run typecheck`          |
| Nomenclatura, imports de tipos, buenas prácticas de Lit/WC    | ESLint (`eslint.config.js`)                      | `npm run lint`               |
| Formato                                                       | Prettier                                         | `npm run format:check`       |
| Formato de mensajes de commit                                 | `scripts/validate-commit-msg.mjs` (hook)         | automático                   |
| Exports y tipos del paquete correctos                         | `@arethetypeswrong/cli`                          | `npm run check:exports`      |
| Los `*/define` registran componentes también con bundlers     | `scripts/check-side-effects.mjs` (esbuild)       | `npm run check:side-effects` |

Hooks de git (instalados automáticamente con `npm install` vía `simple-git-hooks`):

- **pre-commit**: `npm run lint && npm run typecheck`
- **commit-msg**: valida la [convención de commits](#convención-de-commits)

---

## Estructura del proyecto

Cada capa se organiza por funcionalidad (`thinking`, `orb`, `markdown`, `stream`, `reasoning`,
`approval`, `citation`). Cada archivo tiene su `*.test.ts` al lado.

```
ai-web-primitives/
├── src/
│   ├── index.ts                          # API pública SIN efectos secundarios
│   ├── define.ts                         # Registra todos los componentes (defineAll)
│   │
│   ├── domain/                           # Núcleo puro — sin DOM, sin paquetes npm
│   │   ├── shared/                       # safe-url (anti-XSS), color, template (i18n), dedent
│   │   ├── thinking/                     # Fases del modelo y su estado
│   │   ├── orb/                          # Perfiles por fase, transiciones, geometría del orbe
│   │   ├── markdown/                     # AST + parser tolerante al streaming
│   │   ├── stream/                       # Decodificador SSE + formatos OpenAI/Anthropic/AI SDK
│   │   ├── reasoning/                    # Pasos y progreso del razonamiento
│   │   ├── approval/                     # Decisiones, tonos y cuenta regresiva pausable
│   │   └── citation/                     # Nivel de confianza
│   │
│   ├── application/                      # Casos de uso — solo depende de domain
│   │   ├── ports/                        # Clock, FrameScheduler, MotionPreference,
│   │   │                                 # StreamEventSource, ClipboardWriter, UiMessages…
│   │   ├── dtos/                         # ThinkingStatusDto, OrbFrameDto
│   │   └── use-cases/
│   │       ├── thinking/                 # GetThinkingStatus
│   │       ├── orb/                      # AnimateThinkingOrb, composeOrbFrame
│   │       ├── markdown/                 # StreamMarkdown (agrupa deltas por frame)
│   │       ├── reasoning/                # DescribeReasoning
│   │       └── approval/                 # RunApprovalCountdown
│   │
│   ├── infrastructure/                   # Adaptadores de los puertos
│   │   ├── i18n/                         # Textos en inglés y español
│   │   ├── browser/                      # requestAnimationFrame, matchMedia, reloj, portapapeles
│   │   └── stream/                       # FetchStreamEventSource (Response, ReadableStream…)
│   │
│   ├── presentation/                     # Web Components (Lit): solo pintan y emiten eventos
│   │   ├── theme/theme-tokens.ts         # Tokens --dz-* compartidos (claro/oscuro)
│   │   └── components/
│   │       ├── markdown/                 # <dz-markdown>
│   │       ├── reasoning/                # <dz-reasoning>
│   │       ├── approval/                 # <dz-approval>
│   │       ├── citation/                 # <dz-citation>
│   │       ├── thinking-orb/             # <dz-thinking-orb> + renderer de canvas
│   │       └── thinking-indicator/       # <dz-thinking-indicator>
│   │
│   └── composition/                      # Composition roots
│       ├── shared/locale.ts              # Resuelve idioma y textos
│       ├── define-all.ts                 # defineAll({ locale })
│       ├── stream/stream-helpers.ts      # toStreamEvents / toTextStream
│       └── <componente>/
│           ├── define-<componente>.ts    # Arma dependencias + registra (idempotente)
│           └── define.ts                 # Entry con efecto: registra con valores por defecto
│
├── scripts/
│   ├── validate-commit-msg.mjs           # Hook commit-msg
│   ├── check-exports.mjs                 # attw sin heredar --dry-run
│   ├── check-side-effects.mjs            # Verifica que cada */define registre con bundlers
│   └── generate-framework-types.mjs      # Tipos React/Vue desde custom-elements.json
├── test-types/                           # Verifica que los tipos React/Vue compilen y detecten errores
├── docs/ideas-libreria-componentes-ia.md # Roadmap de componentes
├── .github/workflows/ci.yml              # CI: lo mismo que npm run validate
├── .dependency-cruiser.cjs               # Reglas de capas
├── eslint.config.js
├── tsconfig.json / tsconfig.core.json    # General / pureza de domain + application
├── tsup.config.ts                        # Build ESM + .d.ts
├── vitest.config.ts / vitest.setup.ts    # Tests (jsdom)
└── custom-elements-manifest.config.mjs   # Genera custom-elements.json
```

---

## Flujo de un render

```
<dz-thinking-indicator phase="searching">           (HTML del consumidor)
       │
       ▼
DzThinkingIndicator.render()                        presentation
       │  dependencies.getThinkingStatus.execute({ phase: "searching", customLabel })
       ▼
GetThinkingStatus.execute()                         application
       │  toThinkingPhase("searching")              ← domain: normaliza (inválido → idle)
       │  createThinkingStatus(phase)               ← domain: busy = isBusyPhase(phase)
       │  labelProvider.getLabel(phase)             ← puerto
       ▼                                                    │
StaticThinkingLabelProvider.getLabel()              infrastructure (inyectado por composition)
       │
       ▼
ThinkingStatusDto { phase, busy, label }
       │
       ▼
<div part="indicator" role="status" aria-busy="true" data-phase="searching">
  Searching sources…
</div>
```

---

## Requisitos previos

| Herramienta | Versión mínima                  |
| ----------- | ------------------------------- |
| Node.js     | 18 (desarrollo probado con 24)  |
| npm         | 9                               |
| Git         | 2.30 (necesario para los hooks) |

> **TypeScript está fijado en `~5.9`.** TypeScript 7 (compilador nativo) no expone la API de
> compilador que usan `tsup` (generación de `.d.ts`) y `@arethetypeswrong`. No actualizar a 7
> hasta que esas herramientas lo soporten.

---

## Configuración inicial

```bash
git clone https://github.com/diplez/ai-web-primitives.git
cd ai-web-primitives
npm install          # instala dependencias y los hooks de git
npm run validate     # verifica que todo esté en verde
```

El proyecto no usa variables de entorno ni secretos en desarrollo. El único secreto es el token
de npm para publicar, que **nunca** se guarda en el repositorio (ver
[Publicación en npm](#publicación-en-npm)).

---

## Scripts disponibles

| Script                          | Qué hace                                                                     |
| ------------------------------- | ---------------------------------------------------------------------------- |
| `npm run dev`                   | Build en modo watch                                                          |
| `npm run build`                 | Genera `dist/` (ESM + `.d.ts`), `custom-elements.json` y los tipos React/Vue |
| `npm test`                      | Corre los tests una vez                                                      |
| `npm run test:watch`            | Tests en modo watch                                                          |
| `npm run typecheck`             | Chequeo de tipos general + pureza del núcleo                                 |
| `npm run lint`                  | ESLint + reglas de arquitectura                                              |
| `npm run lint:arch`             | Solo reglas de arquitectura (dependency-cruiser)                             |
| `npm run lint:fix`              | ESLint con autofix                                                           |
| `npm run format`                | Formatea todo con Prettier                                                   |
| `npm run check:exports`         | Verifica que los exports y tipos del paquete resuelvan bien                  |
| `npm run check:side-effects`    | Bundlea cada `*/define` como una app y verifica que registre sus componentes |
| `npm run check:framework-types` | Compila `test-types/` contra los tipos React/Vue publicados                  |
| `npm run validate`              | Todo lo anterior, en el mismo orden que CI                                   |

---

## API pública y versionado

Este paquete sigue **[SemVer](https://semver.org/lang/es/)**. En una librería de Web Components,
la API pública es más que los exports de JavaScript. **Cambiar cualquiera de estos elementos es
un _breaking change_** (versión mayor; menor mientras estemos en `0.x`):

| Elemento de API pública        | Ejemplo                                             |
| ------------------------------ | --------------------------------------------------- |
| Nombres de etiqueta            | `dz-thinking-indicator`                             |
| Atributos y propiedades        | `phase`, `label`                                    |
| Valores aceptados de atributos | `idle`, `analyzing`, …                              |
| Eventos y su `detail`          | `dz-decision` → `{ decision, reason }`              |
| Slots                          | slot por defecto                                    |
| CSS parts                      | `indicator`                                         |
| CSS custom properties          | `--dz-accent`, `--dz-orb-color`                     |
| Exports y subpaths del paquete | `./define`, `./markdown/define`, `./react`, `./vue` |

Lo que **no** es API pública: la estructura interna del Shadow DOM fuera de los `part`, los
archivos dentro de `dist/` que no estén en `exports`, y todo lo que no se re-exporte desde
`src/index.ts`.

### Entradas del paquete

| Import                                           | Efecto secundario | Contenido                                                                        |
| ------------------------------------------------ | ----------------- | -------------------------------------------------------------------------------- |
| `@diplez/ai-web-primitives`                      | No                | Clases, `defineAll()`, `define*()`, `toStreamEvents()`, `parseMarkdown()`, tipos |
| `@diplez/ai-web-primitives/define`               | Sí                | Registra todos los componentes                                                   |
| `@diplez/ai-web-primitives/<componente>/define`  | Sí                | Registra un componente                                                           |
| `@diplez/ai-web-primitives/react`, `/vue`        | No (solo tipos)   | Tipos de las etiquetas para JSX y plantillas de Vue                              |
| `@diplez/ai-web-primitives/custom-elements.json` | —                 | Manifiesto de custom elements                                                    |

El paquete es **solo ESM** (estándar en Web Components). Los consumidores CommonJS deben usar
`import()` dinámico.

---

## Tecnologías y paquetes

| Paquete                                 | Tipo | Propósito                                                 |
| --------------------------------------- | ---- | --------------------------------------------------------- |
| `lit`                                   | prod | Base de los Web Components (única dependencia de runtime) |
| `typescript` (~5.9)                     | dev  | Lenguaje                                                  |
| `tsup`                                  | dev  | Build ESM con code splitting + `.d.ts`                    |
| `vitest` + `jsdom`                      | dev  | Tests unitarios y de componentes                          |
| `@testing-library/jest-dom`             | dev  | Matchers de DOM (`toHaveAttribute`, …)                    |
| `eslint` + `typescript-eslint`          | dev  | Lint y convenciones de nombres                            |
| `eslint-plugin-lit`, `eslint-plugin-wc` | dev  | Buenas prácticas de Lit y Web Components                  |
| `prettier`                              | dev  | Formato                                                   |
| `dependency-cruiser`                    | dev  | Reglas de dependencia entre capas                         |
| `@custom-elements-manifest/analyzer`    | dev  | Genera `custom-elements.json`                             |
| `@arethetypeswrong/cli`                 | dev  | Verifica exports/tipos publicados                         |
| `simple-git-hooks`                      | dev  | Hooks pre-commit y commit-msg                             |

Antes de agregar una **dependencia de runtime** (`dependencies`), justificarla: cada una pesa
en el bundle de todos los consumidores. Preferir implementarla como adaptador en
`infrastructure/` detrás de un puerto.

---

## Estándares de código

### Idioma

| Qué                                                          | Idioma      |
| ------------------------------------------------------------ | ----------- |
| Código: tipos, clases, funciones, variables, archivos        | **Inglés**  |
| API pública: etiquetas, atributos, eventos, parts, CSS props | **Inglés**  |
| Mensajes de error y logs dentro del código                   | **Inglés**  |
| Documentación: README, `docs/`, JSDoc, comentarios           | **Español** |
| Mensajes de commit                                           | **Español** |
| Nombres de tests (`describe`/`it`)                           | **Español** |

Está **prohibido mezclar idiomas dentro de un identificador**:

```ts
// Correcto
export class GetThinkingStatus {}
export function isBusyPhase(phase: ThinkingPhase): boolean {}

// INCORRECTO
export class ObtenerThinkingStatus {} // ❌ mezcla español + inglés
export function esBusyPhase(fase: ThinkingPhase) {} // ❌ identificadores en español
```

### Nomenclatura

| Elemento                       | Convención                      | Ejemplo                                         |
| ------------------------------ | ------------------------------- | ----------------------------------------------- |
| Archivos y carpetas            | `kebab-case`                    | `get-thinking-status.ts`                        |
| Clases, interfaces, tipos      | `PascalCase` (sin prefijo `I`)  | `GetThinkingStatus`, `ThinkingLabelProvider`    |
| Funciones, métodos, variables  | `camelCase`                     | `toThinkingPhase`, `labelProvider`              |
| Constantes globales inmutables | `UPPER_SNAKE_CASE`              | `THINKING_PHASES`, `THINKING_INDICATOR_TAG`     |
| Clase de un custom element     | `Dz` + `PascalCase`             | `DzThinkingIndicator`                           |
| Etiqueta de un custom element  | `dz-` + `kebab-case`            | `dz-thinking-indicator`                         |
| Archivo de un custom element   | igual que la etiqueta           | `dz-thinking-indicator.ts`                      |
| Estilos de un custom element   | `<etiqueta>.styles.ts`          | `dz-thinking-indicator.styles.ts`               |
| Eventos                        | `dz-` + `kebab-case`            | `dz-approve`, `dz-phase-change`                 |
| CSS custom properties          | `--dz-<componente>-<propiedad>` | `--dz-thinking-color`                           |
| CSS parts                      | `kebab-case`, sin prefijo       | `indicator`, `cancel-button`                    |
| Casos de uso                   | `Verbo` + `Sustantivo`          | `GetThinkingStatus`, `StartApprovalCountdown`   |
| Puertos                        | sustantivo del rol              | `ThinkingLabelProvider`, `Clock`, `AudioSource` |
| Adaptadores                    | tecnología/estrategia + puerto  | `StaticThinkingLabelProvider`, `BrowserClock`   |
| Composición                    | `define` + componente           | `defineThinkingIndicator`                       |
| Tests                          | junto al archivo, `.test.ts`    | `get-thinking-status.test.ts`                   |

ESLint (`@typescript-eslint/naming-convention`) hace cumplir la parte verificable automáticamente.

### Reglas por capa

**domain**

- Solo TypeScript puro: sin DOM, sin `lit`, sin paquetes npm, sin `Date.now()`/`Math.random()`
  directos (si hacen falta, entran como parámetro o por un puerto en `application`).
- Preferir funciones puras y objetos inmutables (`Object.freeze`, `readonly`).
- Los valores inválidos que llegan desde HTML **se normalizan, no lanzan** (como hace el propio
  HTML: `<input type="foo">` se comporta como `text`). Errores de programación (uso incorrecto de
  la API desde JS) sí pueden lanzar.

**application**

- Un caso de uso = una clase con un único método público `execute(input)`.
- Las dependencias externas se reciben **por constructor**, tipadas como puertos (interfaces).
- Devuelve **DTOs** (`interface` con propiedades `readonly`), nunca entidades mutables.
- Sin DOM ni Lit (verificado por `tsconfig.core.json`).

**infrastructure**

- Cada adaptador implementa (`implements`) un puerto de `application/ports/`.
- Toda interacción con APIs del navegador (`setTimeout`, `requestAnimationFrame`, Web Audio,
  `fetch`, `navigator.language`…) vive aquí.
- Sin lógica de negocio: solo traduce entre el puerto y la tecnología concreta.

**presentation**

- Los componentes **no instancian** casos de uso ni adaptadores: los reciben vía
  `static dependencies`.
- `render()` llama a casos de uso y pinta el DTO; sin reglas de negocio en el template.
- Si no hay nada que orquestar ni puertos que usar, puede llamar directamente a funciones
  **puras** del dominio (p. ej. `parseMarkdown`, `sanitizeHref`). Lo que nunca hace es decidir
  reglas por su cuenta ni hablar con el navegador fuera de su propio DOM (timers, red, portapapeles
  → puertos).
- Estilos sobre los tokens de `presentation/theme/theme-tokens.ts` (`--_accent`, `--_text`…), nunca
  con colores fijos: así el consumidor cambia la marca con `--dz-accent`.
- Métodos públicos sin chocar con la API del DOM (por eso `appendText()` y no `append()`).
- Nunca acceder a `window`/`document` a nivel de módulo (rompe SSR).

**composition**

- El único lugar donde se usa `new` sobre adaptadores y casos de uso.
- `define<Componente>()` siempre es **idempotente** y acepta `tagName` y `registry` opcionales.

### Imports

- Rutas relativas con extensión **`.js`** (requisito de ESM): `import { x } from "./file.js"`.
- Imports de solo tipo con `type` (`import type { … }` o `{ type X }`); lo exige ESLint.
- Sin _barrels_ internos (`index.ts` por carpeta): solo existe `src/index.ts` como API pública.

### Manejo de errores

- No usar `console.*` (ESLint lo prohíbe). Una librería no debe ensuciar la consola del consumidor.
- Errores de mal uso: `throw new Error("<dz-x> … Use defineX().")` con mensaje accionable en inglés.

---

## Estándares de componentes

Todo componente nuevo debe cumplir:

1. **Accesibilidad**: roles y atributos ARIA correctos (`role="status"`, `aria-live`,
   `aria-busy`, foco gestionable con teclado en los interactivos). Es requisito, no extra.
2. **Atributos de estado reflejados** (`reflect: true`) para que el consumidor pueda estilizar
   por estado: `dz-x[state="…"]`.
3. **API de estilos explícita**: `part` en los elementos estilizables y `--dz-*` para tokens.
   Documentados con `@csspart` y `@cssprop` en el JSDoc de la clase.
4. **Eventos** como `CustomEvent` con prefijo `dz-`, `bubbles: true` y `composed: true`
   (para que crucen el Shadow DOM); el `detail` es un objeto tipado. Documentados con `@fires`.
5. **Slots** para contenido personalizable, con contenido por defecto razonable.
6. **JSDoc completo** de la clase (`@tag`, `@slot`, `@csspart`, `@cssprop`, `@fires`): de ahí se
   genera `custom-elements.json`.
7. **`:host([hidden]) { display: none }`** en los estilos.
8. **Sin estilos de marca impuestos**: estilos mínimos y estructurales; el look lo decide el consumidor.

---

## Tests

| Capa           | Qué se prueba                               | Cómo                                         |
| -------------- | ------------------------------------------- | -------------------------------------------- |
| domain         | Reglas y normalizaciones                    | Funciones puras, sin DOM                     |
| application    | Casos de uso                                | Con **puertos falsos** (objetos literales)   |
| infrastructure | Adaptadores                                 | Contra la API real o simulada del navegador  |
| presentation   | Render, ARIA, reflejo de atributos, eventos | Subclase con **caso de uso falso**, en jsdom |
| composition    | Integración de las 4 capas + registro       | Con las piezas reales                        |

- Los tests viven junto al archivo que prueban (`*.test.ts`).
- Los nombres de `describe`/`it` van en español y describen comportamiento.
- Todo caso de uso y todo componente nuevo debe llegar con sus tests.

---

## Cómo agregar un nuevo componente

Ejemplo: `<dz-approval-card>`, una tarjeta que pide confirmación con cuenta regresiva.

### 1. Domain — reglas puras

```ts
// src/domain/approval/approval-countdown.ts
export interface ApprovalCountdown {
  readonly remainingSeconds: number;
  readonly expired: boolean;
}

export function tickCountdown(countdown: ApprovalCountdown): ApprovalCountdown {
  const remainingSeconds = Math.max(0, countdown.remainingSeconds - 1);
  return Object.freeze({ remainingSeconds, expired: remainingSeconds === 0 });
}
```

### 2. Application — puerto, DTO y caso de uso

```ts
// src/application/ports/clock.ts
export interface Clock {
  every(milliseconds: number, callback: () => void): () => void; // devuelve "cancel"
}

// src/application/use-cases/approval/start-approval-countdown.ts
export class StartApprovalCountdown {
  constructor(private readonly clock: Clock) {}

  execute(input: { seconds: number; onTick: (dto: ApprovalCountdownDto) => void }): () => void {
    // usa tickCountdown() del dominio y this.clock.every(...)
  }
}
```

### 3. Infrastructure — adaptador del puerto

```ts
// src/infrastructure/time/browser-clock.ts
export class BrowserClock implements Clock {
  every(milliseconds: number, callback: () => void): () => void {
    const id = setInterval(callback, milliseconds);
    return () => clearInterval(id);
  }
}
```

### 4. Presentation — el custom element

```ts
// src/presentation/components/approval-card/dz-approval-card.ts
/**
 * @tag dz-approval-card
 * @fires dz-approve - El usuario aprobó la acción.
 * @fires dz-deny - El usuario denegó la acción o expiró el tiempo.
 * @csspart card - Contenedor de la tarjeta.
 */
export class DzApprovalCard extends LitElement {
  static dependencies?: { startApprovalCountdown: Pick<StartApprovalCountdown, "execute"> };
  // ...
}
```

### 5. Composition — armar y registrar

```ts
// src/composition/approval-card/define-approval-card.ts
export const APPROVAL_CARD_TAG = "dz-approval-card";

export function defineApprovalCard(options: DefineApprovalCardOptions = {}) {
  // new StartApprovalCountdown(new BrowserClock()) → subclase con dependencies → registry.define
}

// src/composition/approval-card/define.ts
defineApprovalCard();
```

### 6. Exponer en la API pública

- Re-exportar en `src/index.ts` (`defineApprovalCard`, `APPROVAL_CARD_TAG`, `DzApprovalCard`, tipos).
- Llamar `defineApprovalCard()` en `src/define.ts` (una llamada explícita, **nunca** `import "./composition/approval-card/define.js"`: los bundlers descartarían ese import y el componente no se registraría).
- Agregar en `package.json → exports`:
  `"./approval-card/define": { "types": "./dist/composition/approval-card/define.d.ts", "default": "./dist/composition/approval-card/define.js" }`.
- Agregar el componente a la tabla de [componentes disponibles](#componentes-disponibles).

### 7. Validar

```bash
npm run validate
```

---

## Convención de commits

Todos los commits siguen **Conventional Commits** con una sección `CAMBIOS:` obligatoria. El
hook `commit-msg` lo valida automáticamente.

```
<tipo>(<alcance opcional>): texto descriptivo corto

CAMBIOS:
       - descripción cambio 1
       - descripción cambio 2
```

### Tipos permitidos

| Tipo       | Cuándo usarlo                                                  |
| ---------- | -------------------------------------------------------------- |
| `feat`     | Nuevo componente, caso de uso o funcionalidad                  |
| `fix`      | Corrección de un bug                                           |
| `refactor` | Cambio de código que no agrega funcionalidad ni corrige un bug |
| `perf`     | Mejora de rendimiento                                          |
| `test`     | Añadir o corregir tests                                        |
| `docs`     | Cambios exclusivamente en documentación                        |
| `style`    | Formato, espaciado, orden de imports — sin cambio de lógica    |
| `build`    | Build, empaquetado, `package.json → exports`                   |
| `ci`       | Pipelines de CI                                                |
| `chore`    | Mantenimiento: dependencias, configuración, scripts            |

**Alcance** (opcional): el componente o la capa afectada — `feat(approval-card): …`,
`refactor(domain): …`.

**Breaking change**: agregar `!` después del tipo/alcance — `feat(thinking-indicator)!: renombrar atributo state a phase` — y explicar la migración en `CAMBIOS:`.

### Ejemplos

```
feat(thinking-indicator): agregar etiquetas en español

CAMBIOS:
       - SPANISH_THINKING_LABELS en infrastructure/i18n
       - defineThinkingIndicator acepta la opción labels
```

```
fix(domain): tratar fase vacía como idle

CAMBIOS:
       - toThinkingPhase normaliza string vacío
```

### Reglas

- La descripción va en **minúsculas** y **sin punto final**.
- Máximo **72 caracteres** en la primera línea.
- La segunda línea va **vacía**.
- La sección `CAMBIOS:` es **obligatoria**, con al menos un ítem.
- Un commit = un propósito. No mezclar `feat` + `fix` en el mismo commit.

---

## Publicación en npm

1. Iniciar sesión con la cuenta dueña del scope `@diplez`: `npm login`.
2. Actualizar la versión según SemVer: `npm version patch|minor|major` (crea el tag de git).
3. Publicar: `npm publish` — `prepublishOnly` corre `npm run validate` y aborta si algo falla.
   `publishConfig.access = "public"` ya está configurado (necesario para paquetes con scope).
4. Subir el tag: `git push --follow-tags`.

Para publicar desde CI, usar un **token de automatización** de npm guardado como secreto del
repositorio (`NPM_TOKEN`), nunca en archivos del proyecto.

---

## Licencia

[MIT](LICENSE) © diplez

## Repositorio

```
https://github.com/diplez/ai-web-primitives.git
```
