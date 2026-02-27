/*
Copyright 2026 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

/**
 * Helper to get the IMS access token using Adobe I/O SDK
 * @returns {string} The IMS access token
 */

import config from '@adobe/aio-lib-core-config'
import { CONFIG_IMS_CONTEXTS_PREFIX, CONFIG_RUNTIME_NAMESPACE } from '../constants/global.js'
import { getCliEnv } from '@adobe/aio-lib-env'

const parseScopes = (scopes) => {
  if (Array.isArray(scopes)) {
    return scopes
  }

  if (typeof scopes === 'string') {
    try {
      return JSON.parse(scopes)
    } catch {
      return scopes.split(',').map((scope) => scope.trim()).filter(Boolean)
    }
  }

  return []
}

const buildAuthConfig = (existingContext) => {
  const clientId = existingContext?.client_id || process.env.IMS_OAUTH_S2S_CLIENT_ID
  const clientSecret = existingContext?.client_secret || process.env.IMS_OAUTH_S2S_CLIENT_SECRET
  const orgId = existingContext?.org_id || process.env.IMS_OAUTH_S2S_ORG_ID
  const scopes = existingContext?.scopes || process.env.IMS_OAUTH_S2S_SCOPES

  if (!clientId || !clientSecret || !orgId || !scopes) {
    throw new Error('Missing required credentials. Please set IMS_OAUTH_S2S_CLIENT_ID, IMS_OAUTH_S2S_CLIENT_SECRET, IMS_OAUTH_S2S_ORG_ID, and IMS_OAUTH_S2S_SCOPES environment variables.')
  }

  return {
    client_id: clientId,
    client_secret: clientSecret,
    org_id: orgId,
    scopes: parseScopes(scopes)
  }
}

const extractAccessToken = (tokenResponse) => {
  if (!tokenResponse) {
    return null
  }

  if (tokenResponse?.payload?.access_token) {
    return tokenResponse.payload.access_token
  }

  return null
}

const getAccessTokenFromIms = async (ims, authConfig) => {
  const tokenResponse = await ims.getAccessTokenByClientCredentials(
    authConfig.client_id,
    authConfig.client_secret,
    authConfig.org_id,
    authConfig.scopes
  )

  const accessToken = extractAccessToken(tokenResponse)

  if (!accessToken) {
    throw new Error('Failed to generate access token. Please verify your credentials.')
  }

  return accessToken
}

/**
 * Get or generate an IMS access token using OAuth Server-to-Server credentials.
 * @returns {Promise<string>} The access token
 */
export async function getAccessToken () {
  const runtimeNamespace = config.get(CONFIG_RUNTIME_NAMESPACE)

  if (!runtimeNamespace) {
    throw new Error('Runtime namespace is required. Please set CONFIG_RUNTIME_NAMESPACE.')
  }

  const imsContextKey = `${CONFIG_IMS_CONTEXTS_PREFIX}.${runtimeNamespace}`

  try {
    // eslint-disable-next-line node/no-unsupported-features/es-syntax
    const ImsModule = await import('@adobe/aio-lib-ims')
    const { Ims } = ImsModule
    const ims = new Ims(getCliEnv())

    // Check if context config already exists
    const existingContext = config.get(imsContextKey)

    let authConfig = null

    if (existingContext) {
      const currentToken = config.get(`${imsContextKey}.token`)

      // Check if token exists in selected context config and is valid
      if (currentToken) {
        const validToken = await ims.validateToken(currentToken)
        if (validToken.valid) {
          return currentToken
        }
      }

      // Otherwise, create auth config using existing context
      authConfig = buildAuthConfig(existingContext)
    } else {
      // If no existing context, create auth config using environment configuration
      authConfig = buildAuthConfig()
    }

    // set context config
    config.set(imsContextKey, authConfig)

    const accessToken = await getAccessTokenFromIms(ims, authConfig)

    // set token in context config for further use
    config.set(`${imsContextKey}.token`, accessToken)

    return accessToken
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Failed to retrieve access token: Unknown error')
  }
}
