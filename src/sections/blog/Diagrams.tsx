import Markdown from 'react-markdown';

type Legend = { id: string; title: string; label: string; description: string };
type SequenceData = Legend & { heading: string[]; caption: string; messages: { from: string; payload: string; to: string; direction: 'to' | 'from' | 'both' }[] };
type PipelineData = Legend & { rows: { group: string; steps: { title: string; detail: string; availability: string }[] }[]; key: string[] };

function FigureHeading({ title, label, description }: Legend) {
  return <><header><strong>{title}</strong><span>{label}</span></header><p>{description}</p></>;
}

export function SequenceDiagram({ data }: { data: SequenceData }) {
  return <figure id={data.id} className="blog-figure card">
    <FigureHeading id={data.id} title={data.title} label={data.label} description={data.description} />
    <div className="blog-diagram-scroll" tabIndex={0}>
      <div className="blog-sequence">
        <div className="blog-sequence-label">{data.heading.map((name) => <b key={name}>{name}</b>)}</div>
        {data.messages.map(({ from, payload, to, direction }) => <div className="blog-sequence-row" key={payload}>
          <span>{from}</span><div><Markdown>{payload}</Markdown><i className={'blog-sequence-arrow ' + direction} aria-hidden="true" /></div><span>{to}</span>
        </div>)}
      </div>
    </div>
    <figcaption><Markdown>{data.caption}</Markdown></figcaption>
  </figure>;
}

export function PipelineDiagram({ data }: { data: PipelineData }) {
  return <figure id={data.id} className="blog-figure card">
    <FigureHeading id={data.id} title={data.title} label={data.label} description={data.description} />
    <div className="blog-diagram-scroll" tabIndex={0}>
      <div className="blog-pipeline">{data.rows.map(({ group, steps }) => <div className="blog-pipeline-row" key={group}>
        <strong>{group}</strong>
        {steps.map(({ title, detail, availability }) => <div key={title} className={'blog-pipeline-' + availability}><b>{title}</b><span>{detail}</span></div>)}
      </div>)}</div>
    </div>
    <div className="blog-pipeline-key">{data.key.map((label) => <span key={label}>{label}</span>)}</div>
  </figure>;
}
