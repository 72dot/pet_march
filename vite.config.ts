import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(), 
    tailwindcss(),
    {
      name: 'api-pets',
      configureServer(server) {
        server.middlewares.use('/api/pets', (_req, res) => {
          const petDir = path.resolve(__dirname, 'public/pet');
          try {
            const files = fs.readdirSync(petDir)
              .filter(file => file.endsWith('.webp'))
              .map(file => `/pet/${file}`);
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(files));
          } catch (e) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: 'Failed to read directory' }));
          }
        });
      }
    }
  ],
})
