
.PHONY: package invoke_scraper plan deploy test test-watch clean help
.DEFAULT_GOAL := help

package:
	yarn install
	npm run package

# invoke_local:
#	 export AWS_PROFILE=terraform ; cat scraper_example.json | serverless invoke local -f scraper

invoke_scraper:
	rm out.txt | true
	aws lambda invoke --region eu-west-1 --function-name scraper_lambda --payload file://./scraper_example.json --profile terraform out.txt
	cat out.txt

plan:
	terraform plan

deploy:
	terraform apply

test:
	npm run test

test-watch:
	npm run test-w

clean:
	rm -rf build

help:
	@echo "Suitable make targets:"
	@echo -n " "
	@$(MAKE) -pRrq -f $(lastword $(MAKEFILE_LIST)) : 2>/dev/null | awk -v RS= -F: '/^# File/,/^# Finished Make data base/ {if ($$1 !~ "^[#.]") {print $$1}}' | sort | egrep -v -e '^[^[:alnum:]]' -e '^$@$$' | xargs
	@echo
	@echo "To build, deploy and test using the real instance:"
	@echo " make package; make deploy; make invoke_scraper"
	@echo
	@echo "To run tests:"
	@echo " make test"
	@echo " # or, to re-run the tests when files are modified"
	@echo " make test-watch"
