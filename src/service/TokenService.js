const API_BASE = import.meta.env.VITE_API_BASE_URL;

export const TokenService = {
    // 取得所有 Token
    async getTokens() {
        const token = localStorage.getItem('user_token');

        const res = await fetch(`${API_BASE}/api/console/token/list`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            }
        });

        if (res.status === 401 || res.status === 403) {
            localStorage.removeItem('user_token');
            window.location.href = '/auth/login';
            throw new Error('未授權或憑證已過期');
        }

        const json = await res.json();

        // 配合後端 ReturnJson 格式，檢查 code 並回傳 data
        // 假設你的成功代碼是 "0000" 或 "SUCCESS" (請依你的 ReturnJson 實際邏輯調整)
        if (json.code !== '200' && json.code !== 'SUCCESS') {
            throw new Error(json.msg || '取得列表失敗');
        }

        return json.data; // 只把 List<ConsoleTokenLogPO> 交給 Vue 畫面
    },

    // 撤銷 Token
    async revokeToken(jti, environment, reason) {
        const payload = { jti, environment, reason };
        const res = await fetch('/api/console/token/revoke', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('Revoke failed');
        return res;
    }
};
