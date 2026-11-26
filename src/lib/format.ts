/**
 * Fills `{name}` placeholders in an interface text from `messages/`. A placeholder with no
 * value is left as written, so a missing value is visible rather than silently blank.
 * Keeping the whole sentence in one string lets a translation reorder the words.
 */
export function format(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (placeholder, name: string) =>
    Object.hasOwn(values, name) ? String(values[name]) : placeholder,
  );
}
