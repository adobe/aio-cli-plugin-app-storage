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
import config from '@adobe/aio-lib-core-config'
import { CONFIG_IMS_CONTEXTS_PREFIX } from '../../src/constants/global.js'

let getAccessToken

beforeAll(async () => {
  // eslint-disable-next-line node/no-unsupported-features/es-syntax
  const authModule = await import('../../src/utils/authHelper.js')
  getAccessToken = authModule.getAccessToken
})

describe('getAccessToken()', () => {
  beforeEach(() => {
    config.set = jest.fn()
    const imsMocks = global.getImsMock()
    imsMocks.validateTokenMock.mockReset()
    imsMocks.getAccessTokenByClientCredentialsMock.mockReset()
    imsMocks.ImsMock.mockClear()
    delete process.env.IMS_OAUTH_S2S_CLIENT_ID
    delete process.env.IMS_OAUTH_S2S_CLIENT_SECRET
    delete process.env.IMS_OAUTH_S2S_ORG_ID
    delete process.env.IMS_OAUTH_S2S_SCOPES
  })

  test('throws when runtime namespace is missing', async () => {
    global.fakeConfig['runtime.namespace'] = null
    await expect(getAccessToken()).rejects.toThrow('Runtime namespace is required. Please set CONFIG_RUNTIME_NAMESPACE.')
  })

  test('returns cached token when valid', async () => {
    const imsContextKey = `${CONFIG_IMS_CONTEXTS_PREFIX}.test-namespace`
    global.fakeConfig[imsContextKey] = {
      client_id: 'client-id',
      client_secret: 'client-secret',
      org_id: 'org-id',
      scopes: ['scope-a']
    }
    global.fakeConfig[`${imsContextKey}.token`] = 'cached-token'

    const imsMocks = global.getImsMock()
    imsMocks.validateTokenMock.mockResolvedValue({ valid: true })

    await expect(getAccessToken()).resolves.toBe('cached-token')
    expect(imsMocks.getAccessTokenByClientCredentialsMock).not.toHaveBeenCalled()
    expect(config.set).not.toHaveBeenCalled()
  })

  test('refreshes token when cached token is invalid', async () => {
    const imsContextKey = `${CONFIG_IMS_CONTEXTS_PREFIX}.test-namespace`
    global.fakeConfig[imsContextKey] = {
      client_id: 'client-id',
      client_secret: 'client-secret',
      org_id: 'org-id',
      scopes: 'scope-a,scope-b'
    }
    global.fakeConfig[`${imsContextKey}.token`] = 'cached-token'

    const imsMocks = global.getImsMock()
    imsMocks.validateTokenMock.mockResolvedValue({ valid: false })
    imsMocks.getAccessTokenByClientCredentialsMock.mockResolvedValue({ payload: { access_token: 'new-token' } })

    await expect(getAccessToken()).resolves.toBe('new-token')
    expect(imsMocks.getAccessTokenByClientCredentialsMock).toHaveBeenCalledWith(
      'client-id',
      'client-secret',
      'org-id',
      ['scope-a', 'scope-b']
    )
    expect(config.set).toHaveBeenCalledWith(
      imsContextKey,
      expect.objectContaining({
        client_id: 'client-id',
        client_secret: 'client-secret',
        org_id: 'org-id',
        scopes: ['scope-a', 'scope-b']
      })
    )
    expect(config.set).toHaveBeenCalledWith(`${imsContextKey}.token`, 'new-token')
  })

  test('builds auth config from environment when no context exists', async () => {
    const imsContextKey = `${CONFIG_IMS_CONTEXTS_PREFIX}.test-namespace`
    global.fakeConfig[imsContextKey] = null

    process.env.IMS_OAUTH_S2S_CLIENT_ID = 'env-client-id'
    process.env.IMS_OAUTH_S2S_CLIENT_SECRET = 'env-client-secret'
    process.env.IMS_OAUTH_S2S_ORG_ID = 'env-org-id'
    process.env.IMS_OAUTH_S2S_SCOPES = '["scope-x","scope-y"]'

    const imsMocks = global.getImsMock()
    imsMocks.getAccessTokenByClientCredentialsMock.mockResolvedValue({ payload: { access_token: 'token-string' } })

    await expect(getAccessToken()).resolves.toBe('token-string')
    expect(imsMocks.getAccessTokenByClientCredentialsMock).toHaveBeenCalledWith(
      'env-client-id',
      'env-client-secret',
      'env-org-id',
      ['scope-x', 'scope-y']
    )
    expect(config.set).toHaveBeenCalledWith(
      imsContextKey,
      expect.objectContaining({
        client_id: 'env-client-id',
        client_secret: 'env-client-secret',
        org_id: 'env-org-id',
        scopes: ['scope-x', 'scope-y']
      })
    )
    expect(config.set).toHaveBeenCalledWith(`${imsContextKey}.token`, 'token-string')
  })

  test('uses array scopes from existing context', async () => {
    const imsContextKey = `${CONFIG_IMS_CONTEXTS_PREFIX}.test-namespace`
    global.fakeConfig[imsContextKey] = {
      client_id: 'client-id',
      client_secret: 'client-secret',
      org_id: 'org-id',
      scopes: ['scope-a', 'scope-b']
    }
    global.fakeConfig[`${imsContextKey}.token`] = 'cached-token'

    const imsMocks = global.getImsMock()
    imsMocks.validateTokenMock.mockResolvedValue({ valid: false })
    imsMocks.getAccessTokenByClientCredentialsMock.mockResolvedValue({ payload: { access_token: 'array-scope-token' } })

    await expect(getAccessToken()).resolves.toBe('array-scope-token')
    expect(imsMocks.getAccessTokenByClientCredentialsMock).toHaveBeenCalledWith(
      'client-id',
      'client-secret',
      'org-id',
      ['scope-a', 'scope-b']
    )
  })

  test('returns empty scopes array for non-string, non-array scopes', async () => {
    const imsContextKey = `${CONFIG_IMS_CONTEXTS_PREFIX}.test-namespace`
    global.fakeConfig[imsContextKey] = {
      client_id: 'client-id',
      client_secret: 'client-secret',
      org_id: 'org-id',
      scopes: 123
    }
    global.fakeConfig[`${imsContextKey}.token`] = 'cached-token'

    const imsMocks = global.getImsMock()
    imsMocks.validateTokenMock.mockResolvedValue({ valid: false })
    imsMocks.getAccessTokenByClientCredentialsMock.mockResolvedValue({ payload: { access_token: 'empty-scope-token' } })

    await expect(getAccessToken()).resolves.toBe('empty-scope-token')
    expect(imsMocks.getAccessTokenByClientCredentialsMock).toHaveBeenCalledWith(
      'client-id',
      'client-secret',
      'org-id',
      []
    )
  })

  test('throws when required credentials are missing', async () => {
    const imsContextKey = `${CONFIG_IMS_CONTEXTS_PREFIX}.test-namespace`
    global.fakeConfig[imsContextKey] = null
    global.fakeConfig[`${imsContextKey}.token`] = null
    delete process.env.IMS_OAUTH_S2S_CLIENT_ID
    delete process.env.IMS_OAUTH_S2S_CLIENT_SECRET
    delete process.env.IMS_OAUTH_S2S_ORG_ID
    delete process.env.IMS_OAUTH_S2S_SCOPES

    await expect(getAccessToken()).rejects.toThrow(
      'Missing required credentials.'
    )
  })

  test('throws when token response is empty', async () => {
    const imsContextKey = `${CONFIG_IMS_CONTEXTS_PREFIX}.test-namespace`
    global.fakeConfig[imsContextKey] = {
      client_id: 'client-id',
      client_secret: 'client-secret',
      org_id: 'org-id',
      scopes: ['scope-a']
    }
    global.fakeConfig[`${imsContextKey}.token`] = null

    const imsMocks = global.getImsMock()
    imsMocks.getAccessTokenByClientCredentialsMock.mockResolvedValue(null)

    await expect(getAccessToken()).rejects.toThrow(
      'Failed to generate access token. Please verify your credentials.'
    )
  })

  test('throws when token response is missing access token', async () => {
    const imsContextKey = `${CONFIG_IMS_CONTEXTS_PREFIX}.test-namespace`
    global.fakeConfig[imsContextKey] = {
      client_id: 'client-id',
      client_secret: 'client-secret',
      org_id: 'org-id',
      scopes: ['scope-a']
    }
    global.fakeConfig[`${imsContextKey}.token`] = null

    const imsMocks = global.getImsMock()
    imsMocks.getAccessTokenByClientCredentialsMock.mockResolvedValue({})

    await expect(getAccessToken()).rejects.toThrow(
      'Failed to generate access token. Please verify your credentials.'
    )
  })

  test('throws when token response is a raw string', async () => {
    const imsContextKey = `${CONFIG_IMS_CONTEXTS_PREFIX}.test-namespace`
    global.fakeConfig[imsContextKey] = {
      client_id: 'client-id',
      client_secret: 'client-secret',
      org_id: 'org-id',
      scopes: ['scope-a']
    }
    global.fakeConfig[`${imsContextKey}.token`] = null

    const imsMocks = global.getImsMock()
    imsMocks.getAccessTokenByClientCredentialsMock.mockResolvedValue('raw-token-string')

    await expect(getAccessToken()).rejects.toThrow(
      'Failed to generate access token. Please verify your credentials.'
    )
  })

  test('throws unknown error when IMS client rejects with non-error', async () => {
    const imsContextKey = `${CONFIG_IMS_CONTEXTS_PREFIX}.test-namespace`
    global.fakeConfig[imsContextKey] = {
      client_id: 'client-id',
      client_secret: 'client-secret',
      org_id: 'org-id',
      scopes: ['scope-a']
    }
    global.fakeConfig[`${imsContextKey}.token`] = 'cached-token'

    const imsMocks = global.getImsMock()
    imsMocks.validateTokenMock.mockResolvedValue({ valid: false })
    imsMocks.getAccessTokenByClientCredentialsMock.mockRejectedValue('boom')

    await expect(getAccessToken()).rejects.toThrow(
      'Failed to retrieve access token: Unknown error'
    )
  })
})
