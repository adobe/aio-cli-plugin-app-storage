/*
Copyright 2024 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/
import { expect, jest } from '@jest/globals'
import { AVAILABLE_REGIONS, DEFAULT_REGION } from '../src/constants/db.js'

const mockInit = global.mockDBInit
const mockDbInstance = global.mockDBInstance

// Mock getAccessToken for DBBaseCommand tests
const mockGetAccessToken = jest.fn()
jest.unstable_mockModule('../src/utils/authHelper.js', () => ({
  getAccessToken: mockGetAccessToken
}))

let DBBaseCommand
let BaseCommand

beforeAll(async () => {
  // eslint-disable-next-line node/no-unsupported-features/es-syntax
  const dbModule = await import('../src/DBBaseCommand.js')
  // eslint-disable-next-line node/no-unsupported-features/es-syntax
  const baseModule = await import('../src/BaseCommand.js')
  DBBaseCommand = dbModule.DBBaseCommand
  BaseCommand = baseModule.BaseCommand
})

describe('prototype', () => {
  test('extends BaseCommand', () => {
    expect(DBBaseCommand.prototype instanceof BaseCommand).toBe(true)
  })
  test('args', () => {
    expect(Object.keys(DBBaseCommand.args)).toEqual([])
  })
  test('flags', () => {
    expect(Object.keys(DBBaseCommand.flags).sort()).toEqual(['json', 'region'])
    expect(DBBaseCommand.enableJsonFlag).toEqual(true)
  })
  test('getServiceName', () => {
    const command = new DBBaseCommand([])
    expect(command.getServiceName()).toBe('db')
  })
})

describe('init', () => {
  let command
  beforeEach(async () => {
    command = new DBBaseCommand([])
    command.config = {
      runHook: jest.fn().mockResolvedValue({})
    }

    // Reset and configure getAccessToken mock
    mockGetAccessToken.mockReset()
    mockGetAccessToken.mockResolvedValue('test-token')
  })

  test('successful initialization', async () => {
    command.argv = []
    await command.init()

    expect(mockGetAccessToken).toHaveBeenCalled()
    expect(mockInit).toHaveBeenCalledWith({
      ow: {
        namespace: global.fakeConfig['runtime.namespace']
      },
      token: 'test-token',
      region: DEFAULT_REGION
    })
    expect(command.db).toBe(mockDbInstance)
    expect(command.dbConfig).toBeDefined()
    expect(command.rtNamespace).toBe(global.fakeConfig['runtime.namespace'])
  })

  test('initialization with custom region from config', async () => {
    global.fakeConfig['db.region'] = 'emea'
    command.argv = []
    await command.init()

    expect(command.dbConfig.region).toBe('emea')
  })

  test('initialization with default region', async () => {
    command.argv = []
    await command.init()

    expect(command.dbConfig.region).toBe(DEFAULT_REGION)
  })

  test('initialization with environment-specific region', async () => {
    global.getCliEnvMock().mockReturnValue('stage')
    command.argv = ['--region', 'amer2']
    await expect(command.init()).resolves.not.toThrow()
    expect(command.dbConfig.region).toBe('amer2')

    global.getCliEnvMock().mockReturnValue('prod')
    command.argv = ['--region', 'emea']
    await expect(command.init()).resolves.not.toThrow()
    expect(command.dbConfig.region).toBe('emea')
  })

  test('initialization with environment-specific region fails in other environment', async () => {
    global.getCliEnvMock().mockReturnValue('stage')
    command.argv = ['--region', 'emea']
    await expect(command.init()).rejects.toThrow(`Invalid region 'emea' for the stage environment, must be one of: ${AVAILABLE_REGIONS.stage.join(', ')}`)

    global.getCliEnvMock().mockReturnValue('prod')
    command.argv = ['--region', 'amer2']
    await expect(command.init()).rejects.toThrow(`Invalid region 'amer2' for the prod environment, must be one of: ${AVAILABLE_REGIONS.prod.join(', ')}`)
  })

  test('initialization with custom endpoint', async () => {
    global.fakeConfig['db.endpoint'] = 'https://custom.endpoint.com'
    command.argv = []
    await command.init()

    expect(process.env.AIO_DB_ENDPOINT).toBe('https://custom.endpoint.com')
  })

  test('missing namespace', async () => {
    command.argv = []
    global.fakeConfig['runtime.namespace'] = null

    await expect(command.init()).rejects.toThrow(
      'Database commands require App Builder project configuration.\nPlease make sure the \'AIO_RUNTIME_NAMESPACE\' environment variable is configured'
    )
  })

  test('missing token', async () => {
    command.argv = []
    mockGetAccessToken.mockResolvedValue(null)

    await expect(command.init()).rejects.toThrow(
      'Database commands require IMS token for authentication'
    )
  })

  test('aio-lib-db initialization failure', async () => {
    command.argv = []
    mockInit.mockRejectedValue(new Error('Failed to initialize DB client'))

    await expect(command.init()).rejects.toThrow('Failed to initialize database client: Failed to initialize DB client')
  })

  test('debug logging during initialization', async () => {
    command.argv = []
    await command.init()

    // Verify that debug logger is available and used
    expect(command.debugLogger).toBeDefined()
  })
})

describe('initializeDBClient', () => {
  let command
  beforeEach(async () => {
    command = new DBBaseCommand([])
    command.config = {
      runHook: jest.fn().mockResolvedValue({})
    }
    command.debugLogger = {
      info: jest.fn(),
      error: jest.fn()
    }
  })

  test('successful DB client initialization', async () => {
    await command.initializeDBClient()

    expect(command.db).toBe(mockDbInstance)
    expect(command.debugLogger.info).toHaveBeenCalledWith('DB client initialized successfully')
  })

  test('DB client initialization with debug logging', async () => {
    await command.initializeDBClient()

    expect(command.debugLogger.info).toHaveBeenCalledWith(
      'Initializing DB client with config:',
      expect.objectContaining({
        namespace: global.fakeConfig['runtime.namespace'],
        region: 'amer',
        hasToken: true
      })
    )
  })

  test('DB client initialization failure with debug logging', async () => {
    const error = new Error('Connection failed')
    mockInit.mockRejectedValue(error)

    await expect(command.initializeDBClient()).rejects.toThrow('Failed to initialize database client: Connection failed')

    expect(command.debugLogger.error).toHaveBeenCalledWith('Failed to initialize DB client:', 'Connection failed')
  })
})

describe('configuration', () => {
  let command
  beforeEach(() => {
    command = new DBBaseCommand([])
    command.config = {
      runHook: jest.fn().mockResolvedValue({})
    }
  })

  test('dbConfig contains expected properties', async () => {
    const expectedConfig = {
      ow: {
        namespace: global.fakeConfig['runtime.namespace']
      },
      token: 'test-token',
      region: 'amer'
    }

    command.argv = []
    await command.init()

    expect(command.dbConfig).toEqual(expectedConfig)
    expect(mockInit).toHaveBeenCalledWith(expectedConfig)
    expect(process.env.AIO_DB_ENDPOINT).toBeUndefined()
  })

  test('dbConfig with all custom values', async () => {
    global.fakeConfig['db.region'] = 'emea'
    global.fakeConfig['db.endpoint'] = 'https://custom.db.com'
    const expectedConfig = {
      ow: {
        namespace: global.fakeConfig['runtime.namespace']
      },
      token: 'test-token',
      region: global.fakeConfig['db.region']
    }

    command.argv = []
    await command.init()

    expect(command.dbConfig).toEqual(expectedConfig)
    expect(mockInit).toHaveBeenCalledWith(expectedConfig)
    expect(process.env.AIO_DB_ENDPOINT).toBe('https://custom.db.com')
  })

  test('dbConfig uses region flag', async () => {
    const expectedConfig = {
      ow: {
        namespace: global.fakeConfig['runtime.namespace']
      },
      token: 'test-token',
      region: 'emea'
    }

    command.argv = ['--region', 'emea']
    await command.init()

    expect(command.dbConfig).toEqual(expectedConfig)
    expect(mockInit).toHaveBeenCalledWith(expectedConfig)
  })
})
