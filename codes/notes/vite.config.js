import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    react({
      fastRefresh: true,
    }),
    // 自定义插件：将 docs 目录作为静态资源服务
    {
      name: 'serve-docs',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url.startsWith('/docs/')) {
            const relativePath = req.url.replace('/docs/', '');
            const filePath = path.join(
              __dirname,
              '..',
              '..',
              'docs',
              relativePath,
            );

            if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.setHeader('Access-Control-Allow-Origin', '*');
              const content = fs.readFileSync(filePath, 'utf-8');
              res.end(content);
              return;
            }
          }
          next();
        });
      },
    },
  ],
  server: {
    port: 3000,
    open: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'lucide-react'],
  },
});
