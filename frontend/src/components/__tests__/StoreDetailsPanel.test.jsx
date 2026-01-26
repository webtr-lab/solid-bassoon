import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import StoreDetailsPanel from '../StoreDetailsPanel';

describe('StoreDetailsPanel', () => {
  const mockStore = {
    id: 1,
    name: 'Test Store',
    address: '123 Main Street',
    category: 'Retail',
    latitude: 5.8520,
    longitude: -55.2038,
    telephone: '123-456-7890',
    contact: 'John Doe',
    description: 'A wonderful store with great products',
    notes: 'Important notes about this store',
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-20T15:30:00Z',
  };

  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns null when store prop is null', () => {
    const { container } = render(
      <StoreDetailsPanel store={null} onClose={mockOnClose} />
    );
    expect(container.firstChild).toBeNull();
  });

  test('renders store name and category', () => {
    render(<StoreDetailsPanel store={mockStore} onClose={mockOnClose} />);

    expect(screen.getByText('Test Store')).toBeInTheDocument();
    expect(screen.getByText('Retail')).toBeInTheDocument();
  });

  test('renders address information', () => {
    render(<StoreDetailsPanel store={mockStore} onClose={mockOnClose} />);

    expect(screen.getByText('123 Main Street')).toBeInTheDocument();
    expect(screen.getByText(/5\.852000, -55\.203800/)).toBeInTheDocument();
  });

  test('renders phone number with tel link', () => {
    render(<StoreDetailsPanel store={mockStore} onClose={mockOnClose} />);

    const phoneLink = screen.getByText('123-456-7890');
    expect(phoneLink).toBeInTheDocument();
    expect(phoneLink).toHaveAttribute('href', 'tel:123-456-7890');
  });

  test('renders contact person', () => {
    render(<StoreDetailsPanel store={mockStore} onClose={mockOnClose} />);

    expect(screen.getByText('Contact Person')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  test('renders description', () => {
    render(<StoreDetailsPanel store={mockStore} onClose={mockOnClose} />);

    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByText('A wonderful store with great products')).toBeInTheDocument();
  });

  test('renders notes', () => {
    render(<StoreDetailsPanel store={mockStore} onClose={mockOnClose} />);

    expect(screen.getByText('Notes')).toBeInTheDocument();
    expect(screen.getByText('Important notes about this store')).toBeInTheDocument();
  });

  test('calls onClose when close button is clicked', () => {
    render(<StoreDetailsPanel store={mockStore} onClose={mockOnClose} />);

    const closeButton = screen.getByTitle('Close');
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test('handles missing optional fields gracefully', () => {
    const minimalStore = {
      id: 2,
      name: 'Minimal Store',
      latitude: 5.8520,
      longitude: -55.2038,
    };

    render(<StoreDetailsPanel store={minimalStore} onClose={mockOnClose} />);

    expect(screen.getByText('Minimal Store')).toBeInTheDocument();
    expect(screen.queryByText('Contact Person')).not.toBeInTheDocument();
    expect(screen.queryByText('Description')).not.toBeInTheDocument();
  });

  test('copy coordinates button exists', () => {
    render(<StoreDetailsPanel store={mockStore} onClose={mockOnClose} />);

    const copyButton = screen.getByTitle('Copy coordinates');
    expect(copyButton).toBeInTheDocument();
  });

  test('displays formatted dates in metadata section', () => {
    render(<StoreDetailsPanel store={mockStore} onClose={mockOnClose} />);

    expect(screen.getByText(/Created:/)).toBeInTheDocument();
    expect(screen.getByText(/Updated:/)).toBeInTheDocument();
  });

  test('handles store with all optional fields populated', () => {
    render(<StoreDetailsPanel store={mockStore} onClose={mockOnClose} />);

    // All sections should be present
    expect(screen.getByText('Address')).toBeInTheDocument();
    expect(screen.getByText('Phone')).toBeInTheDocument();
    expect(screen.getByText('Contact Person')).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByText('Notes')).toBeInTheDocument();
  });

  test('has correct accessibility attributes on close button', () => {
    render(<StoreDetailsPanel store={mockStore} onClose={mockOnClose} />);

    const closeButton = screen.getByTitle('Close');
    expect(closeButton).toHaveAttribute('type', 'button');
  });
});
