import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import { i18n } from './i18n';
import { setApiI18n } from './api/client';
import '@fontsource/source-sans-3/400.css';
import '@fontsource/source-sans-3/600.css';
import '@fontsource/source-sans-3/700.css';
import '@fontsource/fraunces/600.css';
import '@fontsource/fraunces/700.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';
import './styles/main.css';
import {
	Chart as ChartJS,
	CategoryScale,
	LinearScale,
	BarElement,
	LineElement,
	PointElement,
	ArcElement,
	Title,
	Tooltip,
	Legend,
	Filler,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend, Filler);

const app = createApp(App);
app.use(createPinia());
app.use(i18n);
app.use(router);
setApiI18n(i18n.global.t);
app.mount('#app');
