
# Setup

Terraform is used to provision resources in the cloud

Plan deployment (see what would happen)
```
make plan
```


Execute deployment
```
make deploy
```

# Packaging

Serverless is used for packaging the function as zip. `make package`. Resulting zip will be in `.serverless`

