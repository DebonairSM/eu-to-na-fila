import { describe, expect, it } from 'vitest';
import { buildUsageDrilldownGraph } from './usageDrilldown.js';

describe('buildUsageDrilldownGraph', () => {
  const shops = [
    { id: 1, name: 'Alpha', slug: 'alpha' },
    { id: 2, name: 'Beta', slug: 'beta' },
  ];

  it('builds endpoint drilldown graph with root, shops, and contexts', () => {
    const buckets = [
      { shopId: 1, endpointTag: 'queue', method: 'GET', clientContext: 'web', requestCount: 10 },
      { shopId: 1, endpointTag: 'queue', method: 'GET', clientContext: 'kiosk', requestCount: 5 },
      { shopId: 2, endpointTag: 'queue', method: 'GET', clientContext: 'web', requestCount: 7 },
    ];
    const out = buildUsageDrilldownGraph(buckets, shops, 'endpoint', 'queue:GET', 20);

    expect(out.nodes.find((n) => n.type === 'root')?.label).toBe('queue:GET');
    expect(out.nodes.some((n) => n.label.includes('Alpha (alpha)'))).toBe(true);
    expect(out.nodes.some((n) => n.label === 'web')).toBe(true);
    expect(out.edges.length).toBeGreaterThan(0);
  });

  it('respects limit cap for detail nodes', () => {
    const buckets = [
      { shopId: 1, endpointTag: 'a', method: 'GET', clientContext: 'web', requestCount: 10 },
      { shopId: 1, endpointTag: 'b', method: 'GET', clientContext: 'web', requestCount: 9 },
      { shopId: 1, endpointTag: 'c', method: 'GET', clientContext: 'web', requestCount: 8 },
    ];
    const out = buildUsageDrilldownGraph(buckets, shops, 'source', 'web', 1);
    const detailNodes = out.nodes.filter((n) => n.type === 'detail');
    expect(detailNodes.length).toBe(1);
  });
});
