// --- PARAMETERS --- //
param location string
param env string

param dbAllowAllIps bool
param dbAdminLogin string
@secure()
param dbAdminPassword string
param dbTier string
param dbCapacity int

@secure()
param jwtSecret string = newGuid()

param allowedIpRange string

param btcVmUser string
@secure()
param btcVmPassword string

param lightningApiCertificate string
param lightningLnbitsAdminUser string
@secure()
param lightningLnbitsAdminKey string
@secure()
param lightningLndAdminMacaroon string

param ethereumChainId string
param arbitrumChainId string
param optimismChainId string
param polygonChainId string
param baseChainId string

@secure()
param alchemyApiKey string
@secure()
param alchemyAuthToken string

@secure()
param umaSigningPrivKey string
param umaSigningPubKey string
param umaEncryptionPubKey string

param evmPaymentAddress string

@secure()
param coingeckoApiKey string

// --- VARIABLES --- //
var compName = 'lds'
var apiName = 'api'

var virtualNetName = 'vnet-${compName}-${apiName}-${env}'
var subNetName = 'snet-${compName}-${apiName}-${env}'
var vmSubNetName = 'snet-${compName}-vm-${env}'
var vmNsgName = 'nsg-${compName}-vm-${env}'

var storageAccountName = replace('st-${compName}-${apiName}-${env}', '-', '')
var dbBackupContainerName = 'db-bak'

var sqlServerName = 'sql-${compName}-${apiName}-${env}'
var sqlDbName = 'sqldb-${compName}-${apiName}-${env}'

var apiServicePlanName = 'plan-${compName}-${apiName}-${env}'
var apiAppName = 'app-${compName}-${apiName}-${env}'
var appInsightsName = 'appi-${compName}-${apiName}-${env}'

var thunderHubPort = '443'
var lnBitsPort = '5000'

var btcNodeProps = [
  {
    name: 'btc-node-${env}'
    pipName: 'ip-${compName}-btc-${env}'
    vmName: 'vm-${compName}-btc-${env}'
    vmDiskName: 'osdisk-${compName}-btc-${env}'
    nicName: 'nic-${compName}-btc-${env}'
  }
]

// --- RESOURCES --- //

// Virtual Network
resource virtualNet 'Microsoft.Network/virtualNetworks@2020-11-01' = {
  name: virtualNetName
  location: location
  properties: {
    addressSpace: {
      addressPrefixes: [
        '10.0.0.0/16'
      ]
    }
    subnets: [
      {
        name: subNetName
        properties: {
          addressPrefix: '10.0.0.0/24'
          serviceEndpoints: [
            {
              service: 'Microsoft.Web'
              locations: [
                '*'
              ]
            }
            {
              service: 'Microsoft.Sql'
              locations: [
                '*'
              ]
            }
          ]
          delegations: [
            {
              name: '0'
              properties: {
                serviceName: 'Microsoft.Web/serverFarms'
              }
            }
          ]
          privateEndpointNetworkPolicies: 'Enabled'
          privateLinkServiceNetworkPolicies: 'Enabled'
        }
      }
      {
        name: vmSubNetName
        properties: {
          addressPrefix: '10.0.1.0/24'
          networkSecurityGroup: {
            id: vmNsg.id
          }
        }
      }
    ]
  }
}

// Storage Account
resource storageAccount 'Microsoft.Storage/storageAccounts@2021-04-01' = {
  name: storageAccountName
  location: location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    allowBlobPublicAccess: false
    allowSharedKeyAccess: true
    supportsHttpsTrafficOnly: true
    accessTier: 'Hot'
  }
}

resource dbBackupContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2021-04-01' = {
  name: '${storageAccount.name}/default/${dbBackupContainerName}'
}

// SQL Database
resource sqlServer 'Microsoft.Sql/servers@2021-02-01-preview' = {
  name: sqlServerName
  location: location
  properties: {
    administratorLogin: dbAdminLogin
    administratorLoginPassword: dbAdminPassword
  }
}

resource sqlVNetRule 'Microsoft.Sql/servers/virtualNetworkRules@2021-02-01-preview' = {
  parent: sqlServer
  name: 'apiVNetRule'
  properties: {
    virtualNetworkSubnetId: virtualNet.properties.subnets[0].id
  }
}

resource sqlAllRule 'Microsoft.Sql/servers/firewallRules@2021-02-01-preview' =
  if (dbAllowAllIps) {
    parent: sqlServer
    name: 'all'
    properties: {
      startIpAddress: '0.0.0.0'
      endIpAddress: '255.255.255.255'
    }
  }

resource sqlDb 'Microsoft.Sql/servers/databases@2021-02-01-preview' = {
  parent: sqlServer
  name: sqlDbName
  location: location
  sku: {
    name: dbTier
    tier: dbTier
    capacity: dbCapacity
  }
}

resource sqlDbStrPolicy 'Microsoft.Sql/servers/databases/backupShortTermRetentionPolicies@2021-08-01-preview' = {
  parent: sqlDb
  name: 'default'
  properties: {
    retentionDays: dbTier == 'Basic' ? 7 : 35
    diffBackupIntervalInHours: 24
  }
}

resource sqlDbLtrPolicy 'Microsoft.Sql/servers/databases/backupLongTermRetentionPolicies@2021-08-01-preview' = {
  parent: sqlDb
  name: 'default'
  properties: {
    weeklyRetention: 'P5W'
    monthlyRetention: 'P12M'
    yearlyRetention: 'P10Y'
    weekOfYear: 1
  }
}

// API App Service
resource appServicePlan 'Microsoft.Web/serverfarms@2018-02-01' =
  if (env != 'loc') {
    name: apiServicePlanName
    location: location
    kind: 'linux'
    properties: {
      reserved: true
    }
    sku: {
      name: 'P1v2'
      tier: 'PremiumV2'
      capacity: 1
    }
  }

resource apiAppService 'Microsoft.Web/sites@2018-11-01' =
  if (env != 'loc') {
    name: apiAppName
    location: location
    kind: 'app,linux'
    properties: {
      serverFarmId: appServicePlan.id
      httpsOnly: true
      virtualNetworkSubnetId: virtualNet.properties.subnets[0].id

      siteConfig: {
        alwaysOn: true
        linuxFxVersion: 'NODE|16-lts'
        appCommandLine: 'npm run start:prod'
        httpLoggingEnabled: true
        logsDirectorySizeLimit: 100
        vnetRouteAllEnabled: true
        scmIpSecurityRestrictionsUseMain: true

        appSettings: [
          {
            name: 'APPINSIGHTS_INSTRUMENTATIONKEY'
            value: env != 'loc' ? appInsights.properties.InstrumentationKey : ''
          }
          {
            name: 'ENVIRONMENT'
            value: env
          }
          {
            name: 'SQL_HOST'
            value: sqlServer.properties.fullyQualifiedDomainName
          }
          {
            name: 'SQL_PORT'
            value: '1433'
          }
          {
            name: 'SQL_USERNAME'
            value: dbAdminLogin
          }
          {
            name: 'SQL_PASSWORD'
            value: dbAdminPassword
          }
          {
            name: 'SQL_DB'
            value: sqlDbName
          }
          {
            name: 'JWT_SECRET'
            value: jwtSecret
          }
          {
            name: 'SQL_SYNCHRONIZE'
            value: 'false'
          }
          {
            name: 'SQL_MIGRATE'
            value: 'true'
          }
          {
            name: 'LIGHTNING_API_CERTIFICATE'
            value: lightningApiCertificate
          }
          {
            name: 'LIGHTNING_LNBITS_ADMIN_USER_ID'
            value: lightningLnbitsAdminUser
          }
          {
            name: 'LIGHTNING_LNBITS_ADMIN_KEY'
            value: lightningLnbitsAdminKey
          }
          {
            name: 'LIGHTNING_LNBITS_API_URL'
            value: 'https://${btcNodes[0].outputs.ip}:${lnBitsPort}/api/v1'
          }
          {
            name: 'LIGHTNING_LNBITS_LNURLP_API_URL'
            value: 'https://${btcNodes[0].outputs.ip}:${lnBitsPort}/lnurlp/api/v1'
          }
          {
            name: 'LIGHTNING_LNBITS_LNURLP_URL'
            value: 'https://${btcNodes[0].outputs.ip}:${lnBitsPort}/lnurlp'
          }
          {
            name: 'LIGHTNING_LNBITS_LNURLW_API_URL'
            value: 'https://${btcNodes[0].outputs.ip}:${lnBitsPort}/withdraw/api/v1'
          }
          {
            name: 'LIGHTNING_LNBITS_LNDHUB_URL'
            value: 'https://${btcNodes[0].outputs.ip}:${lnBitsPort}/lndhub/ext'
          }
          {
            name: 'LIGHTNING_LNBITS_USERMANAGER_API_URL'
            value: 'https://${btcNodes[0].outputs.ip}:${lnBitsPort}/usermanager/api/v1'
          }
          {
            name: 'LIGHTNING_LND_API_URL'
            value: 'https://${btcNodes[0].outputs.ip}:8080/v1'
          }
          {
            name: 'LIGHTNING_LND_ADMIN_MACAROON'
            value: lightningLndAdminMacaroon
          }
          {
            name: 'ETHEREUM_CHAIN_ID'
            value: ethereumChainId
          }
          {
            name: 'ARBITRUM_CHAIN_ID'
            value: arbitrumChainId
          }
          {
            name: 'OPTIMISM_CHAIN_ID'
            value: optimismChainId
          }
          {
            name: 'POLYGON_CHAIN_ID'
            value: polygonChainId
          }
          {
            name: 'BASE_CHAIN_ID'
            value: baseChainId
          }
          {
            name: 'ALCHEMY_API_KEY'
            value: alchemyApiKey
          }
          {
            name: 'ALCHEMY_AUTH_TOKEN'
            value: alchemyAuthToken
          }
          {
            name: 'LIGHTNING_LND_WS_ONCHAIN_TRANSACTIONS_URL'
            value: 'wss://${btcNodes[0].outputs.ip}:8080/v1/transactions/subscribe?method=GET'
          }
          {
            name: 'LIGHTNING_LND_WS_INVOICES_URL'
            value: 'wss://${btcNodes[0].outputs.ip}:8080/v1/invoices/subscribe?method=GET'
          }
          {
            name: 'LIGHTNING_LND_WS_PAYMENTS_URL'
            value: 'wss://${btcNodes[0].outputs.ip}:8080/v2/router/payments?method=GET'
          }
          {
            name: 'UMA_SIGNING_PRIV_KEY'
            value: umaSigningPrivKey
          }
          {
            name: 'UMA_SIGNING_PUB_KEY'
            value: umaSigningPubKey
          }
          {
            name: 'UMA_ENCRYPTION_PUB_KEY'
            value: umaEncryptionPubKey
          }
          {
            name: 'EVM_PAYMENT_ADDRESS'
            value: evmPaymentAddress
          }
          {
            name: 'COIN_GECKO_API_KEY'
            value: coingeckoApiKey
          }
          {
            name: 'WEBSITE_RUN_FROM_PACKAGE'
            value: '1'
          }
        ]
      }
    }
  }

resource appInsights 'microsoft.insights/components@2020-02-02-preview' =
  if (env != 'loc') {
    name: appInsightsName
    location: location
    kind: 'web'
    properties: {
      Application_Type: 'web'
      IngestionMode: 'ApplicationInsights'
      publicNetworkAccessForIngestion: 'Enabled'
      publicNetworkAccessForQuery: 'Enabled'
    }
  }

// BTC Node
resource vmNsg 'Microsoft.Network/networkSecurityGroups@2020-11-01' = {
  name: vmNsgName
  location: location
  properties: {
    securityRules: [
      {
        name: 'SSH'
        properties: {
          protocol: 'TCP'
          sourcePortRange: '*'
          destinationPortRange: '22'
          sourceAddressPrefix: allowedIpRange
          destinationAddressPrefix: '*'
          access: 'Allow'
          priority: 300
          direction: 'Inbound'
        }
      }
      {
        name: 'ThunderHub'
        properties: {
          protocol: 'TCP'
          sourcePortRange: '*'
          destinationPortRange: thunderHubPort
          sourceAddressPrefix: allowedIpRange
          destinationAddressPrefix: '*'
          access: 'Allow'
          priority: 310
          direction: 'Inbound'
        }
      }
      {
        name: 'LNbits'
        properties: {
          protocol: 'TCP'
          sourcePortRange: '*'
          destinationPortRange: lnBitsPort
          sourceAddressPrefix: allowedIpRange
          destinationAddressPrefix: '*'
          access: 'Allow'
          priority: 320
          direction: 'Inbound'
        }
      }
    ]
  }
}

module btcNodes 'btc-node.bicep' = [
  for node in btcNodeProps: {
    name: node.name
    params: {
      location: location
      pipName: node.pipName
      vmName: node.vmName
      vmDiskName: node.vmDiskName
      nicName: node.nicName
      vmUser: btcVmUser
      vmPassword: btcVmPassword
      subnetId: virtualNet.properties.subnets[1].id
    }
  }
]
