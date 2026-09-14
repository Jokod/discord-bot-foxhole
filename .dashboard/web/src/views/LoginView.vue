<template>
  <div class="login-gate">
    <form
      class="login-card"
      :class="{ 'is-loading': loading }"
      @submit.prevent="submit"
    >
      <p class="brand">
        Fox<span>Bot</span> stats
      </p>
      <p class="login-sub">
        {{ t('login.subtitle') }}
      </p>
      <label class="field lang-field">
        <span>{{ t('lang.label') }}</span>
        <select
          v-model="lang"
          :disabled="loading"
          @change="changeLang"
        >
          <option value="en">English</option>
          <option value="es">Español</option>
          <option value="fr">Français</option>
          <option value="ru">Русский</option>
          <option value="zh-CN">中文</option>
        </select>
      </label>
      <label class="field">
        <span>{{ t('login.username') }}</span>
        <input
          v-model="username"
          type="text"
          required
          autocomplete="username"
          :disabled="loading"
        >
      </label>
      <label class="field">
        <span>{{ t('login.password') }}</span>
        <input
          v-model="password"
          type="password"
          required
          autocomplete="current-password"
          :disabled="loading"
        >
      </label>
      <p
        v-if="error"
        class="error"
      >
        {{ error }}
      </p>
      <button
        type="submit"
        :disabled="loading"
        :aria-busy="loading"
      >
        <LoadingState
          v-if="loading"
          inline
          :message="t('login.loading')"
        />
        <span v-else>{{ t('login.submit') }}</span>
      </button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import LoadingState from '@/components/LoadingState.vue';
import { useAuthStore } from '@/stores/auth';
import { persistLang, type AppLocale } from '@/i18n';

const { t, locale } = useI18n();
const auth = useAuthStore();
const router = useRouter();
const username = ref('');
const password = ref('');
const error = ref('');
const loading = ref(false);
const lang = ref(locale.value as AppLocale);

function changeLang() {
	persistLang(lang.value);
	locale.value = lang.value;
}

async function submit() {
	if (loading.value) return;
	error.value = '';
	loading.value = true;
	try {
		const user = await auth.login(username.value, password.value);
		password.value = '';
		if (user.isDefault) {
			await router.push({ name: 'settings', params: { tab: 'account' } });
		}
		else {
			await router.push({ name: 'overview' });
		}
	}
	catch (err) {
		error.value = err instanceof Error ? err.message : t('error.loginFailed');
	}
	finally {
		loading.value = false;
	}
}
</script>
