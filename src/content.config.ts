import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    titleEn: z.string(),
    date: z.coerce.date(),
    tags: z.array(z.string()).default([]),
    summary: z.string(),
    summaryEn: z.string(),
    type: z.enum(['article', 'report']).default('article'),
    // Path under public/, e.g. "/reports/my-assessment.pdf" — rendered as a
    // download link on the post page when present.
    pdfUrl: z.string().optional(),
  }),
});

export const collections = { blog };
