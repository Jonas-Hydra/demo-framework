# Cypress Test Recorder Chrome Extension

A Chrome extension that records user interactions and generates Cypress test code with intelligent selectors, page type detection, and accessibility checks.

## Features

- **Intelligent Selector Generation**: Prioritizes semantic selectors (data-testid, aria-label, role) over fragile CSS paths
- **Page Type Detection**: Automatically identifies login forms, registration forms, search pages, tables, lists, and detail pages
- **Automatic Assertions**: Generates appropriate assertions based on detected page type
- **Accessibility Integration**: Includes `cy.checkA11y()` calls for accessibility testing
- **Visual Feedback**: Highlights elements as you interact with the page
- **Session Management**: Save and load multiple recording sessions

## Installation

### Development Setup

1. Install dependencies:
   ```bash
   cd chrome-extension
   npm install
   ```

2. Build the extension:
   ```bash
   npm run build
   ```

3. Generate proper icons (optional):
   - Open `scripts/generate-icons.html` in a browser
   - Click "Generate & Download All Icons"
   - Move downloaded files to `assets/icons/`

4. Load in Chrome:
   - Go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `chrome-extension/dist` folder

### Development Mode

Run webpack in watch mode for automatic rebuilds:
```bash
npm run watch
```

## Usage

1. Click the extension icon in Chrome toolbar
2. Click "Start Recording" to begin capturing interactions
3. Interact with the web page (clicks, typing, form submissions)
4. Click "Stop" when done
5. View generated code in the "Code" tab
6. Copy or download the generated Cypress test

## Selector Priority

The extension generates selectors in this priority order:

1. `data-testid`, `data-cy`, `data-test` attributes
2. `aria-label` attributes
3. `role` with accessible name
4. Unique IDs (excluding dynamic/generated IDs)
5. Text content for buttons/links
6. Stable CSS classes (filtered to exclude framework-generated classes)
7. CSS path fallback

### Excluded Class Patterns

Framework-generated classes are automatically filtered:
- Angular: `ng-*`
- Styled-components: `sc-*`
- Emotion/CSS-in-JS: `css-*`
- React: `:r*:`
- Material-UI: `Mui*`
- And more...

## Page Type Detection

The extension analyzes the DOM to classify pages:

| Page Type | Detection Criteria |
|-----------|-------------------|
| Login Form | Password field + email/username, ≤4 fields |
| Registration Form | Password + confirm password, >4 fields |
| Contact Form | Email + textarea, no password |
| Search | Search input + results container |
| Table | Data table with headers and rows |
| List | Grid/card containers with repeating elements |
| Detail | Single H1 + main content area |

## Generated Code Format

```javascript
describe('Recorded Test', () => {
  beforeEach(() => {
    cy.injectAxe();
  });

  it('recorded test scenario', () => {
    cy.visit('/');

    // Recorded actions
    cy.get('[data-testid="search-input"]').type('query{enter}');
    cy.get('[role="button"]').click();

    // Page-type assertions
    cy.get('[class*="result"]').should('be.visible');

    // Accessibility audit
    cy.checkA11y(null, { includedImpacts: ['critical', 'serious'] });
  });
});
```

## Project Structure

```
chrome-extension/
├── manifest.json           # Chrome extension manifest (MV3)
├── package.json            # Dependencies and scripts
├── webpack.config.js       # Build configuration
├── tsconfig.json           # TypeScript configuration
├── src/
│   ├── background/         # Service worker
│   │   ├── service-worker.ts
│   │   └── storage-manager.ts
│   ├── content/            # Content scripts
│   │   ├── content-script.ts
│   │   ├── event-recorder.ts
│   │   ├── selector-generator.ts
│   │   ├── page-analyzer.ts
│   │   └── highlighter.ts
│   ├── popup/              # Extension popup UI
│   │   ├── popup.html
│   │   ├── popup.css
│   │   └── popup.ts
│   ├── generators/         # Code generation
│   │   ├── cypress-generator.ts
│   │   ├── assertion-generator.ts
│   │   └── templates/
│   └── types/              # TypeScript types
│       └── index.ts
├── assets/icons/           # Extension icons
└── scripts/                # Build helpers
```

## Integration with Demo Framework

Generated tests are compatible with the demo-framework's Cypress setup:

1. Save generated test to `cypress/e2e/` directory
2. Run with: `npm run cy:run`

The extension automatically includes:
- `cy.injectAxe()` in beforeEach (matches existing pattern)
- `cy.checkA11y()` with critical/serious impacts
- Screenshot capture for debugging

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes and test locally
4. Submit a pull request

## License

MIT
