import { useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { ConvertedContent } from '../../components/ConvertedContent';
import { usePageTitle } from '../../components/Layout';
// @ts-expect-error Original timeline code is an isolated JavaScript module.
import { mountSandbox } from './controller.js';
import pages from './content/pages.json';
import './content/source.css';
import './sandbox.css';

type PresetControls = {
  presets: { id: string; name: string }[];
  presetId: string;
  riskCount: number;
  description: string;
  choose: (id: string) => void;
};

function Presets({ presets, presetId, riskCount, choose }: PresetControls) {
  return <>
    {presets.map(({ id, name }) => <button key={id} className="btn" type="button" data-p={id}
      aria-pressed={id === presetId} onClick={() => choose(id)}>{name}</button>)}
    <button className="btn" type="button" data-p="__dice" aria-pressed={presetId === '__dice'} onClick={() => choose('__dice')}>
      <svg aria-hidden="true"><use href="#i-dice" /></svg>掷骰子
    </button>
    {riskCount > 0 && <button className="btn ghost" type="button" data-p="__clear" onClick={() => choose('__clear')}>清空</button>}
  </>;
}

export default function SandboxPage() {
  usePageTitle('GAAC 全程沙盘');
  const [panel, setPanel] = useState<{ controls: PresetControls; buttons: Element; description: Element }>();
  const mount = useCallback((root: HTMLDivElement) => {
    const buttons = root.querySelector('#presets')!;
    const description = root.querySelector('#presetDesc')!;
    return mountSandbox(root, (controls: PresetControls) => setPanel({ controls, buttons, description }));
  }, []);
  return <>
    <ConvertedContent className="sandbox-page sandbox-page-index" page={pages['']} mount={mount} />
    {panel && createPortal(<Presets {...panel.controls} />, panel.buttons)}
    {panel && createPortal(panel.controls.description, panel.description)}
  </>;
}
