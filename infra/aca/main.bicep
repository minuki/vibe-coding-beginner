@description('Existing Azure Container Apps Environment resource ID.')
param environmentId string

@description('Fully qualified ACR login server, for example workshop.azurecr.io.')
param acrLoginServer string

@description('Resource ID of the user-assigned identity that has AcrPull on the registry.')
param pullIdentityId string

@description('Unique Container App name for this workshop deployment.')
param appName string

@description('Immutable image tag, normally the Git commit SHA.')
param imageTag string

@secure()
@description('Demo database password. Never reuse a production credential.')
param databasePassword string

var registry = acrLoginServer
var userAssignedIdentities = {
  '${pullIdentityId}': {}
}

resource app 'Microsoft.App/containerApps@2024-03-01' = {
  name: appName
  location: resourceGroup().location
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: userAssignedIdentities
  }
  properties: {
    managedEnvironmentId: environmentId
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: {
        external: true
        targetPort: 80
        transport: 'auto'
        allowInsecure: false
      }
      registries: [
        {
          server: registry
          identity: pullIdentityId
        }
      ]
      secrets: [
        {
          name: 'database-password'
          value: databasePassword
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'web'
          image: '${registry}/mentoring-web:${imageTag}'
          env: [
            {
              name: 'API_HOST'
              value: '127.0.0.1:3000'
            }
            {
              name: 'AUTH_HOST'
              value: '127.0.0.1:3001'
            }
            {
              name: 'KNOWLEDGE_HOST'
              value: '127.0.0.1:3002'
            }
          ]
          resources: {
            cpu: json('0.25')
            memory: '0.5Gi'
          }
        }
        {
          name: 'auth'
          image: '${registry}/mentoring-auth:${imageTag}'
          resources: {
            cpu: json('0.25')
            memory: '0.5Gi'
          }
        }
        {
          name: 'api'
          image: '${registry}/mentoring-api:${imageTag}'
          env: [
            {
              name: 'PORT'
              value: '3000'
            }
            {
              name: 'AUTH_URL'
              value: 'http://127.0.0.1:3001'
            }
            {
              name: 'PGHOST'
              value: '127.0.0.1'
            }
            {
              name: 'PGPORT'
              value: '5432'
            }
            {
              name: 'PGDATABASE'
              value: 'mentoring'
            }
            {
              name: 'PGUSER'
              value: 'workshop'
            }
            {
              name: 'PGPASSWORD'
              secretRef: 'database-password'
            }
          ]
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
        }
        {
          name: 'knowledge'
          image: '${registry}/mentoring-knowledge:${imageTag}'
          resources: {
            cpu: json('0.25')
            memory: '0.5Gi'
          }
        }
        {
          name: 'db'
          image: '${registry}/mentoring-db:${imageTag}'
          env: [
            {
              name: 'POSTGRES_DB'
              value: 'mentoring'
            }
            {
              name: 'POSTGRES_USER'
              value: 'workshop'
            }
            {
              name: 'POSTGRES_PASSWORD'
              secretRef: 'database-password'
            }
          ]
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 1
      }
    }
  }
}

output portalUrl string = 'https://${app.properties.configuration.ingress.fqdn}'
