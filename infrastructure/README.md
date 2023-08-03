# Infrastructure Deployment

1. Update parameter files
1. Temp: Update JWT secret
1. Do deployment: `az deployment group create -g rg-lds-api-{env} -f infrastructure/bicep/lightning-api.bicep -p infrastructure/bicep/parameters/{env}.json`

# BTC Node Setup

_TBD:_ docker install, compose file
