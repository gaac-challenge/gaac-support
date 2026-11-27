import { Link } from 'react-router-dom';
import { Street, SupportFrame } from '../components';

const openServices = [
  { title: '搜索服务', path: '/search/', description: '网页、平台、文档、行情和图片，一把密钥接入。' },
  { title: '队伍', path: '/team/', description: '创建队伍、邀请队友和管理成员。' },
];

const pendingServices = [
  { title: '比赛任务', path: '/tasks/' },
  { title: '统一模型', path: '/model/' },
  { title: '数据集', path: '/data/' },
  { title: '工具应用', path: '/tools/' },
  { title: '测评服务', path: '/eval/' },
];

export function HomePage() {
  return <SupportFrame title="GAAC 技术支持" home>
    <section className="hero" aria-labelledby="hero-title">
      <Street title="技术支持街景" />
      <div className="hero__base">
        <div>
          <h1 id="hero-title">GAAC 技术支持</h1>
          <p className="lead">比赛流程还在制定，目前开放搜索服务和队伍的创建与管理。</p>
        </div>
        <div className="actions">
          <Link className="pill primary" to="/team/">进入我的队伍</Link>
          <Link className="pill secondary" to="/search/">搜索服务</Link>
        </div>
      </div>
    </section>
    <section className="home-services" aria-labelledby="services-title">
      <h2 id="services-title">比赛服务</h2>
      <div className="home-service-grid">
        {openServices.map(({ title, path, description }) => <Link className="card home-service" to={path} key={path}>
          <div><h3>{title}</h3><span className="home-chip ready">已开放</span></div>
          <p>{description}</p>
        </Link>)}
      </div>
      <h3 className="home-pending-title" id="pending-services-title">以下板块筹备中</h3>
      <ul className="home-pending-grid" aria-labelledby="pending-services-title">
        {pendingServices.map(({ title, path }) => <li key={path}><Link className="card home-service" to={path}>{title}</Link></li>)}
      </ul>
    </section>
    <section className="home-services" aria-labelledby="simulation-title">
      <h2 id="simulation-title">赛程推演</h2>
      <div className="home-service-grid">
        <Link className="card home-service" to="/sandbox/"><div><h3>赛程沙盘</h3><span className="home-chip">推演</span></div></Link>
      </div>
    </section>
  </SupportFrame>;
}
