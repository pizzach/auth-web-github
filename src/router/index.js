import AppLayout from '@/layout/AppLayout.vue';
import { createRouter, createWebHistory } from 'vue-router';
import { AuthService } from '@/service/AuthService';

const router = createRouter({
    history: createWebHistory(),
    routes: [
        {
            path: '/',
            component: AppLayout,
            children: [
                {
                    path: '/',
                    name: 'token-dashboard', // 調整 1：將 name 從 dashboard 改為 token-dashboard
                    component: () => import('@/views/TokenDashboard.vue'), // 調整 2：指向新的 Vue 元件
                    meta: { requiresAuth: true }
                },
                {
                    path: '/apply-token',
                    name: 'ApplyToken',
                    component: () => import('@/views/ApplyToken.vue'),
                    meta: { title: '申請 JWT Token' }
                }
            ]
        },
        {
            path: '/auth/login',
            name: 'login',
            component: () => import('@/views/auth/Login.vue')
        }
    ]
});

// 路由守衛
router.beforeEach((to, from, next) => {
    const isAuthenticated = AuthService.isAuthenticated();

    if (to.meta.requiresAuth && !isAuthenticated) {
        // 如果要去需要權限的頁面但沒登入，導向登入頁
        next({ name: 'login' });
    } else if (to.name === 'login' && isAuthenticated) {
        // 如果已登入卻還想去登入頁，導回首頁
        next({ name: 'token-dashboard' }); // 調整 3：這裡也要對應改成 token-dashboard
    } else {
        next();
    }
});

export default router;
