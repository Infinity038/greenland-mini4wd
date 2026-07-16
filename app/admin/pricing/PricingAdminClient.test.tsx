import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import PricingAdminClient from './PricingAdminClient';

function createStandardSaleCampaign(name = 'Test Sale') {
  fireEvent.change(screen.getByPlaceholderText('e.g. Christmas Sale'), { target: { value: name } });
  fireEvent.click(screen.getByText(/CREATE CAMPAIGN \(DISABLED/));
}

describe('PricingAdminClient — Preview warning and role simulator', () => {
  it('shows the required Preview/mock-data warning', () => {
    render(<PricingAdminClient />);
    expect(screen.getByText(/PREVIEW — PRICING & CAMPAIGN ADMIN/)).toBeInTheDocument();
  });

  it('defaults to the Admin role', () => {
    render(<PricingAdminClient />);
    const adminBtn = screen.getByText('Admin');
    expect(adminBtn).toBeInTheDocument();
  });
});

describe('PricingAdminClient — campaign creation and permissions', () => {
  it('creates a Standard Sale campaign as Admin and lists it', () => {
    render(<PricingAdminClient />);
    createStandardSaleCampaign('Christmas Sale');
    expect(screen.getByText('Christmas Sale')).toBeInTheDocument();
    expect(screen.getByText(/CAMPAIGNS \(1\)/)).toBeInTheDocument();
  });

  it('Viewer role cannot see a creation form at all', () => {
    render(<PricingAdminClient />);
    fireEvent.click(screen.getByText('Viewer'));
    expect(screen.getByText(/Viewer role is read-only/)).toBeInTheDocument();
  });

  it('Shop Manager cannot create a Liquidation campaign', () => {
    render(<PricingAdminClient />);
    fireEvent.click(screen.getByText('Shop Manager'));
    fireEvent.change(screen.getByPlaceholderText('e.g. Christmas Sale'), { target: { value: 'Bad Liquidation' } });
    // The Liquidation <option> is present but disabled for Shop Manager;
    // attempt to select it via fireEvent.change still updates the <select>
    // value in jsdom, so the permission check inside createCampaign is what
    // must actually block it.
    const select = screen.getAllByRole('combobox')[0];
    fireEvent.change(select, { target: { value: 'liquidation' } });
    fireEvent.click(screen.getByText(/CREATE CAMPAIGN \(DISABLED/));
    expect(screen.getByText(/Shop Manager may only create Standard Sale campaigns/)).toBeInTheDocument();
    expect(screen.queryByText('Bad Liquidation')).not.toBeInTheDocument();
  });

  it('requires a campaign name', () => {
    render(<PricingAdminClient />);
    fireEvent.click(screen.getByText(/CREATE CAMPAIGN \(DISABLED/));
    expect(screen.getByText(/Campaign name is required/)).toBeInTheDocument();
  });
});

describe('PricingAdminClient — activation requires confirmation', () => {
  it('a newly created campaign starts disabled and requires a two-step confirm to activate', () => {
    render(<PricingAdminClient />);
    createStandardSaleCampaign('Motor Sale');
    const row = screen.getByText('Motor Sale').closest('div')!.parentElement!.parentElement!;
    expect(within(row).getByText('disabled')).toBeInTheDocument();

    fireEvent.click(within(row).getByText('ACTIVATE'));
    fireEvent.click(within(row).getByText('CONFIRM ACTIVATION'));
    expect(within(row).getByText('ACTIVE')).toBeInTheDocument();
  });

  it('Viewer cannot activate a campaign', () => {
    render(<PricingAdminClient />);
    createStandardSaleCampaign('Viewer Blocked Sale');
    fireEvent.click(screen.getByText('Viewer'));
    const activateBtn = screen.getByText('ACTIVATE');
    expect(activateBtn).toBeDisabled();
  });
});

describe('PricingAdminClient — campaign preview', () => {
  it('shows the required preview stats after clicking PREVIEW', () => {
    render(<PricingAdminClient />);
    createStandardSaleCampaign('Preview Sale');
    fireEvent.click(screen.getByText('PREVIEW'));
    expect(screen.getByText('Selected products')).toBeInTheDocument();
    expect(screen.getByText('Full discount')).toBeInTheDocument();
    expect(screen.getByText('Margin-capped')).toBeInTheDocument();
    expect(screen.getByText('Excluded')).toBeInTheDocument();
    expect(screen.getByText('Regular retail value')).toBeInTheDocument();
    expect(screen.getByText('Expected sale revenue')).toBeInTheDocument();
    expect(screen.getByText('Total landed cost')).toBeInTheDocument();
    expect(screen.getByText('Expected gross profit')).toBeInTheDocument();
    expect(screen.getByText('Effective gross margin')).toBeInTheDocument();
    expect(screen.getByText('Expected discount value')).toBeInTheDocument();
    expect(screen.getByText('Cash recovered (aged 90+d)')).toBeInTheDocument();
  });
});

describe('PricingAdminClient — audit log', () => {
  it('records a campaign_created audit event', () => {
    render(<PricingAdminClient />);
    createStandardSaleCampaign('Audited Sale');
    expect(screen.getByText(/AUDIT LOG \(1\)/)).toBeInTheDocument();
    expect(screen.getByText('campaign_created')).toBeInTheDocument();
  });

  it('records a campaign_activated audit event on confirmed activation', () => {
    render(<PricingAdminClient />);
    createStandardSaleCampaign('Audited Activation');
    fireEvent.click(screen.getByText('ACTIVATE'));
    fireEvent.click(screen.getByText('CONFIRM ACTIVATION'));
    expect(screen.getByText(/AUDIT LOG \(2\)/)).toBeInTheDocument();
    expect(screen.getByText('campaign_activated')).toBeInTheDocument();
  });
});
