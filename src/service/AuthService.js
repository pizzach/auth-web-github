import axios from 'axios';

const API_URL = 'https://local.ubot.css.com.tw:8081/auth';

export const AuthService = {
    async login(username, password) {
        try {
            const response = await axios.post(`${API_URL}/console/login`, {
                user: username,
                pwd: password
            });

            if (response.data && response.data.token) {
                localStorage.setItem('user_token', response.data.token);
                localStorage.setItem(
                    'user_info',
                    JSON.stringify({
                        username: response.data.username,
                        role: response.data.role
                    })
                );
            }

            return response.data;
        } catch (error) {
            throw error.response ? error.response.data : new Error('網路連接異常');
        }
    },

    logout() {
        localStorage.removeItem('user_token');
        localStorage.removeItem('user_info');
    },

    isAuthenticated() {
        return !!localStorage.getItem('user_token');
    }
};
