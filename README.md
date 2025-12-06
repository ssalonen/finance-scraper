# Finance Scraper

Finance instrument scraper using Morningstar and Seligson data

## Development

### Initial setup

The project uses `.nvmrc` to specify the NodeJS version used. For convenience, dev dependency `n` is used to manage node versions:

```
sudo npm exec n install 22 # install NodeJS runtime v22
```

Tested with NodeJS runtime v22.


### Running tests

```bash
make test
```


### Terraform operations

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

#### Packaging

`make package` will package the project. Resulting zip will be in `build`

## Overview

### Terraform State Management

We use terraform [remote state management](https://www.terraform.io/docs/state/remote.html) using AWS S3 and DynamoDB.

For provisioning necessary buckets and tables for the remote storage, see `remote_state_storage.tf` (one-time initialization).

## Maintenance activities

### Updating terraform plugins

```bash
rm -rf .terraform/{plugins,providers}
AWS_PROFILE=terraform terraform init -upgrade
```

Source: <https://github.com/hashicorp/terraform/issues/19221#issuecomment-437964397> and <https://developer.hashicorp.com/terraform/tutorials/configuration-language/provider-versioning>

### Updating nodejs runtime

Update version number in terraform definitions

```bash
# find places to edit
rg runtime -g '*.tf' -g 'README.md' 
```

Update also `.nvmrc` file with a node version, many IDEs and tools pick this up.
Similarly for `.gitlab-ci.yml`.

Note that terraform might not recognize the NodeJS runtime without updating the aws terraform provider (see above).

### Updating node dependencies

`npm-check-updates` or `ncu` for short, updates all dependencies to latest major version.

`ncu` is installed with

```
npm install npm-check-updates
```

To upgrade all dependencies:

```
./node_modules/.bin/ncu -u  # updates package.json
npm install  # install new versions
```

### Adding new instrument for scraping

Scraped instruments are configured in `scraper_lambda.tf` using their ISIN.

- add entry to `ISIN_TO_PARSER_AND_URL_AND_NAME` in `parsers.js`
- add parsing with the suitable interval in `scraper_lambda.tf`

## Runbook

### Reprocessing historical data

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
