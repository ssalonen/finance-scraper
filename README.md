# Finance Scraper

Finance instrument scraper using Morningstar and Seligson data

[![Build Status](https://www.travis-ci.org/ssalonen/finance-scraper.svg?branch=public)](https://www.travis-ci.org/ssalonen/finance-scraper)

## Prerequisites

Tested with nodejs 12 and npm 6.10. Installation on Fedora 30 using Fedora modules:

```
# dnf module enable nodejs:12
# dnf module install nodejs:12/development
```

`aws` sdk can be installed with `dnf install aws`

## Setup

Terraform is used to provision resources in the cloud

Plan deployment (see what would happen)
```
make plan
```


Execute deployment
```
make deploy
```

## Terraform State Management

We use terraform [remote state management](https://www.terraform.io/docs/state/remote.html) using AWS S3 and DynamoDB.

For proviosining necessary buckets and tables for the remote storage, see `remote_state_storage.tf` (one-time initialization).

## Configuration

Scraped instruments are configured in `scraper_lambda.tf` using their ISIN.

## Packaging

Serverless is used for packaging the function as zip. `make package`. Resulting zip will be in `.serverless`

## Updating terraform plugins

```
rm -rf .terraform/plugins
terraform init
```

Source: https://github.com/hashicorp/terraform/issues/19221#issuecomment-437964397



## License

Licensed under MIT. See `LICENSE` text file.
