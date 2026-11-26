import { Link, useLocation } from 'react-router-dom';
import { PageHeader } from '../../components/PageHeader';
import { SupportFrame } from './components';
import { HomePage } from './pages/HomePage';
import { SearchPage } from './pages/SearchPage';
import { support } from './routes';

function Placeholder({ title }: { title: string }) {
  return <SupportFrame title={title}>
    <PageHeader title={title} description={<p>这部分还在筹备，比赛流程定下来以后在这里发布。</p>} actions={<>
      <Link className="pill secondary" to="/search/">搜索服务</Link>
      <Link className="pill primary" to="/team/">我的队伍</Link>
    </>} />
  </SupportFrame>;
}

export default function SupportPage() {
  const path = useLocation().pathname.replace(/\/$/, '') || '/';
  if (path === '/') return <HomePage />;
  if (path === '/search') return <SearchPage />;
  return <Placeholder title={support.routes.find((route) => route.path === path)!.label} />;
}
