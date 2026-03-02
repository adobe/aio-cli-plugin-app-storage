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
import { jest } from '@jest/globals'
const loadGetAccessToken = async () => {
  // eslint-disable-next-line node/no-unsupported-features/es-syntax
  const authModule = await import('../../src/utils/authHelper.js')
  return authModule.getAccessToken
}

let getAccessToken

beforeAll(async () => {
  getAccessToken = await loadGetAccessToken()
})

describe('getAccessToken()', () => {
  beforeEach(() => {
    const imsMocks = global.getImsMock()
    imsMocks.imsContextSetMock.mockReset()
    imsMocks.imsGetTokenMock.mockReset()
    delete process.env.IMS_OAUTH_S2S_CLIENT_ID
    delete process.env.IMS_OAUTH_S2S_CLIENT_SECRET
    delete process.env.IMS_OAUTH_S2S_ORG_ID
    delete process.env.IMS_OAUTH_S2S_SCOPES
    delete process.env.IMS_OAUTH_S2S_TECHNICAL_ACCOUNT_EMAIL
    delete process.env.IMS_OAUTH_S2S_TECHNICAL_ACCOUNT_ID
  })

  test('throws when runtime namespace is missing', async () => {
    global.fakeConfig['runtime.namespace'] = null
    await expect(getAccessToken()).rejects.toThrow('Runtime namespace is required. Please set CONFIG_RUNTIME_NAMESPACE.')
  })

  test('builds auth config from environment and returns token (json scopes)', async () => {
    process.env.IMS_OAUTH_S2S_CLIENT_ID = 'env-client-id'
    process.env.IMS_OAUTH_S2S_CLIENT_SECRET = 'env-client-secret'
    process.env.IMS_OAUTH_S2S_ORG_ID = 'env-org-id'
    process.env.IMS_OAUTH_S2S_SCOPES = '["scope-x","scope-y"]'

    const imsMocks = global.getImsMock()
    imsMocks.imsGetTokenMock.mockResolvedValue('token-string')

    await expect(getAccessToken()).resolves.toBe('token-string')
    expect(imsMocks.imsContextSetMock).toHaveBeenCalledWith(
      'test-namespace',
      expect.objectContaining({
        client_id: 'env-client-id',
        client_secrets: '["env-client-secret"]',
        ims_org_id: 'env-org-id',
        scopes: '["scope-x","scope-y"]',
        technical_account_email: 'dummy@techacct.adobe.com',
        technical_account_id: 'dummy@techacct.adobe.com'
      }),
      true
    )
  })

  test('builds auth config from environment and returns token (csv scopes)', async () => {
    process.env.IMS_OAUTH_S2S_CLIENT_ID = 'env-client-id'
    process.env.IMS_OAUTH_S2S_CLIENT_SECRET = 'env-client-secret'
    process.env.IMS_OAUTH_S2S_ORG_ID = 'env-org-id'
    process.env.IMS_OAUTH_S2S_SCOPES = 'scope-a, scope-b'

    const imsMocks = global.getImsMock()
    imsMocks.imsGetTokenMock.mockResolvedValue('csv-token')

    await expect(getAccessToken()).resolves.toBe('csv-token')
    expect(imsMocks.imsContextSetMock).toHaveBeenCalledWith(
      'test-namespace',
      expect.objectContaining({
        scopes: '["scope-a","scope-b"]'
      }),
      true
    )
  })

  test('builds auth config with empty scopes array when scope list is null', async () => {
    process.env.IMS_OAUTH_S2S_CLIENT_ID = 'env-client-id'
    process.env.IMS_OAUTH_S2S_CLIENT_SECRET = 'env-client-secret'
    process.env.IMS_OAUTH_S2S_ORG_ID = 'env-org-id'
    process.env.IMS_OAUTH_S2S_SCOPES = 'null'

    const imsMocks = global.getImsMock()
    imsMocks.imsGetTokenMock.mockResolvedValue('empty-scope-token')

    await expect(getAccessToken()).resolves.toBe('empty-scope-token')
    expect(imsMocks.imsContextSetMock).toHaveBeenCalledWith(
      'test-namespace',
      expect.objectContaining({
        scopes: '[]'
      }),
      true
    )
  })

  test('throws when required credentials are missing', async () => {
    delete process.env.IMS_OAUTH_S2S_CLIENT_ID
    delete process.env.IMS_OAUTH_S2S_CLIENT_SECRET
    delete process.env.IMS_OAUTH_S2S_ORG_ID
    delete process.env.IMS_OAUTH_S2S_SCOPES

    await expect(getAccessToken()).rejects.toThrow(
      'Missing required credentials.'
    )
  })

  test('throws when token response is empty', async () => {
    process.env.IMS_OAUTH_S2S_CLIENT_ID = 'env-client-id'
    process.env.IMS_OAUTH_S2S_CLIENT_SECRET = 'env-client-secret'
    process.env.IMS_OAUTH_S2S_ORG_ID = 'env-org-id'
    process.env.IMS_OAUTH_S2S_SCOPES = 'scope-a'

    const imsMocks = global.getImsMock()
    imsMocks.imsGetTokenMock.mockResolvedValue(null)

    await expect(getAccessToken()).rejects.toThrow(
      'Failed to generate access token. Please verify your credentials.'
    )
  })

  test('throws unknown error when IMS client rejects with non-error', async () => {
    process.env.IMS_OAUTH_S2S_CLIENT_ID = 'env-client-id'
    process.env.IMS_OAUTH_S2S_CLIENT_SECRET = 'env-client-secret'
    process.env.IMS_OAUTH_S2S_ORG_ID = 'env-org-id'
    process.env.IMS_OAUTH_S2S_SCOPES = 'scope-a'

    const imsMocks = global.getImsMock()
    imsMocks.imsGetTokenMock.mockRejectedValue('boom')

    await expect(getAccessToken()).rejects.toThrow(
      'Failed to retrieve access token: Unknown error'
    )
  })

  test('works when ims lib does not provide a default export', async () => {
    global.__ims_no_default = true
    jest.resetModules()
    getAccessToken = await loadGetAccessToken()

    process.env.IMS_OAUTH_S2S_CLIENT_ID = 'env-client-id'
    process.env.IMS_OAUTH_S2S_CLIENT_SECRET = 'env-client-secret'
    process.env.IMS_OAUTH_S2S_ORG_ID = 'env-org-id'
    process.env.IMS_OAUTH_S2S_SCOPES = '["scope-a"]'

    const imsMocks = global.getImsMock()
    imsMocks.imsGetTokenMock.mockResolvedValue('token-string')

    await expect(getAccessToken()).resolves.toBe('token-string')
  })
})
