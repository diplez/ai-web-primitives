import { normalizeDials } from "../../domain/dial/dial.js";
import { ENGLISH_UI_MESSAGES } from "../../infrastructure/i18n/ui-messages.js";
import { AnswerDialSession } from "./answer-dial/answer-dial-session.js";
import { MORPH_TIMING, planMorph } from "./answer-dial/plan-morph.js";

const dials = normalizeDials(["length"], ENGLISH_UI_MESSAGES.answerDial.presets);

describe("AnswerDialSession", () => {
  it("en el centro devuelve la respuesta original", () => {
    const session = new AnswerDialSession();
    session.start("Original answer");
    expect(session.select(dials, { length: 2 })).toMatchObject({
      kind: "original",
      text: "Original answer",
    });
  });

  it("pide la reescritura una vez y después la recuerda", () => {
    const session = new AnswerDialSession();
    session.start("Original");
    const first = session.select(dials, { length: 1 });
    expect(first.kind).toBe("request");
    expect(session.pending).toBe(true);
    expect(session.resolve(first.key, "Short")).toBe(true);
    expect(session.pending).toBe(false);
    expect(session.select(dials, { length: 1 })).toMatchObject({ kind: "cached", text: "Short" });
  });

  it("guarda pero no muestra una reescritura que llegó tarde", () => {
    const session = new AnswerDialSession();
    session.start("Original");
    const old = session.select(dials, { length: 1 });
    const current = session.select(dials, { length: 0 });
    expect(session.resolve(old.key, "Short")).toBe(false);
    expect(session.pending).toBe(true);
    expect(session.resolve(current.key, "Tiny")).toBe(true);
    expect(session.select(dials, { length: 1 })).toMatchObject({ kind: "cached", text: "Short" });
  });

  it("una respuesta nueva olvida las reescrituras", () => {
    const session = new AnswerDialSession();
    session.start("Original");
    const request = session.select(dials, { length: 1 });
    session.resolve(request.key, "Short");
    session.start("Another answer");
    expect(session.select(dials, { length: 1 }).kind).toBe("request");
    expect(session.originalText).toBe("Another answer");
  });

  it("reject solo afecta a la reescritura vigente", () => {
    const session = new AnswerDialSession();
    session.start("Original");
    const old = session.select(dials, { length: 1 });
    session.select(dials, { length: 0 });
    expect(session.reject(old.key)).toBe(false);
    expect(session.pending).toBe(true);
  });
});

describe("planMorph", () => {
  it("separa lo que se va de lo que entra, con cascada", () => {
    const plan = planMorph("the quick fox", "the slow brown fox", false);
    expect(plan.instant).toBe(false);
    expect(plan.leaving.map((token) => token.op)).toEqual(["keep", "delete", "keep"]);
    const inserted = plan.entering.filter((token) => token.op === "insert");
    expect(inserted.map((token) => token.text.trim())).toEqual(["slow", "brown"]);
    expect(inserted[0]!.delay).toBe(0);
    expect(inserted[1]!.delay).toBe(MORPH_TIMING.stagger / 2);
  });

  it("es instantáneo sin cambios, con movimiento reducido o al mostrar el primer texto", () => {
    expect(planMorph("same", "same", false).instant).toBe(true);
    expect(planMorph("a", "b", true).instant).toBe(true);
    expect(planMorph("", "first answer", false).instant).toBe(true);
  });
});
