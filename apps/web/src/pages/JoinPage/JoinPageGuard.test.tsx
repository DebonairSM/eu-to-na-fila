import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { JoinPageGuard } from './JoinPageGuard';

const getActiveTicketByDeviceMock = vi.fn();
const getTicketMock = vi.fn();

vi.mock('@/lib/api', () => ({
  api: {
    getActiveTicketByDevice: (...args: unknown[]) => getActiveTicketByDeviceMock(...args),
    getTicket: (...args: unknown[]) => getTicketMock(...args),
  },
}));

vi.mock('@/components/Navigation', () => ({
  Navigation: () => <div>nav</div>,
}));

vi.mock('@/components/LoadingSpinner', () => ({
  LoadingSpinner: () => <div>loading</div>,
}));

vi.mock('@/components/design-system', () => ({
  Container: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/contexts/ShopSlugContext', () => ({
  useShopSlug: () => 'barbershop',
}));

vi.mock('@/contexts/LocaleContext', () => ({
  useLocale: () => ({ t: (key: string) => key }),
}));

vi.mock('./index', () => ({
  JoinPage: () => <div>join-page</div>,
}));

vi.mock('@/lib/utils', () => ({
  getOrCreateDeviceId: () => 'device-1',
  redirectToStatusPage: vi.fn(),
}));

describe('JoinPageGuard active-ticket checks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('makes a single active-ticket request attempt and falls back to join page', async () => {
    getActiveTicketByDeviceMock.mockRejectedValueOnce(new Error('network fail'));

    render(
      <MemoryRouter>
        <JoinPageGuard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(getActiveTicketByDeviceMock).toHaveBeenCalledTimes(1);
    });
  });
});

