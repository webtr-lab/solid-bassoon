import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import AddressSearchBar from '../AddressSearchBar';

describe('AddressSearchBar Component', () => {
  const mockSearchResults = [
    {
      name: 'Main Street, Georgetown, Guyana',
      latitude: 6.8018,
      longitude: -58.1564,
    },
    {
      name: 'Main Street, Linden, Guyana',
      latitude: 5.3637,
      longitude: -58.3058,
    },
  ];

  const defaultProps = {
    searchQuery: '',
    searchResults: [],
    searching: false,
    showResults: false,
    searchMarker: null,
    currentUserRole: 'viewer',
    onSearchInput: jest.fn(),
    onClearSearch: jest.fn(),
    onSelectResult: jest.fn(),
    onSaveSearchToPOI: jest.fn(),
  };

  test('renders search input field', () => {
    render(<AddressSearchBar {...defaultProps} />);

    const input = screen.getByPlaceholderText('Search address...');
    expect(input).toBeInTheDocument();
  });

  test('displays search query in input', () => {
    render(<AddressSearchBar {...defaultProps} searchQuery="Main Street" />);

    const input = screen.getByPlaceholderText('Search address...');
    expect(input).toHaveValue('Main Street');
  });

  test('calls onSearchInput when typing', () => {
    const onSearchInput = jest.fn();
    render(<AddressSearchBar {...defaultProps} onSearchInput={onSearchInput} />);

    const input = screen.getByPlaceholderText('Search address...');
    fireEvent.change(input, { target: { value: 'test query' } });

    expect(onSearchInput).toHaveBeenCalledWith('test query');
  });

  test('shows clear button when search query exists', () => {
    render(<AddressSearchBar {...defaultProps} searchQuery="something" />);

    const clearButton = screen.getByTitle('Clear search');
    expect(clearButton).toBeInTheDocument();
  });

  test('hides clear button when search query is empty', () => {
    render(<AddressSearchBar {...defaultProps} searchQuery="" />);

    expect(screen.queryByTitle('Clear search')).not.toBeInTheDocument();
  });

  test('calls onClearSearch when clear button clicked', () => {
    const onClearSearch = jest.fn();
    render(<AddressSearchBar {...defaultProps} searchQuery="test" onClearSearch={onClearSearch} />);

    const clearButton = screen.getByTitle('Clear search');
    fireEvent.click(clearButton);

    expect(onClearSearch).toHaveBeenCalled();
  });

  test('shows loading spinner when searching', () => {
    render(<AddressSearchBar {...defaultProps} searching={true} />);

    expect(screen.getByRole('generic')).toBeInTheDocument();
  });

  test('displays search results when available', () => {
    render(
      <AddressSearchBar
        {...defaultProps}
        searchResults={mockSearchResults}
        showResults={true}
      />
    );

    expect(screen.getByText('Main Street, Georgetown, Guyana')).toBeInTheDocument();
    expect(screen.getByText('Main Street, Linden, Guyana')).toBeInTheDocument();
  });

  test('hides results dropdown when showResults is false', () => {
    render(
      <AddressSearchBar
        {...defaultProps}
        searchResults={mockSearchResults}
        showResults={false}
      />
    );

    expect(screen.queryByText('Main Street, Georgetown, Guyana')).not.toBeInTheDocument();
  });

  test('calls onSelectResult when result clicked', () => {
    const onSelectResult = jest.fn();
    render(
      <AddressSearchBar
        {...defaultProps}
        searchResults={mockSearchResults}
        showResults={true}
        onSelectResult={onSelectResult}
      />
    );

    const resultItem = screen.getByText('Main Street, Georgetown, Guyana').closest('div');
    fireEvent.click(resultItem);

    expect(onSelectResult).toHaveBeenCalledWith(mockSearchResults[0]);
  });

  test('displays coordinates in search results', () => {
    render(
      <AddressSearchBar
        {...defaultProps}
        searchResults={mockSearchResults}
        showResults={true}
      />
    );

    expect(screen.getByText('6.8018, -58.1564')).toBeInTheDocument();
    expect(screen.getByText('5.3637, -58.3058')).toBeInTheDocument();
  });

  test('shows no results message when applicable', () => {
    render(
      <AddressSearchBar
        {...defaultProps}
        searchQuery="invalid place"
        searchResults={[]}
        showResults={true}
        searching={false}
      />
    );

    expect(screen.getByText(/No results found for "invalid place"/)).toBeInTheDocument();
  });

  test('hides no results message when search query too short', () => {
    render(
      <AddressSearchBar
        {...defaultProps}
        searchQuery="ab"
        searchResults={[]}
        showResults={true}
        searching={false}
      />
    );

    expect(screen.queryByText(/No results found/)).not.toBeInTheDocument();
  });

  test('shows save button when search marker exists and user is authorized', () => {
    const searchMarker = { lat: 6.8018, lng: -58.1564, name: 'Test Location' };
    render(
      <AddressSearchBar
        {...defaultProps}
        searchMarker={searchMarker}
        currentUserRole="admin"
      />
    );

    expect(screen.getByTitle('Save to Places of Interest')).toBeInTheDocument();
  });

  test('hides save button when user is viewer', () => {
    const searchMarker = { lat: 6.8018, lng: -58.1564, name: 'Test Location' };
    render(
      <AddressSearchBar
        {...defaultProps}
        searchMarker={searchMarker}
        currentUserRole="viewer"
      />
    );

    expect(screen.queryByTitle('Save to Places of Interest')).not.toBeInTheDocument();
  });

  test('shows save button for manager and operator roles', () => {
    const searchMarker = { lat: 6.8018, lng: -58.1564, name: 'Test Location' };

    const { rerender } = render(
      <AddressSearchBar
        {...defaultProps}
        searchMarker={searchMarker}
        currentUserRole="manager"
      />
    );

    expect(screen.getByTitle('Save to Places of Interest')).toBeInTheDocument();

    rerender(
      <AddressSearchBar
        {...defaultProps}
        searchMarker={searchMarker}
        currentUserRole="operator"
      />
    );

    expect(screen.getByTitle('Save to Places of Interest')).toBeInTheDocument();
  });

  test('calls onSaveSearchToPOI when save button clicked', () => {
    const onSaveSearchToPOI = jest.fn();
    const searchMarker = { lat: 6.8018, lng: -58.1564, name: 'Test Location' };
    render(
      <AddressSearchBar
        {...defaultProps}
        searchMarker={searchMarker}
        currentUserRole="admin"
        onSaveSearchToPOI={onSaveSearchToPOI}
      />
    );

    const saveButton = screen.getByTitle('Save to Places of Interest');
    fireEvent.click(saveButton);

    expect(onSaveSearchToPOI).toHaveBeenCalled();
  });

  test('renders search icon', () => {
    const { container } = render(<AddressSearchBar {...defaultProps} />);

    // Check for SVG (search icon)
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThan(0);
  });

  test('handles result items with keyboard Enter key', () => {
    const onSelectResult = jest.fn();
    render(
      <AddressSearchBar
        {...defaultProps}
        searchResults={mockSearchResults}
        showResults={true}
        onSelectResult={onSelectResult}
      />
    );

    const resultItem = screen.getByText('Main Street, Georgetown, Guyana').closest('div');
    fireEvent.keyPress(resultItem, { key: 'Enter', code: 'Enter', charCode: 13 });

    expect(onSelectResult).toHaveBeenCalledWith(mockSearchResults[0]);
  });

  test('displays result first part (city) in bold', () => {
    render(
      <AddressSearchBar
        {...defaultProps}
        searchResults={mockSearchResults}
        showResults={true}
      />
    );

    // First part before comma should be displayed
    expect(screen.getByText('Main Street')).toBeInTheDocument();
  });

  test('applies correct styling classes', () => {
    const { container } = render(<AddressSearchBar {...defaultProps} />);

    const searchContainer = container.querySelector('.w-80');
    expect(searchContainer).toBeInTheDocument();

    const inputContainer = container.querySelector('.flex-1');
    expect(inputContainer).toBeInTheDocument();
  });

  test('handles null searchMarker prop', () => {
    render(<AddressSearchBar {...defaultProps} searchMarker={null} />);

    expect(screen.queryByTitle('Save to Places of Interest')).not.toBeInTheDocument();
  });

  test('displays full address in results', () => {
    render(
      <AddressSearchBar
        {...defaultProps}
        searchResults={mockSearchResults}
        showResults={true}
      />
    );

    const fullAddress = screen.getByText('Main Street, Georgetown, Guyana');
    expect(fullAddress).toBeInTheDocument();
  });
});
