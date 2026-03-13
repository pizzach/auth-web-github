<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import { TokenService } from '@/service/TokenService';

const router = useRouter();
const toast = useToast();

// 表單與資料狀態
const form = ref({
    ttlAmount: 1,
    ttlUnit: 'HOURS',
    environment: null
});

const timeUnits = ref([
    { label: '分鐘', value: 'MINUTES' },
    { label: '小時', value: 'HOURS' },
    { label: '天', value: 'DAYS' }
]);

const environments = ref([
    { label: '開發環境 (DEV)', value: 'DEV' },
    { label: '整合測試 (SIT)', value: 'SIT' },
    { label: '使用者測試 (UAT)', value: 'UAT' },
    { label: '正式環境 (PROD)', value: 'PROD' }
]);

const isLoadingTree = ref(false);
const treeNodes = ref([]);
const selectedKeys = ref({});

// 取得權限清單
const fetchPermissions = async () => {
    if (!form.value.environment) return;

    isLoadingTree.value = true;
    selectedKeys.value = {};

    try {
        const rawData = await TokenService.getPermissions(form.value.environment);
        treeNodes.value = rawData.map((app) => ({
            key: `app_${app.appCode}`,
            label: `${app.appName} (${app.appCode})`,
            data: { type: 'app', code: app.appCode },
            children: (app.apiPaths || []).map((api) => ({
                key: `api_${api.id}`,
                label: api.apiPath,
                data: { type: 'api', id: api.id }
            }))
        }));
    } catch (error) {
        console.error(error);
        treeNodes.value = [];
        toast.add({
            severity: 'error',
            summary: '錯誤',
            detail: error.message || '載入權限資料失敗',
            life: 3000
        });
    } finally {
        isLoadingTree.value = false;
    }
};

const isSubmitting = ref(false);
const showResultDialog = ref(false);
const generatedToken = ref('');

const isFormValid = computed(() => {
    return form.value.environment && Object.keys(selectedKeys.value).length > 0;
});

// 送出表單
const submitForm = async () => {
    isSubmitting.value = true;

    let ttlSeconds = 0;
    const amount = form.value.ttlAmount;
    if (form.value.ttlUnit === 'MINUTES') ttlSeconds = amount * 60;
    else if (form.value.ttlUnit === 'HOURS') ttlSeconds = amount * 3600;
    else if (form.value.ttlUnit === 'DAYS') ttlSeconds = amount * 86400;

    const selectedAppCodes = [];
    const selectedApiIds = [];

    for (const [key, state] of Object.entries(selectedKeys.value)) {
        if (state.checked || state.partialChecked) {
            if (key.startsWith('app_')) selectedAppCodes.push(key.replace('app_', ''));
        }
        if (state.checked) {
            if (key.startsWith('api_')) selectedApiIds.push(Number(key.replace('api_', '')));
        }
    }

    const payload = {
        environment: form.value.environment,
        ttlSeconds: ttlSeconds,
        appCodes: selectedAppCodes,
        apiIds: selectedApiIds
    };

    try {
        const tokenString = await TokenService.generateJwtToken(payload);
        generatedToken.value = tokenString;
        showResultDialog.value = true;
    } catch (error) {
        toast.add({ severity: 'error', summary: '產生失敗', detail: error.message, life: 5000 });
    } finally {
        isSubmitting.value = false;
    }
};

const copyAndReturn = async () => {
    try {
        await navigator.clipboard.writeText(generatedToken.value);
        toast.add({
            severity: 'success',
            summary: '成功',
            detail: 'Token 已複製至剪貼簿',
            life: 3000
        });

        setTimeout(() => {
            router.push('/');
        }, 1000);
    } catch (err) {
        toast.add({ severity: 'warn', summary: '複製失敗', detail: '請手動反白複製', life: 3000 });
    }
};

const goBack = () => {
    router.push('/auth/console/dashboard');
};
</script>

<template>
    <div class="card max-w-4xl mx-auto mt-4">
        <div class="mb-5">
            <h2 class="text-2xl font-semibold mb-2">申請環境 JWT Token</h2>
            <p class="text-color-secondary">請設定 Token 時效並選擇對應的環境與應用程式。</p>
        </div>

        <form @submit.prevent="submitForm">
            <div class="mb-6">
                <h3
                    class="font-semibold text-xl mb-4 pb-2"
                    style="border-bottom: 1px solid var(--surface-border)"
                >
                    時效設定
                </h3>
                <div class="flex flex-col md:flex-row gap-4 items-end">
                    <div class="flex-1 w-full">
                        <label class="block font-medium mb-2"
                            >有效時間數值 <span class="text-red-500">*</span></label
                        >
                        <InputNumber v-model="form.ttlAmount" :min="1" class="w-full" required />
                    </div>
                    <div class="flex-1 w-full">
                        <label class="block font-medium mb-2"
                            >時間單位 <span class="text-red-500">*</span></label
                        >
                        <Select
                            v-model="form.ttlUnit"
                            :options="timeUnits"
                            optionLabel="label"
                            optionValue="value"
                            class="w-full"
                            required
                        />
                    </div>
                </div>
                <small class="text-color-secondary block mt-2"
                    >系統將自動轉換為秒數傳送至後端。</small
                >
            </div>

            <div class="mb-6">
                <h3
                    class="font-semibold text-xl mb-4 pb-2"
                    style="border-bottom: 1px solid var(--surface-border)"
                >
                    授權範圍設定
                </h3>
                <div class="mb-4">
                    <label class="block font-medium mb-2"
                        >目標環境 (Environment) <span class="text-red-500">*</span></label
                    >
                    <Select
                        v-model="form.environment"
                        :options="environments"
                        optionLabel="label"
                        optionValue="value"
                        placeholder="請選擇環境..."
                        class="w-full"
                        @change="fetchPermissions"
                        required
                    />
                </div>

                <div v-if="form.environment" class="mt-4">
                    <label class="block font-medium mb-2">服務與 API 路由授權配置</label>

                    <div
                        v-if="isLoadingTree"
                        class="p-4 text-center"
                        style="
                            border: 1px solid var(--surface-border);
                            border-radius: 6px;
                            background: var(--surface-ground);
                        "
                    >
                        <i class="pi pi-spin pi-spinner text-2xl mb-2 text-color-secondary"></i>
                        <p class="text-color-secondary">載入權限資料中...</p>
                    </div>

                    <div
                        v-else-if="treeNodes.length > 0"
                        class="p-2 max-h-[24rem] overflow-y-auto"
                        style="
                            border: 1px solid var(--surface-border);
                            border-radius: 6px;
                            background: var(--surface-ground);
                        "
                    >
                        <Tree
                            v-model:selectionKeys="selectedKeys"
                            :value="treeNodes"
                            selectionMode="checkbox"
                            class="w-full bg-transparent border-none"
                        ></Tree>
                    </div>

                    <div
                        v-else
                        class="p-4 text-center text-color-secondary"
                        style="
                            border: 1px solid var(--surface-border);
                            border-radius: 6px;
                            background: var(--surface-ground);
                        "
                    >
                        查無可用服務
                    </div>
                    <small class="text-color-secondary block mt-2"
                        >請勾選欲授權的服務及其對應的 API 路由。</small
                    >
                </div>
            </div>

            <div class="flex justify-end gap-3 mt-6">
                <Button
                    label="返回首頁"
                    icon="pi pi-arrow-left"
                    severity="secondary"
                    outlined
                    @click="goBack"
                />
                <Button
                    type="submit"
                    label="產出 Token"
                    icon="pi pi-check"
                    :loading="isSubmitting"
                    :disabled="!isFormValid"
                />
            </div>
        </form>

        <Dialog
            v-model:visible="showResultDialog"
            modal
            header="Token 產生成功"
            :style="{ width: '50vw' }"
            :breakpoints="{ '1199px': '75vw', '575px': '90vw' }"
            :closable="false"
        >
            <div
                class="p-4 rounded-md font-mono text-sm overflow-x-auto break-all mb-4"
                style="
                    background: var(--surface-ground);
                    border: 1px solid var(--surface-border);
                    color: var(--primary-color);
                "
            >
                {{ generatedToken }}
            </div>
            <template #footer>
                <Button
                    label="複製 Token 並回首頁"
                    icon="pi pi-copy"
                    @click="copyAndReturn"
                    autofocus
                />
            </template>
        </Dialog>
    </div>
</template>

<style scoped>
/* 移除 Tree 元件預設的背景與 padding，讓它融入我們外層設定的 surface-ground */
:deep(.p-tree) {
    background: transparent;
    padding: 0;
    border: none;
}
:deep(.p-tree-container) {
    padding: 0;
}
</style>
