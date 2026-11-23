# Ideas vanguardistas para nuevos paquetes

Componentes que hoy casi ninguna librería ofrece, agrupados en posibles paquetes del monorepo.
Complementan el roadmap original ([`ideas-libreria-componentes-ia.md`](ideas-libreria-componentes-ia.md)):
lo que ya está ahí (formularios generativos, diff, voz básica) solo aparece cuando se lleva un
paso más lejos.

> Estado: el **paquete A** está en desarrollo (`packages/ai-agent-ui`), empezando por
> `<dz-tool-call>` y `<dz-agent-timeline>`.

---

## Paquete A: `@diplez/ai-agent-ui` — ver y controlar agentes autónomos

Los agentes que trabajan solos durante minutos son la tendencia más fuerte, y casi nadie tiene
UI para supervisarlos.

1. **`<dz-agent-timeline>` — la "caja negra" del agente.** Línea de tiempo con todo lo que hizo
   (herramientas usadas, archivos tocados, decisiones). Se puede **arrastrar hacia atrás** y ver
   el estado en cada punto, como rebobinar un video, y **bifurcar** desde ahí: "vuelve a este
   paso y prueba otro camino".
2. **`<dz-agent-swarm>` — varios agentes a la vez.** Mapa vivo de agentes en paralelo: quién le
   pasa trabajo a quién, quién está bloqueado y quién terminó. Nodos que laten como los orbes,
   conectados por líneas donde viajan partículas.
3. **`<dz-tool-call>` — llamada a herramienta en vivo.** Muestra los argumentos llegando en
   streaming, el estado "ejecutando" y el resultado expandible. Lo que hoy se ve en Claude o
   ChatGPT, listo para cualquier app.
4. **`<dz-budget-meter>` — medidor de gasto.** Tokens, costo y tiempo consumidos en vivo, con
   límites. Al acercarse al tope avisa con un pulso visual y pide permiso para seguir
   (integrado con `<dz-approval>`).

## Paquete B: `@diplez/ai-trust-ui` — confianza y transparencia

Con regulaciones como la ley de IA europea, mostrar por qué responde la IA y qué tan segura está
pasa a ser obligatorio en muchos productos.

5. **`<dz-confidence-text>` — texto que muestra su propia certeza.** Cada frase de la respuesta
   lleva un subrayado sutil según la seguridad del modelo: sólido si está seguro, punteado si
   duda. Al pasar el mouse explica por qué ("sin fuente", "contradice la cita 2"). Único en el
   mercado.
6. **`<dz-source-graph>` — mapa de fuentes.** En vez de una lista de citas, un grafo que muestra
   qué afirmación viene de qué documento y dónde dos fuentes se contradicen.
7. **`<dz-ai-badge>` — sello de contenido generado.** Marca qué partes de un texto, imagen o
   formulario hizo la IA y cuáles un humano. Al abrirlo muestra modelo, fecha y prompt, como una
   etiqueta nutricional.

## Paquete C: `@diplez/ai-ambient-ui` — interfaces que se sienten vivas

Sigue la línea de los orbes, la parte más llamativa de `@diplez/ai-web-primitives`.

8. **`<dz-presence>` — la IA como presencia.** Forma animada que reacciona a la voz: escucha
   (se inclina hacia ti), piensa, habla (sincronizada con el audio) y se puede interrumpir. La
   evolución del orbe para asistentes de voz, al estilo del modo voz de ChatGPT.
9. **`<dz-living-surface>` — fondo que refleja lo que hace la IA.** Fondo generativo para toda
   la app que cambia sutilmente según el estado: calmo en reposo, corrientes cuando busca,
   energía cuando genera. La interfaz entera "respira" con el modelo.
10. **`<dz-ghost-cursor>` — cursor de la IA.** Cuando un agente opera la interfaz (llena campos,
    pulsa botones), un cursor fantasma muestra dónde está actuando en vivo, con estela. Pensado
    para los agentes que usan la web en nombre del usuario.
11. **`<dz-morph-text>` — texto que se reescribe.** Cuando la IA corrige o mejora un texto, las
    palabras se transforman en su lugar con una animación en vez de reemplazarse de golpe: se
    ve qué cambió sin necesidad de un diff.

---

## Prioridad sugerida

| Orden | Qué                                                | Por qué                                         |
| ----- | -------------------------------------------------- | ----------------------------------------------- |
| 1     | Paquete A: `<dz-tool-call>`, `<dz-agent-timeline>` | Mayor demanda real hoy                          |
| 2     | `<dz-confidence-text>` (paquete B)                 | La idea más original; muy demostrable en un GIF |
| 3     | `<dz-presence>` (paquete C)                        | Máximo impacto visual; reutiliza los orbes      |

---

# Segunda ronda: ideas originales

Conceptos que, hasta donde sabemos, ninguna librería ofrece como componente. Hay prototipos
interactivos de todos ellos (página local de validación visual).

## Paquete D: `@diplez/ai-steer-ui` — dirigir la respuesta sin escribir otro prompt

> Estado: **`<dz-answer-dial>` y `<dz-intent-lens>` implementados** (`packages/ai-steer-ui`).

1. **`<dz-intent-lens>` — "esto es lo que entendí".** Antes de actuar, la IA muestra su
   interpretación en fichas editables (objetivo, restricciones, suposiciones). El usuario
   corrige una ficha y la IA sigue con eso.
2. **`<dz-answer-dial>` — perillas para la respuesta.** _Más corto ↔ más largo_, _simple ↔
   técnico_, _casual ↔ formal_. Al girar, el texto se transforma en su lugar, palabra por
   palabra.
3. **`<dz-what-if>` — ¿y si cambio este dato?** Los datos de una respuesta quedan editables
   dentro del texto; al cambiar uno, solo se actualizan las partes que dependían de él.

## Paquete E: `@diplez/ai-undo-ui` — deshacer lo que hizo la IA, pieza por pieza

4. **`<dz-trust-receipt>` — el recibo del agente.** Cada acción, su costo y quién la aprobó, con
   un botón de deshacer por línea.
5. **`<dz-selective-undo>` — deshacer una sola cosa del medio**, avisando qué otros cambios
   dependían de ella.

## Paquete F: `@diplez/ai-memory-ui` — lo que la IA sabe de ti, a la vista

6. **`<dz-memory-shelf>` — el estante de recuerdos.** Cada recuerdo muestra de dónde salió, se
   desvanece si no se usa y se puede fijar, editar u olvidar.
7. **`<dz-context-jar>` — el frasco del contexto.** La memoria de trabajo del modelo como un
   frasco que se llena; el usuario arrastra fuera lo que no importa.

## Paquete G: `@diplez/ai-ask-ui` — preguntar señalando

8. **`<dz-circle-to-ask>` — encierra y pregunta.** El usuario encierra cualquier parte de la app
   y pregunta sobre eso; la IA recibe la región y su contenido.
9. **`<dz-ghost-draft>` — borrador fantasma que se pinta.** La IA propone texto translúcido y el
   usuario pasa el cursor como un pincel sobre las palabras que quiere conservar.

## Paquete H: `@diplez/ai-jury-ui` — cuando una sola respuesta no alcanza

10. **`<dz-consensus>` — el jurado.** Varios modelos responden lo mismo y cada frase muestra
    cuántos estuvieron de acuerdo; las frases en disputa muestran las versiones alternativas.
