import { defineStore } from 'pinia';
import { ref } from 'vue';
import { api, setUnauthorizedHandler } from '@/api/client';
import type { AuthUser } from '@/types';

export const useAuthStore = defineStore('auth', () => {
	const user = ref<AuthUser | null>(null);
	const ready = ref(false);

	setUnauthorizedHandler(() => {
		user.value = null;
	});

	async function bootstrap() {
		try {
			const me = await api<AuthUser>('/api/me');
			user.value = me?.authenticated ? me : null;
		}
		catch {
			user.value = null;
		}
		finally {
			ready.value = true;
		}
		return Boolean(user.value);
	}

	async function login(username: string, password: string) {
		const u = await api<AuthUser>('/api/login', {
			method: 'POST',
			body: JSON.stringify({ username, password }),
		});
		user.value = u;
		return u;
	}

	async function logout() {
		try {
			await api('/api/logout', { method: 'POST', body: '{}' });
		}
		catch {
			// ignore
		}
		user.value = null;
	}

	async function updateProfile(payload: { username: string; currentPassword: string; newPassword?: string }) {
		const updated = await api<AuthUser>('/api/profile', {
			method: 'POST',
			body: JSON.stringify(payload),
		});
		user.value = updated;
		return updated;
	}

	return { user, ready, bootstrap, login, logout, updateProfile };
});
