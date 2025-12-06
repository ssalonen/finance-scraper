### Repository Summary: Finance Scraper

This repository implements a **finance instrument scraper** that collects data from financial websites like Morningstar and Seligson. It's built with Node.js and deployed on AWS using Infrastructure as Code (IaC) with Terraform. Below is a breakdown of the key aspects you requested.

#### Folder Structure and Subprojects
The repo follows a modular structure, separating concerns into directories:

- **`/frontend/src/`**: Contains a simple frontend component (`App.js`), likely a basic React or vanilla JS interface for interacting with the scraper API. This seems to be a lightweight UI subproject for displaying scraped data or triggering scrapes.
  
- **`/lib/`**: The core backend logic, including:
  - `scraper_index.js`: Main scraper entry point (handles scheduling and execution).
  - `parsers.js`: Parsing logic for different financial instruments (e.g., ETFs, funds) based on ISIN codes.
  - `api_index.js`: API handler for exposing scraped data via endpoints.
  - `dynamodb-service.js` and `s3-service.js`: Services for AWS DynamoDB (data storage) and S3 (HTML caching/reprocessing).
  - `constants.js`: Configuration constants.
  - `api.js`: Empty file, possibly a placeholder for API routes.

- **`/test/`**: Test files including HTML samples (e.g., `morningstar_etf.html`, `morningstar_fund.html`) for parsing tests, CSV files, and JS test scripts.

- **`/scripts/`**: Utility scripts, such as `rerunner.js` for reprocessing historical data in case of parsing errors.

- **`/build/`**: Output directory for packaged artifacts (e.g., ZIP files for AWS Lambda deployment).

- **`/__tests__/`**: Additional test directory (currently empty).

- **Root-level files**: Configuration files like `package.json`, `Makefile`, Terraform files (`.tf`), and docs (`README.md`).

This structure separates scraping logic, API serving, data storage, and frontend, making it maintainable for a serverless architecture.

#### Architecture Design
The project uses a **serverless architecture** centered around AWS Lambda for cost-efficiency and scalability:

- **Scraping Layer**: Runs on AWS Lambda (`scraper_lambda.tf`), triggered periodically to scrape data from Morningstar/Seligson. It parses HTML using Cheerio, stores raw data in DynamoDB, and caches HTML in S3 for reprocessing if needed. Instruments are configured by ISIN in `scraper_lambda.tf` and mapped in `parsers.js`.

- **API Layer**: Another Lambda (`api_gateway.tf`) exposes REST endpoints for querying scraped data. Integrated with API Gateway for HTTP access.

- **Data Storage**: 
  - **DynamoDB**: Stores scraped instrument data (e.g., prices, metrics).
  - **S3**: Stores HTML snapshots for debugging/reprocessing.

- **Frontend**: A basic web app (likely served statically) that interacts with the API for user queries.

- **Scheduling**: Scrapes are triggered on a schedule (configured in Terraform), with intervals per instrument (e.g., daily for some, weekly for others).

Key technologies:
- **Node.js (v22)**: Runtime, with ES modules.
- **Cheerio**: For HTML parsing.
- **AWS SDK**: For DynamoDB and S3 interactions.
- **Moment-Timezone**: For date handling.

The design emphasizes reliability with retries, error handling, and reprocessing capabilities.

#### Key Infrastructure/DevOps Elements
- **Terraform**: Manages all AWS resources (Lambdas, API Gateway, DynamoDB tables, S3 buckets). Uses remote state in S3/DynamoDB for team collaboration.
  - Files: `main.tf`, `scraper_lambda.tf`, `api_gateway.tf`, etc.
  - Commands: `make package` (zips code), `make plan/deploy` (Terraform operations).

- **Build/Packaging**: Makefile automates testing, packaging, and deployment. Packages production dependencies into a ZIP for Lambda.

- **Testing**: Mocha/Chai for unit tests, ESLint for linting. Includes integration tests with mocked HTML.

- **CI/CD**: Uses GitLab CI for continuous integration. See [pipelines](https://gitlab.com/ssalonen-private/finance-scraper/-/pipelines).

- **Dependencies Management**: NPM with lockfile. Dev tools like `npm-check-updates` for upgrades.

- **Versioning**: Node version pinned in `.nvmrc` (v22). Terraform provider versions in `versions.tf`.

- **Maintenance**: Runbook in README for reprocessing data, updating runtimes, and adding new instruments.

This setup is production-ready for serverless scraping, with strong emphasis on IaC for reproducibility and minimal ops overhead. If you need details on specific files or expansions (e.g., code snippets), let me know!
