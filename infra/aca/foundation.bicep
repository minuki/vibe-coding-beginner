targetScope = 'subscription'

@description('Azure region for the workshop resources.')
param location string = 'koreacentral'

@minLength(3)
@maxLength(12)
@description('A unique lowercase alphanumeric suffix for this workshop deployment.')
param nameSuffix string

var normalizedSuffix = toLower(nameSuffix)
var resourceGroupName = 'rg-mentoring-${normalizedSuffix}'
var acrName = 'acrmentor${take(uniqueString(subscription().id, location, normalizedSuffix), 10)}'
var tags = {
  environment: 'workshop'
  purpose: 'mentoring-demo'
  managedBy: 'bicep'
}

resource workshopResourceGroup 'Microsoft.Resources/resourceGroups@2025-04-01' = {
  name: resourceGroupName
  location: location
  tags: tags
}

module foundationResources './foundation-resources.bicep' = {
  name: 'foundation-resources'
  scope: workshopResourceGroup
  params: {
    location: location
    nameSuffix: normalizedSuffix
    acrName: acrName
  }
}

output resourceGroupName string = workshopResourceGroup.name
output acrName string = foundationResources.outputs.acrName
output acrLoginServer string = foundationResources.outputs.acrLoginServer
output acaEnvironmentId string = foundationResources.outputs.acaEnvironmentId
output pullIdentityId string = foundationResources.outputs.pullIdentityId
output pullIdentityClientId string = foundationResources.outputs.pullIdentityClientId
output pullIdentityPrincipalId string = foundationResources.outputs.pullIdentityPrincipalId
