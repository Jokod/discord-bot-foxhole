import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useSummaryStore } from '@/stores/summary';
import { useContactsStore } from '@/stores/contacts';
import { useMaterialsStore } from '@/stores/materials';

const router = createRouter({
	history: createWebHistory(),
	routes: [
		{ path: '/login', name: 'login', component: () => import('@/views/LoginView.vue'), meta: { public: true } },
		{
			path: '/',
			component: () => import('@/layouts/AppLayout.vue'),
			children: [
				{ path: '', name: 'overview', component: () => import('@/views/OverviewView.vue') },
				{ path: 'commands', name: 'commands', component: () => import('@/views/CommandsView.vue') },
				{ path: 'servers', name: 'guilds', component: () => import('@/views/GuildsView.vue') },
				{ path: 'discord', name: 'contacts', component: () => import('@/views/ContactsView.vue') },
				{ path: 'catalogue', name: 'materials', component: () => import('@/views/MaterialsView.vue') },
				{ path: 'logistics', name: 'product', component: () => import('@/views/ProductView.vue') },
				{ path: 'settings/:tab?', name: 'settings', component: () => import('@/views/SettingsView.vue') },
				// Legacy URL redirects (nav labels → path)
				{ path: 'guilds', redirect: { name: 'guilds' } },
				{ path: 'contacts', redirect: { name: 'contacts' } },
				{ path: 'materials', redirect: { name: 'materials' } },
				{ path: 'product', redirect: { name: 'product' } },
			],
		},
	],
});

router.beforeEach(async (to) => {
	const auth = useAuthStore();
	if (!auth.ready) await auth.bootstrap();
	if (to.meta.public) {
		if (auth.user && to.name === 'login') {
			return auth.user.isDefault ? { name: 'settings', params: { tab: 'account' } } : { name: 'overview' };
		}
		return true;
	}
	if (!auth.user) return { name: 'login' };
	if (auth.user.isDefault && to.name !== 'settings') {
		return { name: 'settings', params: { tab: 'account' } };
	}
	if (to.name === 'contacts') useContactsStore().load(false);
	if (to.name === 'materials') useMaterialsStore().load(false);
	if (to.name === 'settings' && auth.user.api?.enabled) {
		// tokens loaded in SettingsView
	}
	if (!auth.user.isDefault && !useSummaryStore().data && to.name !== 'settings') {
		try {
			await useSummaryStore().load(true);
		}
		catch (err) {
			if (err instanceof Error && 'status' in err && (err as { status: number }).status === 403) {
				return { name: 'settings', params: { tab: 'account' } };
			}
		}
	}
	return true;
});

export default router;
