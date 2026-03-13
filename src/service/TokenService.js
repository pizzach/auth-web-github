const API_BASE = import.meta.env.VITE_API_BASE_URL;

// 建立一個共用的 Helper 來產生 Headers，減少重複程式碼
const getHeaders = () => {
    const token = localStorage.getItem('user_token');
    return {
        'Content-Type': 'application/json',
        Authorization: token ? `Bearer ${token}` : ''
    };
};

// 處理 401/403 與共通的錯誤邏輯
const handleResponse = async (res) => {
    if (res.status === 401 || res.status === 403) {
        localStorage.removeItem('user_token');
        window.location.href = '/auth/login';
        throw new Error('未授權或憑證已過期');
    }

    const json = await res.json();

    // 配合後端 ReturnJson 格式，檢查 code 並回傳 data
    if (json.code !== '200' && json.code !== 'SUCCESS') {
        throw new Error(json.msg || 'API 請求失敗');
    }

    return json.data;
};

export const TokenService = {
    // 1. 取得所有 Token (你原本寫好的)
    async getTokens() {
        const res = await fetch(`${API_BASE}/console/token/list`, {
            method: 'GET',
            headers: getHeaders()
        });
        return handleResponse(res);
    },

    // 2. 撤銷 Token (幫你修正這段：加上 API_BASE、Headers、防呆)
    async revokeToken(jti, environment, reason) {
        const payload = { jti, environment, reason };
        const res = await fetch(`${API_BASE}/console/token/revoke`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(payload)
        });
        return handleResponse(res);
    },

    // 3. 取得特定環境下的 API 權限清單 (給 ApplyToken.vue 用的)
    async getPermissions(env) {
        const res = await fetch(`${API_BASE}/console/token/permissions?env=${env}`, {
            method: 'GET',
            headers: getHeaders()
        });
        return handleResponse(res);
    },

    // 4. 產生 JWT Token (給 ApplyToken.vue 用的)
    async generateJwtToken(payload) {
        const res = await fetch(`${API_BASE}/console/token/generate-jwt-token`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(payload)
        });
        return handleResponse(res);
    }
};
