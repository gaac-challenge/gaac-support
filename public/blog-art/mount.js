const request = new URLSearchParams(location.search);
const post = request.get('post');
const figure = request.get('figure');
const entries = await fetch('./drawings.json').then((response) => response.json());
if (Object.hasOwn(entries, post) && Object.hasOwn(entries[post], figure)) {
  const root = document.querySelector('main');
  for (const [key, parts] of Object.entries(entries[post])) {
    const drawing = document.createElement('div');
    drawing.hidden = key !== figure;
    for (const { id, table, className, legend } of parts) {
      const container = document.createElement('div');
      if (legend) {
        container.className = 'legend';
        for (const label of legend) {
          const item = document.createElement('span');
          item.textContent = label;
          container.append(item);
        }
      } else {
        container.id = id;
        container.className = className;
      }
      if (table) {
        const details = document.createElement('details');
        const summary = document.createElement('summary');
        summary.textContent = '看数据表';
        details.append(summary, container);
        drawing.append(details);
      } else {
        drawing.append(container);
      }
    }
    root.append(drawing);
  }
  const script = document.createElement('script');
  script.src = './' + post + '.js';
  document.body.append(script);
  new ResizeObserver(() => {
    parent.postMessage({ type: 'gaac-blog-drawing', height: Math.ceil(root.getBoundingClientRect().height + 1) }, location.origin);
  }).observe(root);
}
