import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '@fontsource-variable/dm-sans';
import { App } from './App';
import './styles/theme.css';

async function start() {
  if (import.meta.env.DEV && import.meta.env.VITE_TEAM_MOCK !== '0') {
    const { installMock } = await import('./sections/team/mock');
    installMock();
  }
  createRoot(document.getElementById('root')!).render(
    <BrowserRouter basename={import.meta.env.BASE_URL}><App /></BrowserRouter>,
  );
}
void start();
