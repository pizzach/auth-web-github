<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { AuthService } from '@/service/AuthService';
import { useToast } from 'primevue/usetoast';
import { globalLoading } from '@/service/GlobalState';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Password from 'primevue/password';
import Message from 'primevue/message';
import Card from 'primevue/card';

const router = useRouter();
const route = useRoute();

const loginForm = reactive({
    username: '',
    password: ''
});
const toast = useToast();
const loading = ref(false);
const errorMessage = ref('');
const logoutMessage = ref(false);

onMounted(() => {
    if (route.query.logout) {
        logoutMessage.value = true;
    }
});

const handleLogin = async () => {
    loading.value = true;
    globalLoading.value = true; // 開啟全域 Spinner
    errorMessage.value = '';
    logoutMessage.value = false;

    try {
        await AuthService.login(loginForm.username, loginForm.password);
        toast.add({ severity: 'success', summary: '登入成功', detail: '歡迎回來！', life: 3000 });
        router.push('/');
    } catch (err) {
        console.error('Login Error:', err);
        errorMessage.value = '管理員帳號或密碼錯誤，請重新確認。';
    } finally {
        loading.value = false;
        globalLoading.value = false; // 關閉全域 Spinner
    }
};
</script>

<template>
    <!-- 全畫面容器：利用 flex 確保絕對置中 -->
    <div class="login-page-wrapper">
        <div class="login-content">
            <Card class="auth-card">
                <template #header>
                    <div class="auth-header">
                        <div class="badge">AUTH MANAGEMENT</div>
                        <h1>UBOT Auth管理系統</h1>
                        <p>請輸入管理員帳號與密碼</p>
                    </div>
                </template>

                <template #content>
                    <!-- 提示訊息 -->
                    <Message v-if="errorMessage" severity="error" class="mb-4">{{
                        errorMessage
                    }}</Message>
                    <Message v-if="logoutMessage" severity="success" class="mb-4"
                        >您已成功登出管理系統。</Message
                    >

                    <form @submit.prevent="handleLogin" class="login-form">
                        <div class="field">
                            <label for="username">管理員帳號</label>
                            <span class="p-input-icon-left w-full">
                                <InputText
                                    id="username"
                                    v-model="loginForm.username"
                                    placeholder="請輸入帳號"
                                    class="w-full text-center"
                                    required
                                    autofocus
                                />
                            </span>
                        </div>

                        <div class="field">
                            <label for="password">安全密碼</label>
                            <Password
                                id="password"
                                v-model="loginForm.password"
                                placeholder="請輸入密碼"
                                :feedback="false"
                                toggleMask
                                fluid
                                inputClass="w-full text-center"
                                required
                            />
                        </div>

                        <Button
                            type="submit"
                            label="登入後台"
                            :loading="loading"
                            class="login-button w-full"
                        />
                    </form>
                </template>

                <template #footer>
                    <div class="auth-footer">© 2026 UBOT Authorization Center</div>
                </template>
            </Card>
        </div>
    </div>
</template>

<style lang="scss" scoped>
/* 使用 Flexbox 進行完美置中 */
.login-page-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    width: 100vw;
    background: var(--surface-ground); /* 使用 PrimeVue 變數保持風格統一 */
    padding: 1rem;
}

.login-content {
    width: 100%;
    max-width: 450px;
}

.auth-card {
    border-radius: 24px;
    overflow: hidden;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1) !important;
    border: none;
}

.auth-header {
    padding-top: 3rem;
    text-align: center;

    .badge {
        display: inline-block;
        background: var(--primary-color);
        color: var(--primary-color-text);
        padding: 0.25rem 0.75rem;
        border-radius: 20px;
        font-size: 0.75rem;
        font-weight: bold;
        letter-spacing: 1px;
        margin-bottom: 1rem;
    }

    h1 {
        margin: 0;
        font-size: 1.75rem;
        letter-spacing: 2px;
        color: var(--text-color);
    }

    p {
        color: var(--text-color-secondary);
        margin-top: 0.5rem;
    }
}

.login-form {
    padding: 1rem 1.5rem;

    .field {
        margin-bottom: 1.5rem;
        display: flex;
        flex-direction: column;
        align-items: center;

        label {
            margin-bottom: 0.5rem;
            font-weight: 600;
            color: var(--text-color-secondary);
        }
    }
}

.login-button {
    height: 3.5rem;
    font-size: 1.1rem;
    font-weight: bold;
    border-radius: 12px;
    background: var(--primary-color);
    transition: transform 0.2s;

    &:hover {
        transform: translateY(-2px);
    }
}

.auth-footer {
    text-align: center;
    color: var(--text-color-secondary);
    font-size: 0.8rem;
    padding-bottom: 1rem;
}

/* 確保 PrimeVue 組件內的 input 也能置中 */
:deep(.p-inputtext) {
    border-radius: 12px;
    padding: 0.75rem;
}

:deep(.p-password) {
    width: 100%;
}
</style>
