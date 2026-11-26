import { useLocation } from 'react-router-dom';
import { PageHeader } from '../../components/PageHeader';
import { SupportFrame, SupportLink } from './components';
import { placeholders } from './content/placeholders';
import { EvaluationPage } from './pages/EvaluationPage';
import { HomePage } from './pages/HomePage';
import { ModelPage } from './pages/ModelPage';
import { SearchPage } from './pages/SearchPage';
import { TasksPage } from './pages/TasksPage';

const pages = { '/': HomePage, '/tasks': TasksPage, '/model': ModelPage, '/search': SearchPage, '/eval': EvaluationPage };

export default function SupportPage() {
  const path = useLocation().pathname.replace(/\/$/, '') || '/';
  const Page = pages[path as keyof typeof pages];
  if (Page) return <Page />;
  const { pageTitle, heading, message, learnMore = { href: 'tasks.html', label: '看比赛任务' } } = placeholders[path];
  return <SupportFrame title={pageTitle}><PageHeader title={heading} description={<p className="lead">{message}</p>} actions={<>
    <SupportLink className="pill primary" href="index.html">回到首页</SupportLink>
    <SupportLink className="pill secondary" href={learnMore.href}>{learnMore.label}</SupportLink>
  </>} /></SupportFrame>;
}
