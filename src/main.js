import { createApp } from 'vue';
import './styles/tokens.css';
import './style.css';
import './styles/liquid-glass.css';
import './styles/primitives.css';
import { liquidGlassPlugin } from './ui/liquidGlass.js';
import App from './App.vue';

createApp(App).use(liquidGlassPlugin).mount('#app');
