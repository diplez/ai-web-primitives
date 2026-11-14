import type { Clock } from "../../application/ports/clock.js";
import { RunApprovalCountdown } from "../../application/use-cases/approval/run-approval-countdown.js";
import { DescribeReasoning } from "../../application/use-cases/reasoning/describe-reasoning.js";
import { ENGLISH_UI_MESSAGES } from "../../infrastructure/i18n/ui-messages.js";
import { DzApproval } from "./approval/dz-approval.js";
import { DzCitation } from "./citation/dz-citation.js";
import { DzReasoning } from "./reasoning/dz-reasoning.js";

class FakeClock implements Clock {
  time = 0;
  callbacks = new Map<() => void, number>();
  now(): number {
    return this.time;
  }
  every(milliseconds: number, callback: () => void): () => void {
    this.callbacks.set(callback, milliseconds);
    return () => this.callbacks.delete(callback);
  }
  advance(milliseconds: number): void {
    const target = this.time + milliseconds;
    while (this.time < target) {
      this.time = Math.min(target, this.time + 100);
      for (const callback of [...this.callbacks.keys()]) callback();
    }
  }
}

const clock = new FakeClock();

class TestReasoning extends DzReasoning {
  static override dependencies = {
    describeReasoning: new DescribeReasoning(ENGLISH_UI_MESSAGES.reasoning),
    clock,
  };
}
class TestApproval extends DzApproval {
  static override dependencies = {
    runApprovalCountdown: new RunApprovalCountdown(clock),
    messages: ENGLISH_UI_MESSAGES.approval,
  };
}
class TestCitation extends DzCitation {
  static override dependencies = { clock, messages: ENGLISH_UI_MESSAGES.citation };
}
customElements.define("test-reasoning", TestReasoning);
customElements.define("test-approval", TestApproval);
customElements.define("test-citation", TestCitation);

async function mount<T extends HTMLElement & { updateComplete: Promise<boolean> }>(
  html: string,
  selector: string,
): Promise<T> {
  document.body.innerHTML = html;
  const element = document.querySelector<T>(selector)!;
  await element.updateComplete;
  return element;
}

describe("DzReasoning", () => {
  it("acepta pasos por atributo JSON", async () => {
    const element = await mount<DzReasoning>(
      `<test-reasoning steps='["Leer","Buscar"]'></test-reasoning>`,
      "test-reasoning",
    );
    const root = element.shadowRoot!;
    expect(root.querySelectorAll("li")).toHaveLength(2);
    expect(root.querySelector(".progress")).toHaveTextContent("2 of 2 steps");
  });

  it("mide el tiempo mientras piensa y lo muestra al terminar", async () => {
    clock.time = 0;
    const element = await mount<DzReasoning>(
      "<test-reasoning open></test-reasoning>",
      "test-reasoning",
    );
    const first = element.addStep("Reading files");
    await element.updateComplete;
    expect(element.shadowRoot!.querySelector(".headline")).toHaveTextContent("Thinking…");
    expect(element.shadowRoot!.querySelector('[data-status="running"]')).not.toBeNull();

    element.appendDetail(first, "src/index.ts");
    clock.advance(3000);
    element.finish();
    await element.updateComplete;
    expect(element.shadowRoot!.querySelector(".headline")).toHaveTextContent("Thought for 3s");
    expect(element.shadowRoot!.querySelector(".detail")).toHaveTextContent("src/index.ts");
  });

  it("heading reemplaza al titular automático", async () => {
    const element = await mount<DzReasoning>(
      `<test-reasoning heading="Plan" steps='["a"]'></test-reasoning>`,
      "test-reasoning",
    );
    expect(element.shadowRoot!.querySelector(".headline")).toHaveTextContent("Plan");
  });
});

describe("DzApproval", () => {
  it("aprobar emite eventos y muestra la resolución", async () => {
    const element = await mount<DzApproval>(
      `<test-approval heading="Delete 3 files">Will remove build/</test-approval>`,
      "test-approval",
    );
    const events: string[] = [];
    element.addEventListener("dz-approve", (event) =>
      events.push(`approve:${(event as CustomEvent).detail.reason}`),
    );
    element.addEventListener("dz-decision", () => events.push("decision"));
    element.shadowRoot!.querySelector<HTMLButtonElement>(".approve")!.click();
    await element.updateComplete;

    expect(events).toEqual(["approve:user", "decision"]);
    expect(element.status).toBe("approved");
    expect(element.getAttribute("status")).toBe("approved");
    expect(element.shadowRoot!.querySelector(".resolution")).toHaveTextContent("Approved");
    expect(element.shadowRoot!.querySelector(".approve")).toBeNull();
  });

  it("al vencer el tiempo deniega por defecto", async () => {
    clock.time = 0;
    const element = await mount<DzApproval>(
      `<test-approval heading="Run script" timeout="2"></test-approval>`,
      "test-approval",
    );
    expect(element.shadowRoot!.querySelector(".timer")).toHaveTextContent("Auto-denies in 2s");
    let reason: unknown = null;
    element.addEventListener("dz-deny", (event) => (reason = (event as CustomEvent).detail.reason));
    clock.advance(2100);
    await element.updateComplete;
    expect(element.status).toBe("denied");
    expect(reason).toBe("timeout");
    expect(element.shadowRoot!.querySelector(".resolution")).toHaveTextContent("timed out");
  });

  it("pausa la cuenta mientras el puntero está encima", async () => {
    clock.time = 0;
    const element = await mount<DzApproval>(
      `<test-approval heading="x" timeout="1" timeout-action="approve"></test-approval>`,
      "test-approval",
    );
    const card = element.shadowRoot!.querySelector(".card")!;
    card.dispatchEvent(new Event("pointerenter"));
    clock.advance(5000);
    await element.updateComplete;
    expect(element.status).toBe("pending");
    expect(element.shadowRoot!.querySelector(".timer")).toHaveTextContent("Timer paused");
    card.dispatchEvent(new Event("pointerleave"));
    clock.advance(1100);
    await element.updateComplete;
    expect(element.status).toBe("approved");
    expect(element.reason).toBe("timeout");
  });

  it("muestra el slot details solo si tiene contenido", async () => {
    const element = await mount<DzApproval>(
      `<test-approval heading="x"><code slot="details">rm -rf build</code></test-approval>`,
      "test-approval",
    );
    await new Promise((resolve) => setTimeout(resolve));
    await element.updateComplete;
    expect(element.shadowRoot!.querySelector(".details")).not.toHaveAttribute("hidden");
  });
});

describe("DzCitation", () => {
  it("muestra la pastilla y el detalle de la fuente", async () => {
    const element = await mount<DzCitation>(
      `<test-citation index="1" href="https://www.example.com/doc" source="Manual" snippet="Texto citado" confidence="0.92"></test-citation>`,
      "test-citation",
    );
    const root = element.shadowRoot!;
    expect(root.querySelector(".pill")).toHaveTextContent("1");
    expect(root.querySelector(".host")).toHaveTextContent("example.com");
    expect(root.querySelector(".snippet")).toHaveTextContent("Texto citado");
    expect(root.querySelector(".confidence")).toHaveTextContent("92% match");
    expect(root.querySelector("a")).toHaveAttribute("href", "https://www.example.com/doc");
  });

  it("descarta URLs inseguras", async () => {
    const element = await mount<DzCitation>(
      `<test-citation index="2" href="javascript:alert(1)"></test-citation>`,
      "test-citation",
    );
    expect(element.shadowRoot!.querySelector("a")).toBeNull();
  });

  it("alterna el estado al hacer clic", async () => {
    const element = await mount<DzCitation>(
      `<test-citation index="3"></test-citation>`,
      "test-citation",
    );
    const pill = element.shadowRoot!.querySelector<HTMLButtonElement>(".pill")!;
    pill.click();
    await element.updateComplete;
    expect(pill).toHaveAttribute("aria-expanded", "true");
    pill.click();
    await element.updateComplete;
    expect(pill).toHaveAttribute("aria-expanded", "false");
  });
});
