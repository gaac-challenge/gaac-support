// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SandboxPage from './SandboxPage';
import { anchors } from './Sections';
import { config, defaults, run } from './simulation';

function open() {
  return render(<MemoryRouter><SandboxPage /></MemoryRouter>);
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('sandbox controls', () => {
  it('selects every preset and clears the active risks', () => {
    open();
    const group = within(screen.getByRole('group', { name: '一键情景' }));
    for (const preset of config.presets) {
      fireEvent.click(group.getByRole('button', { name: preset.name }));
      expect(group.getByRole('button', { name: preset.name })).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByRole('combobox', { name: '情景' })).toHaveValue(preset.id);
      expect(screen.queryAllByRole('button', { name: '删除这条风险' })).toHaveLength(preset.risks.length);
    }
    const withRisks = config.presets.find((preset) => preset.risks.length)!;
    fireEvent.click(group.getByRole('button', { name: withRisks.name }));
    fireEvent.click(group.getByRole('button', { name: '清空' }));
    expect(screen.queryByRole('button', { name: '删除这条风险' })).toBeNull();
    expect(group.getByRole('button', { name: config.presets[0].name })).toHaveAttribute('aria-pressed', 'true');
  });

  it('rolls risks across all stages and restores parameters and risks', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    open();
    fireEvent.change(screen.getByRole('spinbutton', { name: '队伍数' }), { target: { value: '4' } });
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('四支队伍');
    fireEvent.click(within(screen.getByRole('group', { name: '一键情景' })).getByRole('button', { name: '掷骰子' }));
    expect(screen.getAllByRole('button', { name: '删除这条风险' })).toHaveLength(3);
    expect(screen.getByRole('combobox', { name: '情景' })).toHaveDisplayValue('随机');
    for (const stage of ['赛前', '赛中', '赛后']) {
      expect(within(screen.getByRole('region', { name: '情景与风险' })).getByText(new RegExp('^#\\d+ [^#]* · ' + stage + '$'))).toBeVisible();
    }
    fireEvent.click(screen.getByRole('button', { name: '恢复默认' }));
    expect(screen.getByRole('spinbutton', { name: '队伍数' })).toHaveValue(5);
    expect(screen.queryByRole('button', { name: '删除这条风险' })).toBeNull();
  });

  it('injects and edits a risk, then injects another from the register', () => {
    open();
    fireEvent.change(screen.getByRole('combobox', { name: '添加风险' }), { target: { value: 'outage' } });
    const risk = within(screen.getByRole('region', { name: '情景与风险' }));
    expect(risk.getByText('#1 机器宕机 · 赛中')).toBeVisible();
    fireEvent.change(risk.getByRole('spinbutton', { name: '停' }), { target: { value: '30' } });
    expect(risk.getByRole('spinbutton', { name: '停' })).toHaveValue(30);
    const register = within(screen.getByRole('region', { name: '风险登记册' }));
    fireEvent.click(register.getAllByRole('button', { name: /注入/ })[0]);
    expect(risk.getAllByRole('button', { name: '删除这条风险' })).toHaveLength(2);
    expect(location.hash).toBe('#risks');
    history.replaceState(null, '', location.pathname);
  });

  it('seeks on a click and follows pointer movement across the full time band', () => {
    vi.stubGlobal('PointerEvent', MouseEvent);
    open();
    const band = screen.getByLabelText('全程时间带，点击或拖动跳到任一时刻');
    vi.spyOn(band, 'getBoundingClientRect').mockReturnValue({ left: 100, width: 900 } as DOMRect);
    const result = run(defaults(), []);
    const start = result.stages[0].a, end = result.stages[2].b;
    const output = screen.getByLabelText('当前时刻');
    fireEvent.pointerDown(band, { clientX: 100 });
    expect(output).toHaveTextContent(result.F.dt(start));
    fireEvent.pointerMove(band, { clientX: 550 });
    expect(output).toHaveTextContent(result.F.dt(Math.round((start + end) / 2)));
    fireEvent.pointerUp(band);
    fireEvent.pointerMove(band, { clientX: 1000 });
    expect(output).toHaveTextContent(result.F.dt(Math.round((start + end) / 2)));
  });

  it('gives every sidebar link its own titled section', () => {
    open();
    const sidebar = within(screen.getByRole('navigation', { name: '推演导航' }));
    for (const [id, label] of anchors) {
      expect(sidebar.getByRole('link', { name: label })).toHaveAttribute('href', '#' + id);
      const section = document.getElementById(id);
      expect(section).toBeInTheDocument();
      expect(within(section!).getAllByRole('heading').length).toBeGreaterThan(0);
    }
  });
});
