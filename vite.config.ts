import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: {
        index: 'index.ts',
        config: 'config.ts',
      },
      name: 'astro-tractstack',
      formats: ['es'],
    },
    rollupOptions: {
      external: ['astro', 'kleur', 'prompts', 'path', /^node:.*/],
    },
  },
});
