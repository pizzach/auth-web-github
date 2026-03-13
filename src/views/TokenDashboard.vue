<script setup>
import { ref, onMounted } from 'vue';
import { TokenService } from '@/service/TokenService';
import { FilterMatchMode } from '@primevue/core/api';
import { useToast } from 'primevue/usetoast';
import { globalLoading } from '@/service/GlobalState';
import { useRouter } from 'vue-router';

// 引入 PrimeVue 組件
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import Dialog from 'primevue/dialog';
import Message from 'primevue/message';

const toast = useToast();
const tokens = ref([]);
const router = useRouter();

// DataTable 搜尋過濾設定
const filters = ref({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS }
});

const showModal = ref(false);
const revokeReason = ref('');
const revokeError = ref(false);
const selectedToken = ref(null);

// 初始化 API 載入
const loadTokens = async () => {
    globalLoading.value = true;
    try {
        tokens.value = await TokenService.getTokens();
    } catch (error) {
        console.error('載入 Token 失敗', error);
        toast.add({ severity: 'error', summary: '載入失敗', detail: error.message, life: 3000 });
    } finally {
        globalLoading.value = false;
    }
};

onMounted(loadTokens);

const copyToken = async (val) => {
    try {
        await navigator.clipboard.writeText(val);
        toast.add({
            severity: 'success',
            summary: '複製成功',
            detail: 'Token 已複製到剪貼簿',
            life: 3000
        });
    } catch (err) {
        toast.add({ severity: 'error', summary: '複製失敗', detail: '請手動複製', life: 3000 });
    }
};

const openRevokeModal = (token) => {
    selectedToken.value = token;
    revokeReason.value = '';
    revokeError.value = false;
    showModal.value = true;
};

const closeRevokeModal = () => {
    showModal.value = false;
};

const submitRevoke = async () => {
    if (!revokeReason.value.trim()) {
        revokeError.value = true;
        return;
    }

    globalLoading.value = true;
    try {
        await TokenService.revokeToken(
            selectedToken.value.id,
            selectedToken.value.environment,
            revokeReason.value
        );
        toast.add({
            severity: 'success',
            summary: '撤銷成功',
            detail: 'Token 已被撤銷',
            life: 3000
        });
        showModal.value = false;
        await loadTokens(); // 重新載入列表
    } catch (err) {
        toast.add({ severity: 'error', summary: '撤銷失敗', detail: '系統異常', life: 3000 });
    } finally {
        globalLoading.value = false;
    }
};

const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString('zh-TW', { hour12: false });
};

const isExpired = (dateString) => {
    if (!dateString) return false;
    return new Date(dateString) < new Date();
};

const goToApplyToken = () => {
    router.push('/apply-token'); // 跳轉到新設計的頁面
};
</script>

<template>
    <div class="card">
        <div class="flex flex-col md:flex-row justify-between md:items-center mb-6">
            <div>
                <h1 class="text-2xl font-bold m-0 text-color">Token 存取控制台</h1>
                <p class="text-color-secondary mt-1">管理與監控系統中所有已發放的 JWT 憑證狀態</p>
            </div>
            <div class="mt-4 md:mt-0">
                <Button
                    label="申請 JWT Token"
                    icon="pi pi-plus"
                    class="p-button-primary"
                    @click="goToApplyToken"
                />
            </div>
        </div>

        <DataTable
            :value="tokens"
            paginator
            :rows="10"
            dataKey="id"
            v-model:filters="filters"
            :globalFilterFields="['id', 'subject', 'environment']"
            emptyMessage="找不到任何 Token 記錄"
            responsiveLayout="scroll"
            stripedRows
        >
            <template #header>
                <div class="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <span class="p-input-icon-left w-full sm:w-auto">
                        <i class="pi pi-search" />
                        <InputText
                            v-model="filters['global'].value"
                            placeholder="輸入 JTI、簽發者搜尋..."
                            class="w-full sm:w-[300px]"
                        />
                    </span>
                </div>
            </template>

            <Column field="id" header="唯一識別碼 (JTI)" sortable>
                <template #body="{ data }">
                    <span class="font-mono text-primary">{{ data.id }}</span>
                </template>
            </Column>

            <Column field="environment" header="環境" sortable>
                <template #body="{ data }">
                    <Tag :value="data.environment" severity="info" />
                </template>
            </Column>

            <Column field="subject" header="簽發者" sortable></Column>

            <Column field="issuedAt" header="簽發時間" sortable>
                <template #body="{ data }">
                    <span class="text-sm text-color-secondary">{{
                        formatDate(data.issuedAt)
                    }}</span>
                </template>
            </Column>

            <Column field="expiresAt" header="過期時間" sortable>
                <template #body="{ data }">
                    <span class="text-sm text-color-secondary">{{
                        formatDate(data.expiresAt)
                    }}</span>
                </template>
            </Column>

            <Column header="狀態">
                <template #body="{ data }">
                    <Tag v-if="data.revoked" value="已撤銷" severity="danger" />
                    <Tag v-else-if="isExpired(data.expiresAt)" value="已過期" severity="warn" />
                    <Tag v-else value="生效中" severity="success" />
                </template>
            </Column>

            <Column header="操作" alignFrozen="right" :exportable="false" style="min-width: 8rem">
                <template #body="{ data }">
                    <div class="flex gap-2">
                        <Button
                            icon="pi pi-copy"
                            size="small"
                            outlined
                            rounded
                            tooltip="複製 Token"
                            @click="copyToken(data.tokenValue)"
                        />
                        <Button
                            v-if="!data.revoked && !isExpired(data.expiresAt)"
                            icon="pi pi-ban"
                            severity="danger"
                            size="small"
                            outlined
                            rounded
                            tooltip="撤銷授權"
                            @click="openRevokeModal(data)"
                        />
                    </div>
                </template>
            </Column>
        </DataTable>

        <Dialog
            v-model:visible="showModal"
            modal
            header="確認撤銷授權"
            :style="{ width: '450px' }"
            class="p-fluid"
        >
            <Message severity="warn" :closable="false" class="mb-4">
                請注意：撤銷後，此 Token 將立即從 Redis 白名單中移除並失效。
            </Message>
            <div class="field">
                <label for="reason" class="font-bold mb-2 block">撤銷原因 (必填)：</label>
                <InputText
                    id="reason"
                    v-model="revokeReason"
                    placeholder="請輸入撤銷原因"
                    :class="{ 'p-invalid': revokeError }"
                    autofocus
                />
                <small v-if="revokeError" class="p-error">請務必填寫撤銷原因</small>
            </div>
            <template #footer>
                <Button label="取消" icon="pi pi-times" text @click="closeRevokeModal" />
                <Button
                    label="確定撤銷"
                    icon="pi pi-check"
                    severity="danger"
                    @click="submitRevoke"
                />
            </template>
        </Dialog>
    </div>
</template>

<style scoped>
/* 原本上百行的手刻 Table 和 Modal CSS 皆可全數刪除 */
/* PrimeVue 的 DataTable 和 Dialog 已經處理好所有的深/淺色模式細節 */
</style>
