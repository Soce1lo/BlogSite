export const OUTPUT_KINDS = ["thought", "learned", "built", "revised"] as const;

export type OutputKind = (typeof OUTPUT_KINDS)[number];
export type OutputCollection = "blog" | "notes" | "projects";

const defaultKinds: Record<OutputCollection, OutputKind> = {
  blog: "thought",
  notes: "learned",
  projects: "built",
};

export function isOutputKind(value: string): value is OutputKind {
  return OUTPUT_KINDS.includes(value as OutputKind);
}

export function defaultOutputKind(collection: OutputCollection): OutputKind {
  return defaultKinds[collection];
}
