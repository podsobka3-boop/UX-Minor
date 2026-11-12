import { createRoot } from 'react-dom/client';
import Root from './Root';
import { registerServiceWorker } from './notify';
import './styles.css';

registerServiceWorker();
createRoot(document.getElementById('root')!).render(<Root />);
