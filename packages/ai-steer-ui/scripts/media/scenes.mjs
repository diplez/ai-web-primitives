// Escenas que graba `npm run media` para los GIFs del README (código de navegador).
// Cada escena monta componentes en #stage y expone window.runScene(), que la anima y resuelve al
// terminar. act() le pide al grabador que mueva el mouse de verdad (ver scripts/record-media.mjs).
import { defineAll } from "../../dist/index.js";

defineAll();

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const stage = document.querySelector("#stage");

const ORIGINAL =
  "A cache keeps a copy of data that is read often in a faster place, like memory instead of a database. When the app needs that data again, it reads the copy first, which makes pages load faster and takes work off the database.";

// Reescrituras simuladas por posición de las perillas (lo que devolvería el modelo).
const REWRITES = {
  "length=1&level=2":
    "A cache keeps a copy of often-read data in a faster place, so pages load faster and the database does less work.",
  "length=0&level=2": "A cache keeps a fast copy of popular data so apps load faster.",
  "length=0&level=1": "A cache is a shortcut: it keeps popular things close so apps feel faster.",
  "length=0&level=3":
    "A cache stores hot data in a faster tier to cut read latency and offload the database.",
  "length=0&level=4":
    "A cache serves hot keys from an in-memory tier, cutting p99 latency and offloading primary storage reads.",
};

const scenes = {
  "answer-dial": {
    width: 680,
    setup() {
      stage.innerHTML = `<dz-answer-dial id="dial" settle-delay="250"></dz-answer-dial>`;
      const dial = stage.querySelector("#dial");
      dial.text = ORIGINAL;
      dial.rewrite = async ({ values }) => {
        await wait(650);
        return REWRITES[`length=${values.length}&level=${values.level}`] ?? ORIGINAL;
      };
    },
    async run() {
      const dial = stage.querySelector("#dial");
      const settle = () => wait(250 + 650 + 1500);
      await wait(900);
      dial.setDial("length", 1);
      await settle();
      dial.setDial("length", 0);
      await settle();
      dial.setDial("level", 1);
      await settle();
      dial.setDial("level", 3);
      await settle();
      dial.setDial("level", 4);
      await settle();
      dial.reset();
      await wait(2000);
    },
  },
};

const scene = scenes[location.hash.slice(1)];
stage.style.width = `${scene.width}px`;
scene.setup();
window.runScene = () => scene.run();
