import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { MaharashtraChoropleth } from './MaharashtraChoropleth';

const render = (data: Record<string, { value: number }>) =>
  renderToString(createElement(MaharashtraChoropleth, { data, metricLabel: 'cases' }));

describe('MaharashtraChoropleth', () => {
  // Pages render the map before their data arrives, and some metrics have no
  // records at all, so an empty dataset must not break the legend.
  it('renders with no data', () => {
    expect(() => render({})).not.toThrow();
  });

  it('renders a single district', () => {
    const html = render({ Pune: { value: 3 } });
    expect(html).toContain('Pune: 3 cases');
  });
});
