
.PHONY: clean build zip

package:
	yarn install
	npm run package

invoke_local:
	cat example.json | serverless invoke local -f scraper

invoke:
	rm out.txt | true
	aws lambda invoke --region eu-west-1 --function-name scraper_lambda --payload file://./example.json --profile terraform out.txt
	cat out.txt

plan:
	terraform plan

deploy:
	terraform apply

clean:
	rm -rf build
