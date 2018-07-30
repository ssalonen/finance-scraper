
.PHONY: clean build zip

package:
	yarn install
	npm run package

invoke_local:
	cat example.json | serverless invoke local -f scraper

invoke:
	cat example.json | serverless invoke -f scraper

plan:
	terraform plan

deploy:
	terraform apply

clean:
	rm -rf build
