import { glob } from "astro/loaders";
import { defineCollection, z } from 'astro:content';
import { cldAssetsLoader } from 'astro-cloudinary/loaders';

const stories = defineCollection({
        loader: glob({
            pattern: "**/[^_]*.md", base: "./src/stories"
        }),
        schema: ({image}) => z.object({
            title: z.string(),
            authors: z.array(z.string()),
            date: z.date(),
            plants: z.array(z.string()).optional(), // slugs, empty for lore/intro
            tags: z.array(z.string()).optional(),
            featured_image: image().optional(),
            excerpt: z.string().optional(), // for listing page
        })
    });


const gallery_images = defineCollection({
        loader: cldAssetsLoader({
            folder: 'home/gallery'
        })
    });

export const collections = { stories, gallery_images };
