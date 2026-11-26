import { useParams } from 'react-router-dom';
import { MissingPage, usePageTitle } from '../../components/Layout';
import { BlogIndex } from './BlogIndex';
import { BlogPost, parsePost } from './BlogPost';
import install from './content/install-agentx.md?raw';
import mock from './content/mock-server.md?raw';
import traces from './content/393-traces.md?raw';
import './blog.css';

const posts = {
  'install-agentx': parsePost(install),
  'mock-server': parsePost(mock),
  '393-traces': parsePost(traces),
};

export default function BlogPage() {
  const { slug } = useParams();
  const post = slug && Object.hasOwn(posts, slug) ? posts[slug as keyof typeof posts] : undefined;
  usePageTitle(post?.meta.title ?? (slug ? '页面未找到' : '动手笔记'));
  if (!slug) return <BlogIndex />;
  if (!post) return <MissingPage />;
  return <BlogPost key={slug} slug={slug} post={post} />;
}
