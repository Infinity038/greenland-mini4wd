import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, cleanup, waitFor } from '@testing-library/react';
import TurnstileWidget, { turnstileConfigured } from './TurnstileWidget';

afterEach(() => { cleanup(); vi.unstubAllEnvs(); delete (window as { turnstile?: unknown }).turnstile; });

describe('TurnstileWidget', () => {
  it('is inert without a site key (local development): renders nothing and reports an empty token', () => {
    vi.stubEnv('NEXT_PUBLIC_TURNSTILE_SITE_KEY', '');
    const onToken = vi.fn();
    const { container } = render(<TurnstileWidget onToken={onToken} />);
    expect(container.firstChild).toBeNull();
    expect(onToken).toHaveBeenCalledWith('');
    expect(turnstileConfigured()).toBe(false);
  });

  it('renders the challenge with the public site key and relays token, expiry and error', async () => {
    vi.stubEnv('NEXT_PUBLIC_TURNSTILE_SITE_KEY', 'test-site-key');
    let opts: Record<string, (t?: string) => void> & { sitekey?: string } = {};
    (window as unknown as { turnstile: unknown }).turnstile = { render: (_el: HTMLElement, o: typeof opts) => { opts = o; return 'w1'; }, remove: vi.fn(), reset: vi.fn() };
    const onToken = vi.fn();
    const { getByTestId } = render(<TurnstileWidget onToken={onToken} />);
    expect(getByTestId('turnstile')).toBeTruthy();
    await waitFor(() => expect(opts.sitekey).toBe('test-site-key'));
    opts.callback('tok'); expect(onToken).toHaveBeenLastCalledWith('tok');
    opts['expired-callback'](); expect(onToken).toHaveBeenLastCalledWith(null);
    opts['error-callback'](); expect(onToken).toHaveBeenLastCalledWith(null);
  });

  it('re-renders a fresh challenge when resetKey changes and removes the old one', async () => {
    vi.stubEnv('NEXT_PUBLIC_TURNSTILE_SITE_KEY', 'test-site-key');
    const remove = vi.fn(); const renderFn = vi.fn(() => 'w' + Math.random());
    (window as unknown as { turnstile: unknown }).turnstile = { render: renderFn, remove, reset: vi.fn() };
    const { rerender } = render(<TurnstileWidget onToken={() => {}} resetKey={0} />);
    await waitFor(() => expect(renderFn).toHaveBeenCalledTimes(1));
    rerender(<TurnstileWidget onToken={() => {}} resetKey={1} />);
    await waitFor(() => expect(renderFn).toHaveBeenCalledTimes(2));
    expect(remove).toHaveBeenCalledTimes(1);
  });
});
