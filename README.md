# Demo QA Framework

A comprehensive QA automation framework demonstrating end-to-end testing and accessibility validation using Cypress and Axe, aligned with modern testing best practices.

## Features

- ✅ **End-to-End Testing** with Cypress
- ✅ **Accessibility Testing** with Axe-core (WCAG compliance)
- ✅ **HTML Test Reports** with Mochawesome
- ✅ **CI/CD Integration** with GitHub Actions
- ✅ **Automated Government Website Testing**

## Tech Stack

- **Cypress**: E2E testing framework
- **@axe-core/cypress**: Accessibility testing integration
- **mochawesome**: HTML report generation
- **GitHub Actions**: Continuous Integration

## Prerequisites

- Node.js 18+ 
- npm or yarn

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd demo-framework
```

2. Install dependencies:
```bash
npm install
```

## Usage

### Run Tests in Headless Mode
```bash
npm run cy:run
```

### Open Cypress Test Runner (Interactive)
```bash
npm run cy:open
```

### Run Accessibility Tests Only
```bash
npm run test:accessibility
```

### Generate HTML Report
```bash
npm run test:report
```

The HTML report will be generated in the `reports/` directory.

## Test Structure

The framework includes tests for:

1. **Homepage Accessibility Check**: Validates the USA.gov homepage for accessibility violations
2. **Search Functionality Test**: Performs a search and validates the results page
3. **WCAG Compliance Check**: Comprehensive accessibility audit following WCAG 2.1 AA standards

### Test Configuration

Tests are configured to check for:
- Color contrast issues
- Keyboard navigation
- ARIA attributes
- Landmark regions
- Heading structure
- And more WCAG 2.1 AA compliance rules

## Reports

Test reports are generated in the `reports/` directory with:
- Detailed test results
- Accessibility violation details
- Screenshots of test execution
- Timestamped reports

## CI/CD

The framework includes GitHub Actions workflow that:
- Runs tests on push to main/master and pull requests
- Generates and uploads test reports as artifacts
- Captures screenshots and videos on failures
- Runs on Ubuntu latest with Node.js 18

## Project Structure

```
demo-framework/
├── cypress/
│   ├── e2e/
│   │   └── accessibility-test.cy.js    # Main test file
│   ├── fixtures/                         # Test fixtures
│   └── support/
│       ├── commands.js                   # Custom commands
│       └── e2e.js                        # Support file with Axe setup
├── reports/                              # Generated HTML reports
├── .github/
│   └── workflows/
│       └── ci.yml                        # GitHub Actions workflow
├── package.json
├── cypress.config.js                     # Cypress configuration
└── README.md
```

## Accessibility Testing

The framework uses Axe-core to check for:
- **Critical** and **Serious** violations by default
- WCAG 2.1 Level A and AA compliance
- Best practice recommendations

Violations are logged and included in test reports for easy debugging.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `npm run test:accessibility`
5. Submit a pull request

## License

MIT

## Notes

- Tests are configured to run against `https://www.usa.gov`
- Screenshots are automatically captured during test execution
- Reports are generated in JSON and HTML formats
- CI/CD pipeline runs tests in headless Chrome browser

