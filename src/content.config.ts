import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/**
 * Blog posts live in src/content/blog/<locale>/<slug>.md. The same slug in
 * both folders makes the two versions hreflang alternates of each other.
 *
 * Required fields are the ones search and sharing need (audit M.3): author,
 * publish date, category, description, and alt text for any hero image.
 */
const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: ({ image }) =>
    z
      .object({
        title: z.string().min(8).max(110),
        description: z.string().min(50).max(200),
        category: z.enum(['vision', 'connectors', 'trust', 'product', 'syria']),
        author: z.string().min(2),
        publishedAt: z.coerce.date(),
        updatedAt: z.coerce.date().optional(),
        heroImage: image().optional(),
        heroAlt: z.string().optional(),
        draft: z.boolean().default(false),
      })
      .refine((p) => !p.heroImage || (p.heroAlt && p.heroAlt.trim().length > 0), {
        message: 'heroAlt is required when heroImage is set',
        path: ['heroAlt'],
      }),
});

/**
 * Legal documents: src/content/legal/<locale>/<doc>.md. `status` is kept
 * for the company's own records only: every document is published as it is
 * (the owner's decision, 1 October 2026).
 */
const legal = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/legal' }),
  schema: z.object({
    title: z.string(),
    version: z.string(),
    effectiveFrom: z.coerce.date(),
    status: z.enum(['draft', 'approved']),
  }),
});

export const collections = { blog, legal };
