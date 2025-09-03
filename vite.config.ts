import { defineConfig } from 'vite';
import devtoolsJson from 'vite-plugin-devtools-json';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
	plugins: [sveltekit(), devtoolsJson()],
	build: { sourcemap: true },
	test: { include: ['src/**/*.{test,spec}.{js,ts}'] },
	optimizeDeps: {
		exclude: ['@3d-dice/dice-box']
	},
	ssr: {
		noExternal: ['@3d-dice/dice-box']
	}
});
