import { fileURLToPath, URL } from 'node:url';
import fs from 'node:fs';

import { PrimeVueResolver } from '@primevue/auto-import-resolver';
import tailwindcss from '@tailwindcss/vite';
import vue from '@vitejs/plugin-vue';
import Components from 'unplugin-vue-components/vite';
import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
    optimizeDeps: {
        noDiscovery: true
    },
    plugins: [
        vue(),
        tailwindcss(),
        Components({
            resolvers: [PrimeVueResolver()]
        })
    ],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url))
        }
    },
    css: {
        preprocessorOptions: {
            scss: {
                api: 'modern-compiler'
            }
        }
    },

    server: {
        host: 'localhost',
        port: 4200,
        strictPort: true,
        https: {
            cert: fs.readFileSync('C:/Certificate/localhost/auth-service/localhost.pem'),
            key: fs.readFileSync('C:/Certificate/localhost/auth-service/localhost-key.pem')
        },
        proxy: {
            // 當前端發送 /proxy-auth 開頭的請求時，幫我偷偷轉發給 Java 後端
            '/proxy-auth': {
                target: 'https://local.ubot.css.com.tw:8081/auth',
                changeOrigin: true,
                secure: false, // 忽略自簽憑證錯誤
                rewrite: (path) => path.replace(/^\/proxy-auth/, '') // 轉發時把 /proxy-auth 拔掉
            }
        }
    },

    preview: {
        host: 'localhost',
        port: 4200,
        strictPort: true,
        https: {
            cert: fs.readFileSync('C:/Certificate/localhost/auth-service/localhost.pem'),
            key: fs.readFileSync('C:/Certificate/localhost/auth-service/localhost-key.pem')
        }
    }
});
