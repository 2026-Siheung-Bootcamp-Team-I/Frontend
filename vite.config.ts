import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 5173,
      // api-service 에 CORS 설정이 없어 dev 에서는 프록시로 같은 출처처럼 호출한다.
      proxy: {
        '/api': {
          target: env.API_PROXY_TARGET || 'http://localhost:8084',
          changeOrigin: true,
        },
      },
    },
  }
})
