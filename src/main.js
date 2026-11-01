import { createApp } from 'vue';
import './styles/tokens.css';
import './style.css';
import './styles/liquid-glass.css';
import './styles/primitives.css';
import './styles/motion.css';
import './styles/media-image-retry.css';
import './styles/image-loading.css';
import './styles/appearance.css';
import './styles/continuous-corners.css';
import { liquidGlassPlugin } from './ui/liquidGlass.js';
import { mediaImagePlugin } from './utils/mediaImageRecovery.js';
import { imageLoadingPresentationPlugin } from './utils/imageLoadingPresentation.js';
import { staticCornersPlugin } from './ui/staticCorners.js';
import App from './App.vue';

createApp(App).use(imageLoadingPresentationPlugin).use(mediaImagePlugin).use(liquidGlassPlugin).use(staticCornersPlugin).mount('#app');
