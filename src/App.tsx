import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { Layout, LegacyPage, MissingPage, RoutePosition } from './components/Layout';
import { routes } from './sections';

const pages = routes.map((route) => {
  const Page = route.load && lazy(route.load);
  return {
    path: route.path,
    element: Page ? <Page /> : <LegacyPage label={route.label} path={route.legacy!} />,
  };
});

export function App() {
  return <Layout>
    <Suspense fallback={<p role="status">正在加载…</p>}>
      <Routes>
        {pages.map(({ path, element }) => <Route path={path} element={<>{element}<RoutePosition /></>} key={path} />)}
        <Route path="*" element={<MissingPage />} />
      </Routes>
    </Suspense>
  </Layout>;
}
