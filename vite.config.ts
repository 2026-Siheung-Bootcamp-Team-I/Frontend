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
        // 실제 조치는 responder-service(:8082) 가 처리한다. /responder-api 접두어를 떼고 넘긴다.
        '/responder-api': {
          target: env.RESPONDER_PROXY_TARGET || 'http://localhost:8082',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/responder-api/, ''),
        },
      },
    },
  }
})
