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
          const requestPath = req.url.split('?')[0];

          if (requestPath === '/docs/notes/index.json') {
            const notesDir = path.join(__dirname, '..', '..', 'docs', 'notes');
            if (
              fs.existsSync(notesDir) &&
              fs.statSync(notesDir).isDirectory()
            ) {
              const noteFiles = fs
                .readdirSync(notesDir)
                .filter((name) => name.endsWith('.json'));
              const notes = noteFiles
                .map((fileName) => {
                  const filePath = path.join(notesDir, fileName);
                  try {
                    const content = fs.readFileSync(filePath, 'utf-8');
                    const note = JSON.parse(content);
                    const { mtime } = fs.statSync(filePath);
                    return {
                      ...note,
                      slug: fileName.replace(/\.json$/, ''),
                      created_at: mtime.toISOString(),
                    };
                  } catch (error) {
                    console.warn(
                      `Skipped invalid note file: ${fileName}`,
                      error,
                    );
                    return null;
                  }
                })
                .filter(Boolean);

              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.end(JSON.stringify({ notes }, null, 2));
              return;
            }
          }

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
