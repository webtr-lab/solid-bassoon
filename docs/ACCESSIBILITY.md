# Accessibility (A11y) Guidelines

This document outlines the accessibility standards and practices for the Maps Tracker application, ensuring WCAG 2.1 compliance and inclusive design.

## Table of Contents

1. [Standards & Compliance](#standards--compliance)
2. [Testing Tools](#testing-tools)
3. [Best Practices](#best-practices)
4. [Implementation Guide](#implementation-guide)
5. [Common Issues & Fixes](#common-issues--fixes)
6. [Accessibility Checklist](#accessibility-checklist)

## Standards & Compliance

### WCAG 2.1 Levels

The application aims to meet **WCAG 2.1 Level AA** compliance:

- **A**: Minimal accessibility
- **AA**: Recommended level (our target)
- **AAA**: Enhanced accessibility (optional enhancements)

### Key Principles

1. **Perceivable**: Information visible to all users
2. **Operable**: Navigation accessible via keyboard and assistive devices
3. **Understandable**: Clear and predictable interface
4. **Robust**: Compatible with assistive technologies

## Testing Tools

### 1. Jest + jest-axe (Unit Tests)

Run accessibility tests on individual components:

```bash
cd frontend
npm test -- accessibility.test.jsx
```

**Coverage:**
- Component-level accessibility
- Form labels and descriptions
- Color contrast
- ARIA attributes
- Semantic HTML

### 2. Cypress + cypress-axe (E2E Tests)

Run accessibility tests on live pages:

```bash
cd frontend
npm run e2e -- cypress/e2e/accessibility.cy.js
```

**Coverage:**
- Full page accessibility
- Keyboard navigation
- Focus management
- Modal dialogs
- Dynamic content

### 3. Axe DevTools Browser Extension

Manual testing in development:

1. Install [axe DevTools](https://www.deque.com/axe/devtools/) for Chrome/Firefox
2. Open DevTools and click "axe DevTools"
3. Scan current page for violations
4. Review violations and recommendations

### 4. WAVE (Web Accessibility Evaluation Tool)

Browser extension for quick accessibility audits:

1. Install [WAVE](https://wave.webaim.org/extension/)
2. Click WAVE icon to scan page
3. Review alerts and warnings

### 5. Lighthouse (Built into Chrome DevTools)

Automated accessibility scoring:

1. Open Chrome DevTools (F12)
2. Go to "Lighthouse" tab
3. Check "Accessibility" checkbox
4. Run audit

## Best Practices

### 1. Semantic HTML

Use semantic elements instead of generic divs:

```jsx
// ❌ Bad
<div onClick={() => handleClick()}>Click me</div>

// ✅ Good
<button onClick={() => handleClick()}>Click me</button>

// ✅ Good
<nav>Navigation</nav>
<main>Main content</main>
<article>Article</article>
<aside>Sidebar</aside>
<footer>Footer</footer>
```

### 2. Heading Structure

Maintain logical heading hierarchy:

```jsx
// ❌ Bad
<h1>Page Title</h1>
<h3>Section</h3>  {/* Skipped h2 */}

// ✅ Good
<h1>Page Title</h1>
<h2>Section</h2>
<h3>Subsection</h3>
```

### 3. Images & Alt Text

Provide descriptive alternative text:

```jsx
// ❌ Bad
<img src="vehicle.png" />

// ✅ Good
<img src="vehicle.png" alt="Toyota Camry with ID TC-2024-001" />

// ✅ Good (decorative)
<img src="divider.svg" alt="" aria-hidden="true" />
```

### 4. Form Labels

Always associate labels with form controls:

```jsx
// ❌ Bad
<input type="email" placeholder="Email" />

// ✅ Good
<label htmlFor="email">Email:</label>
<input id="email" type="email" />

// ✅ Good (with aria-label)
<input type="search" aria-label="Search vehicles" />
```

### 5. Color Contrast

Ensure sufficient contrast between text and background:

- **Normal text**: Minimum 4.5:1 ratio (AA)
- **Large text**: Minimum 3:1 ratio (AA)
- **Enhanced**: 7:1 ratio (AAA)

Test contrast at [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)

```jsx
// ❌ Bad (insufficient contrast)
<p style={{ color: '#888', backgroundColor: '#fff' }}>Text</p>

// ✅ Good
<p className="text-gray-900 bg-white">Text</p>
```

### 6. Keyboard Navigation

Ensure full keyboard accessibility:

```jsx
// ✅ Good: All interactive elements are keyboard accessible
<button onClick={handleClick}>Click me</button>
<a href="/page">Link</a>
<input type="text" />

// ❌ Bad: Non-interactive element with click handler
<div onClick={handleClick}>Click me</div>

// ✅ Fix with role and keyboard handler
<div
  role="button"
  tabIndex={0}
  onClick={handleClick}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleClick();
    }
  }}
>
  Click me
</div>
```

### 7. ARIA Labels & Descriptions

Use ARIA attributes to enhance semantics:

```jsx
// ❌ Bad: Unclear purpose
<button>►</button>

// ✅ Good: Descriptive label
<button aria-label="Play video">►</button>

// ✅ Good: Description for complex field
<input
  type="password"
  aria-describedby="password-hint"
/>
<span id="password-hint">
  Must be at least 8 characters with a number and symbol
</span>

// ✅ Good: Live region for dynamic updates
<div aria-live="polite" aria-atomic="true">
  {statusMessage}
</div>
```

### 8. Focus Management

Maintain visible focus indicators:

```jsx
// ✅ Good: TailwindCSS provides focus styles
<button className="focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
  Click me
</button>

// ✅ Good: Custom focus style
<style>
  button:focus {
    outline: 3px solid blue;
    outline-offset: 2px;
  }
</style>

// ✅ Good: Programmatic focus
const inputRef = useRef();
useEffect(() => {
  inputRef.current?.focus();
}, []);
```

### 9. Modal Dialogs

Implement accessible modals:

```jsx
// ✅ Good: Accessible modal implementation
<div
  role="dialog"
  aria-labelledby="dialog-title"
  aria-modal="true"
  onKeyDown={(e) => {
    if (e.key === 'Escape') {
      handleClose();
    }
  }}
>
  <h2 id="dialog-title">Delete Vehicle</h2>
  <p>Are you sure you want to delete this vehicle?</p>
  <button onClick={handleClose}>Cancel</button>
  <button onClick={handleDelete}>Delete</button>
</div>
```

### 10. Skip Navigation

Provide skip links for keyboard users:

```jsx
// ✅ Good: Hidden skip link, visible on focus
<a href="#main-content" className="sr-only">
  Skip to main content
</a>

// CSS
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

.sr-only:focus {
  position: static;
  width: auto;
  height: auto;
  overflow: visible;
  clip: auto;
  white-space: normal;
}
```

## Implementation Guide

### Adding Accessibility to Existing Components

#### Step 1: Use Semantic HTML

```jsx
// Before
const VehicleCard = ({ vehicle, onClick }) => (
  <div className="border p-4" onClick={onClick}>
    <div className="text-lg font-bold">{vehicle.name}</div>
    <div>{vehicle.status}</div>
  </div>
);

// After
const VehicleCard = ({ vehicle, onClick }) => (
  <article className="border p-4">
    <button
      onClick={onClick}
      className="w-full text-left focus:ring-2"
      aria-label={`Select ${vehicle.name} - Status: ${vehicle.status}`}
    >
      <h3 className="text-lg font-bold">{vehicle.name}</h3>
      <p>Status: {vehicle.status}</p>
    </button>
  </article>
);
```

#### Step 2: Add ARIA Labels

```jsx
const SearchInput = ({ onSearch }) => (
  <div className="flex gap-2">
    <label htmlFor="search-vehicles" className="sr-only">
      Search vehicles
    </label>
    <input
      id="search-vehicles"
      type="search"
      placeholder="Search vehicles"
      onChange={(e) => onSearch(e.target.value)}
      aria-describedby="search-hint"
    />
    <span id="search-hint" className="sr-only">
      Enter vehicle name or ID to filter results
    </span>
  </div>
);
```

#### Step 3: Ensure Keyboard Navigation

```jsx
const Dropdown = ({ items, onSelect }) => {
  const [open, setOpen] = useState(false);

  const handleKeyDown = (e) => {
    switch (e.key) {
      case 'Enter':
      case ' ':
        setOpen(!open);
        break;
      case 'Escape':
        setOpen(false);
        break;
      case 'ArrowDown':
        e.preventDefault();
        // Focus next item
        break;
      case 'ArrowUp':
        e.preventDefault();
        // Focus previous item
        break;
    }
  };

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        Select option
      </button>
      {open && (
        <ul role="listbox">
          {items.map((item) => (
            <li key={item.id} role="option">
              {item.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
```

### Updating .eslintrc for Accessibility

```json
{
  "extends": [
    "eslint:recommended",
    "plugin:react/recommended",
    "plugin:jsx-a11y/recommended"
  ],
  "plugins": [
    "react",
    "react-hooks",
    "jsx-a11y"
  ],
  "rules": {
    "jsx-a11y/anchor-is-valid": "warn",
    "jsx-a11y/click-events-have-key-events": "warn",
    "jsx-a11y/no-static-element-interactions": "warn"
  }
}
```

## Common Issues & Fixes

### Issue 1: Missing Form Labels

**Problem:** Input without associated label
```jsx
<input type="email" placeholder="Email" />
```

**Fix:** Associate label with input
```jsx
<label htmlFor="email">Email:</label>
<input id="email" type="email" />
```

### Issue 2: Insufficient Color Contrast

**Problem:** Low contrast text
```jsx
<p style={{ color: '#999', backgroundColor: '#ccc' }}>Low contrast</p>
```

**Fix:** Increase contrast ratio
```jsx
<p className="text-gray-900 bg-white">Good contrast</p>
```

### Issue 3: Non-Semantic Button

**Problem:** Div used as button
```jsx
<div onClick={handleClick}>Click me</div>
```

**Fix:** Use button element
```jsx
<button onClick={handleClick}>Click me</button>
```

### Issue 4: Missing Alt Text

**Problem:** Image without alt text
```jsx
<img src="vehicle.png" />
```

**Fix:** Add descriptive alt text
```jsx
<img src="vehicle.png" alt="Vehicle location on map" />
```

### Issue 5: Keyboard Inaccessible

**Problem:** No keyboard navigation
```jsx
<div role="button" onClick={handleClick}>
  Click me
</div>
```

**Fix:** Add keyboard handler
```jsx
<div
  role="button"
  tabIndex={0}
  onClick={handleClick}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleClick();
    }
  }}
>
  Click me
</div>
```

## Accessibility Checklist

Use this checklist when developing features:

### Design
- [ ] Color palette has sufficient contrast (4.5:1 for normal text)
- [ ] Not relying on color alone to convey information
- [ ] Consistent navigation and layout
- [ ] Clear visual focus indicators

### Development
- [ ] Using semantic HTML elements
- [ ] Form inputs have associated labels
- [ ] Images have alt text
- [ ] All interactive elements are keyboard accessible
- [ ] Logical heading hierarchy (h1 → h2 → h3)
- [ ] No keyboard traps
- [ ] Focus visible on all interactive elements

### ARIA
- [ ] ARIA labels for icon buttons
- [ ] ARIA descriptions for complex fields
- [ ] Live regions for dynamic content
- [ ] Proper roles (button, navigation, etc.)
- [ ] Modal dialogs properly marked

### Testing
- [ ] Runs through keyboard navigation
- [ ] Tests with screen reader (NVDA, JAWS, VoiceOver)
- [ ] Tested with axe/Jest
- [ ] Tested with Cypress E2E tests
- [ ] Lighthouse audit passes
- [ ] No warnings in browser console

### Documentation
- [ ] Code comments for complex accessibility patterns
- [ ] Documentation for team on accessibility standards
- [ ] Known limitations documented

## Resources

- [WebAIM](https://webaim.org/) - Web accessibility information
- [WCAG 2.1](https://www.w3.org/WAI/WCAG21/quickref/) - Official guidelines
- [A11ycasts](https://www.youtube.com/playlist?list=PLNYkxOF6rcICWx0C9Xc-RgEzwLvePng7V) - Google's accessibility series
- [MDN Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)
- [Deque axe DevTools](https://www.deque.com/axe/devtools/)
- [Inclusive Components](https://inclusive-components.design/)

## Contact & Support

For accessibility questions or issues:
1. Check this documentation first
2. Review WCAG 2.1 guidelines
3. Open an issue with accessibility tag
4. Run axe/jest-axe tests to identify issues
