// Escenas que graba `npm run media` para los GIFs del README (código de navegador).
// Cada escena monta componentes en #stage y expone window.runScene(), que la anima y resuelve al
// terminar. act() le pide al grabador que mueva el mouse de verdad (ver scripts/record-media.mjs).
import { defineAll } from "../../dist/index.js";

defineAll({ locale: "es" });

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const stage = document.querySelector("#stage");
const act = (action) => (window.__actions ??= []).push(action);

async function* typeOut(text, chunk = 4, delay = 28) {
  for (let i = 0; i < text.length; i += chunk) {
    yield text.slice(i, i + chunk);
    await wait(delay);
  }
}

const VARIANTS = [
  "sphere",
  "nebula",
  "atom",
  "wave",
  "crystal",
  "lava",
  "gyro",
  "swarm",
  "pixel",
  "halo",
  "corona",
  "enso",
];

const scenes = {
  orbs: {
    width: 600,
    setup() {
      stage.innerHTML = `
        <div class="caption">fase: <b id="phase">analyzing</b></div>
        <div class="grid">${VARIANTS.map(
          (v) =>
            `<figure><dz-thinking-orb variant="${v}" phase="analyzing"></dz-thinking-orb><figcaption>${v}</figcaption></figure>`,
        ).join("")}</div>`;
    },
    async run() {
      const orbs = [...stage.querySelectorAll("dz-thinking-orb")];
      for (const phase of ["analyzing", "searching", "generating", "done"]) {
        stage.querySelector("#phase").textContent = phase;
        for (const orb of orbs) orb.phase = phase;
        await wait(1700);
      }
    },
  },

  markdown: {
    width: 640,
    setup() {
      stage.innerHTML = `<dz-markdown id="md"></dz-markdown>`;
    },
    async run() {
      const md = stage.querySelector("#md");
      await wait(300);
      await md.stream(
        typeOut(`## Paginación por cursor

Cada respuesta trae un **\`next_cursor\`**. Envíalo en la siguiente petición hasta que sea \`null\`.

\`\`\`ts
let cursor: string | null = null;
do {
  const page = await api.list({ cursor });
  cursor = page.next_cursor;
} while (cursor);
\`\`\`

| Parámetro | Por defecto | Máximo |
|:--|--:|--:|
| \`limit\` | 50 | 200 |`),
      );
      await wait(1800);
    },
  },

  reasoning: {
    width: 600,
    setup() {
      stage.innerHTML = `<dz-reasoning id="steps" open></dz-reasoning>`;
    },
    async run() {
      const steps = stage.querySelector("#steps");
      await wait(400);
      const read = steps.addStep("Leyendo la pregunta");
      await wait(1100);
      steps.appendDetail(read, "Pregunta sobre paginación de la API REST.");
      steps.updateStep(read, { status: "done" });
      const search = steps.addStep("Buscando en la documentación");
      for (const hit of ["docs/pagination.md", " · docs/limits.md", " · changelog v2.3"]) {
        await wait(650);
        steps.appendDetail(search, hit);
      }
      steps.updateStep(search, { status: "done" });
      const write = steps.addStep("Redactando la respuesta");
      await wait(1500);
      steps.updateStep(write, { status: "done" });
      steps.finish();
      await wait(1000);
      steps.open = false;
      await wait(1600);
    },
  },

  approval: {
    width: 600,
    setup() {
      stage.innerHTML = `
        <dz-approval id="card" heading="Enviar el correo a 120 clientes" tone="warning" timeout="8">
          El agente quiere enviar la campaña <b>“Novedades de noviembre”</b>.
          <pre slot="details">send_email(list="clientes", template="nov-2026")</pre>
        </dz-approval>`;
    },
    async run() {
      await wait(3600);
      act({ type: "click", selector: "#card >>> button.approve" });
      await wait(2400);
    },
  },

  citation: {
    width: 620,
    height: 330,
    setup() {
      stage.innerHTML = `
        <p class="answer">La API usa paginación por cursor<dz-citation index="1" source="Guía de la API"
          href="https://docs.example.com/pagination"
          snippet="Use the cursor returned in the previous page to request the next one."
          confidence="0.92"></dz-citation> y permite hasta 200 elementos por página<dz-citation index="2"
          source="Límites de uso" href="https://docs.example.com/limits"
          snippet="The maximum page size is 200 items; the default is 50."
          confidence="0.78"></dz-citation>.</p>`;
    },
    async run() {
      await wait(1000);
      act({ type: "hover", selector: 'dz-citation[index="1"]' });
      await wait(2600);
      act({ type: "leave" });
      await wait(700);
      act({ type: "hover", selector: 'dz-citation[index="2"]' });
      await wait(2600);
      act({ type: "leave" });
      await wait(900);
    },
  },
};

const scene = scenes[location.hash.slice(1)];
stage.style.width = `${scene.width}px`;
if (scene.height) stage.style.minHeight = `${scene.height}px`;
scene.setup();
window.runScene = () => scene.run();
