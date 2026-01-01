// @ts-check
import { defineConfig } from 'astro/config';
import netlify from '@astrojs/netlify';
import clerk from '@clerk/astro'

export default defineConfig({
    integrations: [clerk()],
    adapter: netlify(),
    output: 'server',
});
