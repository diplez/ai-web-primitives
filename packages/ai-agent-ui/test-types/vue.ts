import type {} from "@diplez/ai-agent-ui/vue";
import type { GlobalComponents } from "vue";

type ToolCallProps = InstanceType<GlobalComponents["dz-tool-call"]>["$props"];
type TimelineProps = InstanceType<GlobalComponents["dz-agent-timeline"]>["$props"];

export const toolCall: ToolCallProps = { name: "search_docs", status: "running" };
export const timeline: TimelineProps = { forkable: true };

// @ts-expect-error estado inválido
export const badStatus: ToolCallProps = { status: "sleeping" };
