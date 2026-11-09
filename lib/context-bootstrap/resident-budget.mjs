// Resident-context budget for the bootstrap's managed region.
//
// The ceiling governs only what this bootstrap writes: the text between its
// markers. Operator prose and other tools' regions in the same file belong to
// the project and are reported separately, never charged against the ceiling.
// Counting is line-ending agnostic, so a CRLF checkout measures the same as LF.

export const RESIDENT_CEILING = 900;

const countWords = (text) => (text.match(/\S+/g) ?? []).length;

export function measureResident(content, start, end) {
  const total = countWords(content);
  const from = content.indexOf(start);
  const to = from < 0 ? -1 : content.indexOf(end, from);
  const managed = from < 0 || to < 0 ? 0 : countWords(content.slice(from, to + end.length));
  return { managed, project: total - managed, ceiling: RESIDENT_CEILING, withinCeiling: managed <= RESIDENT_CEILING };
}
