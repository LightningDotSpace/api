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
@secure()
param nodePassword string
@secure()
param nodeWalletPassword string

param btcVmUser string
@secure()
param btcVmPassword string

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

var thunderHubPort = '4000'
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

resource sqlAllRule 'Microsoft.Sql/servers/firewallRules@2021-02-01-preview' = if (dbAllowAllIps) {
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
resource appServicePlan 'Microsoft.Web/serverfarms@2018-02-01' = if (env != 'loc') {
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

resource apiAppService 'Microsoft.Web/sites@2018-11-01' = if (env != 'loc') {
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
          name: 'NODE_USER'
          value: 'lds-api'
        }
        {
          name: 'NODE_PASSWORD'
          value: nodePassword
        }
        {
          name: 'NODE_WALLET_PASSWORD'
          value: nodeWalletPassword
        }
        {
          name: 'WEBSITE_RUN_FROM_PACKAGE'
          value: '1'
        }
      ]
    }
  }
}

resource appInsights 'microsoft.insights/components@2020-02-02-preview' = if (env != 'loc') {
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

module btcNodes 'btc-node.bicep' = [for node in btcNodeProps: {
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
}]
