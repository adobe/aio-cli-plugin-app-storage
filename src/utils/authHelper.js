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

import { CONFIG_IMS_TECHNICAL_ACCOUNT_EMAIL_PLACEHOLDER, CONFIG_IMS_TECHNICAL_ACCOUNT_ID_PLACEHOLDER } from '../constants/global.js'
const normalizeArrayString = (value) => {
  try {
    const parsed = JSON.parse(value)
    console.log(parsed)
    return Array.isArray(parsed) ? JSON.stringify(parsed) : '[]'
  } catch {
    const items = value.split(',').map((entry) => entry.trim()).filter(Boolean)
    console.log(items)
    return JSON.stringify(items)
  }
}

const buildAuthConfig = () => {
  const clientId = process.env.IMS_OAUTH_S2S_CLIENT_ID
  const clientSecret = process.env.IMS_OAUTH_S2S_CLIENT_SECRET
  const orgId = process.env.IMS_OAUTH_S2S_ORG_ID
  const scopes = process.env.IMS_OAUTH_S2S_SCOPES
  const technicalAccountEmail = process.env.IMS_OAUTH_S2S_TECHNICAL_ACCOUNT_EMAIL || CONFIG_IMS_TECHNICAL_ACCOUNT_EMAIL_PLACEHOLDER
  const technicalAccountId = process.env.IMS_OAUTH_S2S_TECHNICAL_ACCOUNT_ID || CONFIG_IMS_TECHNICAL_ACCOUNT_ID_PLACEHOLDER

  if (!clientId || !clientSecret || !orgId || !scopes) {
    throw new Error('Missing required credentials. Please set IMS_OAUTH_S2S_CLIENT_ID, IMS_OAUTH_S2S_CLIENT_SECRET, IMS_OAUTH_S2S_ORG_ID, and IMS_OAUTH_S2S_SCOPES environment variables.')
  }

  return {
    client_id: clientId,
    client_secrets: normalizeArrayString(clientSecret),
    ims_org_id: orgId,
    scopes: normalizeArrayString(scopes),
    technical_account_email: technicalAccountEmail,
    technical_account_id: technicalAccountId
  }
}

/**
 * Get or generate an IMS access token using OAuth Server-to-Server credentials.
 * @returns {Promise<string>} The access token
 */
export async function getAccessToken () {
  const runtimeNamespace = process.env.AIO_RUNTIME_NAMESPACE

  if (!runtimeNamespace) {
    throw new Error('Runtime namespace is required. Please set AIO_RUNTIME_NAMESPACE environment variable.')
  }

  try {
    // eslint-disable-next-line node/no-unsupported-features/es-syntax
    const imsLib = await import('@adobe/aio-lib-ims')
    const { context, getToken } = imsLib.default || imsLib
    const authConfig = buildAuthConfig()

    await context.set(runtimeNamespace, authConfig, true)
    const accessToken = await getToken(runtimeNamespace)

    if (!accessToken) {
      throw new Error('Failed to generate access token. Please verify your credentials.')
    }

    return accessToken
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Failed to retrieve access token: Unknown error')
  }
}
