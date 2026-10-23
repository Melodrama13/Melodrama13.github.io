import { createApp } from 'vue';
import './styles/tokens.css';
import './style.css';
import './styles/liquid-glass.css';
import './styles/primitives.css';
import './styles/motion.css';
import { liquidGlassPlugin } from './ui/liquidGlass.js';
import { mediaImagePlugin } from './utils/mediaImageRecovery.js';
import App from './App.vue';

createApp(App).use(mediaImagePlugin).use(liquidGlassPlugin).mount('#app');
