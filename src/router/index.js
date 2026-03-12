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
                    name: 'dashboard',
                    component: () => import('@/views/Dashboard.vue'),
                    meta: { requiresAuth: true }
                }
                // ... 其他需要權限的子頁面
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
        next({ name: 'dashboard' });
    } else {
        next();
    }
});

export default router;
