targetScope = 'resourceGroup'

@description('Azure region for the workshop resources.')
param location string

@description('Lowercase alphanumeric suffix for this workshop deployment.')
param nameSuffix string

@description('Globally unique, alphanumeric Azure Container Registry name.')
param acrName string

var tags = {
  environment: 'workshop'
  purpose: 'mentoring-demo'
  managedBy: 'bicep'
}

resource registry 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name: acrName
  location: location
  sku: {
    name: 'Basic'
  }
  properties: {
    adminUserEnabled: false
  }
  tags: tags
}

resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2025-02-01' = {
  name: 'log-mentoring-${nameSuffix}'
  location: location
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
  }
  tags: tags
}

resource pullIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2024-11-30' = {
  name: 'id-mentoring-${nameSuffix}'
  location: location
  tags: tags
}

resource containerAppsEnvironment 'Microsoft.App/managedEnvironments@2025-01-01' = {
  name: 'cae-mentoring-${nameSuffix}'
  location: location
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalytics.properties.customerId
        sharedKey: logAnalytics.listKeys().primarySharedKey
      }
    }
  }
  tags: tags
}

resource registryPullRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: registry
  name: guid(registry.id, pullIdentity.id, 'AcrPull')
  properties: {
    roleDefinitionId: subscriptionResourceId(
      'Microsoft.Authorization/roleDefinitions',
      '7f951dda-4ed3-4680-a7ca-43fe172d538d'
    )
    principalId: pullIdentity.properties.principalId
    principalType: 'ServicePrincipal'
  }
}

output acrName string = registry.name
output acrLoginServer string = registry.properties.loginServer
output acaEnvironmentId string = containerAppsEnvironment.id
output pullIdentityId string = pullIdentity.id
output pullIdentityClientId string = pullIdentity.properties.clientId
output pullIdentityPrincipalId string = pullIdentity.properties.principalId
