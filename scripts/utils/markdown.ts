export interface MarkdownSegment {
  content: string;
  fencedCode: boolean;
}

export function splitFencedCodeSegments(markdown: string): MarkdownSegment[] {
  const lines = markdown.match(/[^\n]*\n|[^\n]+$/g) ?? [];
  const segments: MarkdownSegment[] = [];
  let buffer = "";
  let activeFence: { character: string; length: number } | undefined;

  const flush = (fencedCode: boolean): void => {
    if (!buffer) {
      return;
    }
    segments.push({ content: buffer, fencedCode });
    buffer = "";
  };

  for (const line of lines) {
    const lineWithoutEnding = line.replace(/\r?\n$/u, "");
    if (!activeFence) {
      const openingFence = lineWithoutEnding.match(/^ {0,3}(`{3,}|~{3,})(.*)$/u);
      if (openingFence) {
        flush(false);
        activeFence = {
          character: openingFence[1][0],
          length: openingFence[1].length,
        };
      }
      buffer += line;
      continue;
    }

    buffer += line;
    const closingFence = lineWithoutEnding.match(/^ {0,3}(`{3,}|~{3,})[ \t]*$/u);
    if (
      closingFence &&
      closingFence[1][0] === activeFence.character &&
      closingFence[1].length >= activeFence.length
    ) {
      flush(true);
      activeFence = undefined;
    }
  }

  flush(Boolean(activeFence));
  return segments;
}
