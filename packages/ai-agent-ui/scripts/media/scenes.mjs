// Escenas que graba `npm run media` para los GIFs del README (código de navegador).
// Cada escena monta componentes en #stage y expone window.runScene(), que la anima y resuelve al
// terminar. act() le pide al grabador que mueva el mouse de verdad (ver scripts/record-media.mjs).
import { defineAll } from "../../dist/index.js";

defineAll();

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const stage = document.querySelector("#stage");
const act = (action) => (window.__actions ??= []).push(action);

/** Envía un texto en fragmentos, como llegan los argumentos de una llamada a herramienta. */
async function streamArgs(toolCall, text, chunk = 3, delay = 45) {
  for (let i = 0; i < text.length; i += chunk) {
    toolCall.appendArgs(text.slice(i, i + chunk));
    await wait(delay);
  }
}

const scenes = {
  "tool-call": {
    width: 640,
    setup() {
      stage.innerHTML = `
        <dz-tool-call id="search" name="search_docs" open></dz-tool-call>
        <dz-tool-call id="tests" name="run_tests" hidden></dz-tool-call>`;
    },
    async run() {
      const search = stage.querySelector("#search");
      const tests = stage.querySelector("#tests");
      await wait(500);
      await streamArgs(search, '{"query": "cursor pagination", "limit": 3}');
      await wait(300);
      search.run();
      await wait(1400);
      search.complete({ total: 2, top: "API guide", score: 0.92 });
      await wait(1600);

      tests.hidden = false;
      await streamArgs(tests, '{"path": "tests/pagination.test.ts"}', 4, 40);
      tests.run();
      await wait(1500);
      tests.fail("2 of 14 tests failed: empty cursor at the end of the list.");
      tests.open = true;
      await wait(2200);
    },
  },

  "agent-timeline": {
    width: 640,
    setup() {
      stage.innerHTML = `<dz-agent-timeline
        id="timeline"
        forkable
        style="--dz-timeline-max-height: 420px"
      ></dz-agent-timeline>`;
    },
    async run() {
      const timeline = stage.querySelector("#timeline");
      const start = Date.now();
      const at = (seconds) => start + seconds * 1000;
      const events = [
        { kind: "message", title: "Request: add pagination to /orders", at: at(0) },
        {
          kind: "tool",
          title: "search_docs · cursor pagination",
          detail: "2 results",
          at: at(4),
        },
        { kind: "file", title: "Read src/api/orders.ts", at: at(9) },
        {
          kind: "decision",
          title: "Use an opaque base64 cursor",
          detail: "Avoids exposing internal IDs.",
          at: at(15),
        },
        { kind: "file", title: "Edited src/api/orders.ts (+48 −6)", at: at(31) },
        { kind: "error", title: "run_tests · 2 of 14 failed", at: at(46) },
      ];
      await wait(400);
      for (const event of events) {
        timeline.addEvent(event);
        await wait(550);
      }
      await wait(700);

      // Rebobinar hasta la decisión.
      for (const index of [4, 3]) {
        timeline.select(index);
        await wait(650);
      }
      await wait(900);
      act({ type: "click", selector: "#timeline >>> .fork" });
      timeline.addEventListener(
        "dz-fork",
        (event) => {
          timeline.addEvent({
            kind: "checkpoint",
            title: `Retry from step ${event.detail.index + 1}`,
            detail: "Trying a cursor based on creation date.",
            at: at(52),
          });
          timeline.goLive();
        },
        { once: true },
      );
      await wait(900);
      act({ type: "leave" });
      await wait(1800);
    },
  },
};

const scene = scenes[location.hash.slice(1)];
stage.style.width = `${scene.width}px`;
scene.setup();
window.runScene = () => scene.run();
