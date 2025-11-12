import '@testing-library/jest-dom';

// Ensure we have a DOM element for React to render into
if (!document.getElementById('root')) {
  const root = document.createElement('div');
  root.id = 'root';
  document.body.appendChild(root);
}

// Mock fetch globally
global.fetch = jest.fn();

// Mock URL.createObjectURL for CSV export tests
const originalCreateObjectURL = global.URL.createObjectURL;
global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');

// Mock document methods for CSV export
const originalAppendChild = document.body.appendChild;
const originalRemoveChild = document.body.removeChild;
document.body.appendChild = jest.fn(originalAppendChild);
document.body.removeChild = jest.fn(originalRemoveChild);

// Reset mocks before each test
beforeEach(() => {
  fetch.mockClear();
  global.alert.mockClear();
  global.confirm.mockClear();
  global.URL.createObjectURL.mockClear();
  document.body.appendChild.mockClear();
  document.body.removeChild.mockClear();
});

// Mock window.alert
global.alert = jest.fn();

// Mock window.confirm
global.confirm = jest.fn(() => true);
