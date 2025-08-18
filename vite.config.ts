import { defineConfig } from 'vite';
import devtoolsJson from 'vite-plugin-devtools-json';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
	plugins: [sveltekit(), devtoolsJson()],
	build: { sourcemap: true },
	test: { include: ['src/**/*.{test,spec}.{js,ts}'] }
});
