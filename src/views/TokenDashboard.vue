<script setup>
import { ref, computed, onMounted } from 'vue';
import { TokenService } from '@/service/TokenService';

// -- 狀態定義 --
const tokens = ref([]);
const searchQuery = ref('');
const currentPage = ref(1);
const pageSize = 10;
const currentSort = ref('issuedAt');
const sortDesc = ref(true);

const showToast = ref(false);
const showModal = ref(false);
const revokeReason = ref('');
const revokeError = ref(false);
const selectedToken = ref(null);

// -- 初始化 --
onMounted(async () => {
    try {
        tokens.value = await TokenService.getTokens();
    } catch (error) {
        console.error('載入 Token 失敗', error);
    }
});

// -- 計算屬性與邏輯 --
const filteredTokens = computed(() => {
    if (!searchQuery.value) return tokens.value;
    const lower = searchQuery.value.toLowerCase();
    return tokens.value.filter(
        (t) =>
            t.id.toLowerCase().includes(lower) ||
            t.subject.toLowerCase().includes(lower) ||
            t.environment.toLowerCase().includes(lower)
    );
});

const totalPages = computed(() => Math.ceil(filteredTokens.value.length / pageSize) || 1);

const paginatedTokens = computed(() => {
    // 簡單排序邏輯
    let sorted = [...filteredTokens.value].sort((a, b) => {
        let valA = new Date(a[currentSort.value]).getTime();
        let valB = new Date(b[currentSort.value]).getTime();
        return sortDesc.value ? valB - valA : valA - valB;
    });

    const start = (currentPage.value - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
});

// -- 方法 --
const sortBy = (column) => {
    if (currentSort.value === column) {
        sortDesc.value = !sortDesc.value;
    } else {
        currentSort.value = column;
        sortDesc.value = true;
    }
};

const getSortIcon = (column) => {
    if (currentSort.value !== column) return '';
    return sortDesc.value ? '↓' : '↑';
};

const changePage = (delta) => {
    currentPage.value += delta;
};

const copyToken = async (val) => {
    try {
        await navigator.clipboard.writeText(val);
        showToast.value = true;
        setTimeout(() => (showToast.value = false), 3000);
    } catch (err) {
        alert('複製失敗，請手動複製');
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
    try {
        await TokenService.revokeToken(
            selectedToken.value.id,
            selectedToken.value.environment,
            revokeReason.value
        );
        alert('撤銷成功');
        showModal.value = false;
        // 重新載入列表
        tokens.value = await TokenService.getTokens();
    } catch (err) {
        alert('撤銷失敗');
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
</script>

<template>
    <div class="dashboard-wrapper">
        <div class="header-section">
            <div>
                <h1 class="header-title">Token 存取控制台</h1>
                <p class="header-subtitle">管理與監控系統中所有已發放的 JWT 憑證狀態</p>
            </div>
            <div class="action-group">
                <button class="btn btn-primary" @click="goToApplyToken">申請 JWT Token</button>
            </div>
        </div>

        <div class="filter-card">
            <div>
                <input
                    v-model="searchQuery"
                    type="text"
                    class="search-input"
                    placeholder="輸入 JTI、簽發者或環境進行模糊查詢..."
                />
            </div>
            <div class="stats">
                <span style="color: #64748b; font-size: 0.875rem">
                    過濾後筆數:
                    <strong>{{ filteredTokens.length }}</strong> 筆
                </span>
            </div>
        </div>

        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th style="width: 25%">唯一識別碼 (JTI)</th>
                        <th style="width: 8%">環境</th>
                        <th style="width: 12%">簽發者</th>
                        <th class="sortable-th" style="width: 15%" @click="sortBy('issuedAt')">
                            簽發時間 <span class="sort-icon">{{ getSortIcon('issuedAt') }}</span>
                        </th>
                        <th class="sortable-th" style="width: 15%" @click="sortBy('expiresAt')">
                            過期時間 <span class="sort-icon">{{ getSortIcon('expiresAt') }}</span>
                        </th>
                        <th style="width: 10%">狀態</th>
                        <th style="width: 15%; text-align: right">操作</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="token in paginatedTokens" :key="token.id">
                        <td>
                            <div style="color: #334155; font-weight: 600; font-family: monospace">
                                {{ token.id }}
                            </div>
                        </td>
                        <td>
                            <span class="env-badge">{{ token.environment }}</span>
                        </td>
                        <td style="font-weight: 500">{{ token.subject }}</td>
                        <td style="color: #64748b; font-size: 0.875rem">
                            {{ formatDate(token.issuedAt) }}
                        </td>
                        <td style="color: #64748b; font-size: 0.875rem">
                            {{ formatDate(token.expiresAt) }}
                        </td>
                        <td>
                            <span v-if="token.revoked" style="color: #dc3545; font-weight: bold"
                                >已撤銷</span
                            >
                            <span
                                v-else-if="isExpired(token.expiresAt)"
                                style="color: #fd7e14; font-weight: bold"
                                >已過期</span
                            >
                            <span v-else style="color: #198754; font-weight: bold">生效中</span>
                        </td>
                        <td style="text-align: right; white-space: nowrap">
                            <button class="btn btn-secondary" @click="copyToken(token.tokenValue)">
                                複製
                            </button>

                            <button
                                v-if="!token.revoked && !isExpired(token.expiresAt)"
                                class="btn btn-danger"
                                @click="openRevokeModal(token)"
                            >
                                撤銷
                            </button>

                            <button
                                v-else
                                class="btn"
                                style="
                                    background-color: #e2e8f0;
                                    color: #94a3b8;
                                    cursor: not-allowed;
                                "
                                disabled
                            >
                                不可操作
                            </button>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div class="pagination-container">
            <button class="btn btn-secondary" :disabled="currentPage === 1" @click="changePage(-1)">
                上一頁
            </button>
            <span class="page-info">第 {{ currentPage }} 頁 / 共 {{ totalPages }} 頁</span>
            <button
                class="btn btn-secondary"
                :disabled="currentPage === totalPages"
                @click="changePage(1)"
            >
                下一頁
            </button>
        </div>

        <div class="toast" :class="{ show: showToast }">複製成功！</div>

        <div v-if="showModal" class="modal-overlay">
            <div class="modal-container">
                <div class="modal-header">
                    <h3>確認撤銷授權</h3>
                </div>
                <div class="modal-body">
                    <p class="warning-text">
                        請注意：撤銷後，此 Token 將立即從 Redis 白名單中移除並失效。
                    </p>
                    <div class="form-group">
                        <label>撤銷原因 (必填)：</label>
                        <input
                            v-model="revokeReason"
                            type="text"
                            class="form-control"
                            placeholder="請輸入撤銷原因"
                        />
                        <span v-if="revokeError" class="error-msg">請務必填寫撤銷原因</span>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" @click="closeRevokeModal">取消</button>
                    <button class="btn btn-danger" @click="submitRevoke">確定撤銷</button>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* 將原本的 :root 變數移到最外層容器，避免污染全域 */
.dashboard-wrapper {
    --surface-color: #ffffff;
    --bg-color: #f1f5f9;
    --primary-color: #3b82f6;
    --primary-hover: #2563eb;
    --border-radius: 12px;
    --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
    --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);

    padding: 2.5rem 2rem;
    max-width: 1400px;
    margin: 0 auto;
}

/* 標題與工具列 */
.header-section {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin-bottom: 2rem;
}

.header-title {
    font-size: 2.25rem;
    font-weight: 800;
    color: #1e293b;
    margin: 0 0 0.5rem 0;
}

.header-subtitle {
    color: #64748b;
    font-size: 1rem;
    margin: 0;
}

.action-group {
    display: flex;
    gap: 1rem;
}

/* 搜尋與過濾區塊 */
.filter-card {
    background: var(--surface-color);
    padding: 1.5rem;
    border-radius: var(--border-radius);
    box-shadow: var(--shadow-sm);
    margin-bottom: 2rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border: 1px solid #e2e8f0;
}

.search-input {
    width: 400px;
    padding: 0.875rem 1.25rem;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    font-size: 0.9375rem;
    background-color: #f8fafc;
    transition: all 0.3s ease;
}

.search-input:focus {
    outline: none;
    background-color: #ffffff;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
}

/* 表格設計增強 */
.table-container {
    background: var(--surface-color);
    border-radius: var(--border-radius);
    box-shadow: var(--shadow-lg);
    overflow: auto;
    border: 1px solid #e2e8f0;
}

table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
}

th {
    background-color: #f8fafc;
    padding: 1.25rem 1.5rem;
    font-size: 0.75rem;
    font-weight: 700;
    color: #475569;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    border-bottom: 2px solid #e2e8f0;
}

td {
    padding: 1.25rem 1.5rem;
    border-bottom: 1px solid #f1f5f9;
    vertical-align: middle;
}

tbody tr {
    transition: background-color 0.2s ease;
}

tbody tr:hover {
    background-color: #f8fafc;
}

/* 標籤與按鈕優化 */
.env-badge {
    background-color: #eff6ff;
    color: #2563eb;
    border: 1px solid #bfdbfe;
    padding: 0.35rem 0.75rem;
    border-radius: 6px;
    font-size: 0.875rem;
}

.btn {
    border-radius: 8px;
    font-weight: 600;
    letter-spacing: 0.025em;
    box-shadow: var(--shadow-sm);
    border: none;
    cursor: pointer;
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
    min-width: 72px;
}

.btn-primary {
    background: linear-gradient(135deg, var(--primary-color), var(--primary-hover));
    color: white;
    padding: 0.75rem 1.5rem;
}

.btn-danger {
    background: linear-gradient(135deg, #ef4444, #dc2626);
    color: white;
}

.btn-secondary {
    background-color: #64748b;
    color: white;
}

.btn-secondary:hover:not(:disabled) {
    background-color: #475569;
}

.table-container td .btn + .btn {
    margin-left: 0.5rem;
}

/* 排序與分頁 */
.sortable-th {
    cursor: pointer;
    user-select: none;
    transition: background-color 0.2s;
}

.sortable-th:hover {
    background-color: #e2e8f0;
}

.sort-icon {
    display: inline-block;
    margin-left: 4px;
    color: #3b82f6;
    font-weight: bold;
}

.pagination-container {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 1.5rem;
    margin-top: 1.5rem;
    padding-top: 1rem;
}

.page-info {
    font-weight: 600;
    color: #475569;
    font-size: 0.9375rem;
}

/* Toast 與 Modal */
.toast {
    position: fixed;
    bottom: 30px;
    right: -300px;
    background-color: #10b981;
    color: white;
    padding: 1rem 1.5rem;
    border-radius: 8px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    font-weight: 600;
    transition: right 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    z-index: 9999;
}

.toast.show {
    right: 30px;
}

.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
}

.modal-container {
    background-color: #ffffff;
    border-radius: 8px;
    width: 400px;
    max-width: 90%;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    overflow: hidden;
}

.modal-header {
    background-color: #f8f9fa;
    padding: 16px 20px;
    border-bottom: 1px solid #e9ecef;
}

.modal-header h3 {
    margin: 0;
    font-size: 1.2rem;
    color: #343a40;
}

.modal-body {
    padding: 20px;
}

.warning-text {
    color: #856404;
    background-color: #fff3cd;
    padding: 10px;
    border-radius: 4px;
    font-size: 0.9rem;
    margin-bottom: 15px;
    border: 1px solid #ffeeba;
}

.form-group {
    display: flex;
    flex-direction: column;
}

.form-group label {
    margin-bottom: 8px;
    font-weight: bold;
    color: #495057;
}

.form-control {
    padding: 10px;
    border: 1px solid #ced4da;
    border-radius: 4px;
    font-size: 1rem;
}

.form-control:focus {
    outline: none;
    border-color: #80bdff;
    box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
}

.error-msg {
    color: #dc3545;
    font-size: 0.85rem;
    margin-top: 5px;
}

.modal-footer {
    padding: 16px 20px;
    border-top: 1px solid #e9ecef;
    display: flex;
    justify-content: flex-end;
    gap: 10px;
}
</style>
