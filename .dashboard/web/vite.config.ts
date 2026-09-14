import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';

const webRoot = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
	root: webRoot,
	plugins: [vue()],
	base: '/',
	build: {
		outDir: fileURLToPath(new URL('../dist', import.meta.url)),
		emptyOutDir: true,
	},
	resolve: {
		alias: {
			'@': fileURLToPath(new URL('./src', import.meta.url)),
		},
	},
	server: {
		fs: {
			allow: [webRoot, fileURLToPath(new URL('..', import.meta.url))],
		},
		proxy: {
			'/api': {
				target: 'http://127.0.0.1:3847',
				changeOrigin: false,
			},
			'/assets/swagger-ui': {
				target: 'http://127.0.0.1:3847',
				changeOrigin: false,
			},
			'/assets/swagger.css': {
				target: 'http://127.0.0.1:3847',
				changeOrigin: false,
			},
			'/assets/swagger-init.js': {
				target: 'http://127.0.0.1:3847',
				changeOrigin: false,
			},
			'/i18n': {
				target: 'http://127.0.0.1:3847',
				changeOrigin: false,
			},
			'/assets/icons/materials': {
				target: 'http://127.0.0.1:3847',
				changeOrigin: false,
			},
		},
	},
});
