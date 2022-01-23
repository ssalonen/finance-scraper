# Finance Scraper

Finance instrument scraper using Morningstar and Seligson data

[![Build Status](https://www.travis-ci.org/ssalonen/finance-scraper.svg?branch=public)](https://www.travis-ci.org/ssalonen/finance-scraper)

## Prerequisites

Tested with nodejs 12 and npm 6.10. Installation on Fedora 30 using Fedora modules:

```bash
# dnf module enable nodejs:12
# dnf module install nodejs:12/development
```

`aws` sdk can be installed with `dnf install aws`

## Setup

Terraform is used to provision resources in the cloud

Package the code

```bash
make package
```

Plan deployment (see what would happen)

```bash
make plan
```

Execute deployment

```bash
make deploy
```

## Terraform State Management

We use terraform [remote state management](https://www.terraform.io/docs/state/remote.html) using AWS S3 and DynamoDB.

For proviosining necessary buckets and tables for the remote storage, see `remote_state_storage.tf` (one-time initialization).

## Configuration

Scraped instruments are configured in `scraper_lambda.tf` using their ISIN.

## Packaging

`make package` will package the project. Resulting zip will be in `build`

## Updating terraform plugins

```bash
rm -rf .terraform/plugins
terraform init
```

Source: <https://github.com/hashicorp/terraform/issues/19221#issuecomment-437964397>

## Updating nodejs runtime

Update version number in terraform definitions

```bash
# find places to edit
rg runtime -g '*.tf'  
```

Update also `.nvmrc` file with a node version, many IDEs and tools pick this up.

## Adding new instrument for scraping

- add entry to `ISIN_TO_PARSER_AND_URL_AND_NAME` in `parsers.js`
- add parsing with the suitable interval in `scraper_lambda.tf`

## Reprocessing historical data

In case of live parsing errors, one can run the reprocessing using the stored html data.

```bash
make reprocess
```

See `scripts/rerunner.js` for more information.

Notes:

- Always dry-run the script first
- It might be beneficial to increase number of retries in DynamoDB, to be more robust against throttling. Add `maxRetries: 50` into `dynamodb-service.js`
- You can temporarily adjust provisioned write capacity of the table. Remember to change it back also!

## License

Licensed under MIT. See `LICENSE` text file.
