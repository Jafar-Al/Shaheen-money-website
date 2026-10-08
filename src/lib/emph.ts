/**
 * Copy marks its one emphasised word with asterisks ("costs *too much.*"),
 * rendered by src/components/ui/Emph.astro. Anywhere the line is used as
 * plain text (a crumb, an image, a meta tag), strip the markers.
 */
export const plain = (text: string): string => text.replaceAll('*', '');
