targetScope = 'resourceGroup'

@minLength(36)
@maxLength(36)
@description('Object ID of the GitHub Actions service principal used by the workshop-demo environment.')
param githubActionsPrincipalId string

@description('Name of the workshop Azure Container Registry.')
param acrName string

resource registry 'Microsoft.ContainerRegistry/registries@2023-07-01' existing = {
  name: acrName
}

resource resourceGroupContributorAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(resourceGroup().id, githubActionsPrincipalId, 'Contributor')
  properties: {
    roleDefinitionId: subscriptionResourceId(
      'Microsoft.Authorization/roleDefinitions',
      'b24988ac-6180-42a0-ab88-20f7382dd24c'
    )
    principalId: githubActionsPrincipalId
    principalType: 'ServicePrincipal'
  }
}

resource registryPushAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: registry
  name: guid(registry.id, githubActionsPrincipalId, 'AcrPush')
  properties: {
    roleDefinitionId: subscriptionResourceId(
      'Microsoft.Authorization/roleDefinitions',
      '8311e382-0749-4cb8-b61a-304f252e45ec'
    )
    principalId: githubActionsPrincipalId
    principalType: 'ServicePrincipal'
  }
}
