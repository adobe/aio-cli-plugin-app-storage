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
import { DBBaseCommand } from '../src/DBBaseCommand.js'
import { BaseCommand } from '../src/BaseCommand.js'
import { DEFAULT_REGION } from '../src/constants/db.js'

// Mock aio-lib-db
const mockInit = jest.fn()
const mockDbInstance = {
  ping: jest.fn(),
  provisionStatus: jest.fn(),
  provisionRequest: jest.fn()
}

jest.unstable_mockModule('@adobe/aio-lib-db', () => ({
  default: {
    init: mockInit
  },
  init: mockInit
}))

describe('prototype', () => {
  test('extends BaseCommand', () => {
    expect(DBBaseCommand.prototype instanceof BaseCommand).toBe(true)
  })
  test('args', () => {
    expect(Object.keys(DBBaseCommand.args)).toEqual([])
  })
  test('flags', () => {
    expect(Object.keys(DBBaseCommand.flags).sort()).toEqual([])
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
    mockInit.mockReset()
    mockInit.mockResolvedValue(mockDbInstance)
  })

  test('successful initialization', async () => {
    command.argv = []
    await command.init()

    expect(mockInit).toHaveBeenCalledWith(
      global.fakeConfig['runtime.namespace'],
      global.fakeConfig['runtime.auth']
    )
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

  test('initialization with config region', async () => {
    global.fakeConfig['db.region'] = 'apac'
    command.argv = []
    await command.init()

    expect(command.dbConfig.region).toBe('apac')
  })

  test('initialization with custom endpoint', async () => {
    global.fakeConfig['db.endpoint'] = 'https://custom.endpoint.com'
    command.argv = []
    await command.init()

    expect(command.dbConfig.endpoint).toBe('https://custom.endpoint.com')
  })

  test('initialization with environment endpoint', async () => {
    process.env.AIO_DB_ENDPOINT = 'https://env.endpoint.com'
    command.argv = []
    await command.init()

    expect(command.dbConfig.endpoint).toBe('https://env.endpoint.com')

    // Cleanup
    delete process.env.AIO_DB_ENDPOINT
  })

  test('missing namespace', async () => {
    command.argv = []
    global.fakeConfig['runtime.namespace'] = null

    await expect(command.init()).rejects.toThrow(
      'Database commands require App Builder project configuration.\nPlease make sure the \'AIO_RUNTIME_NAMESPACE\' and \'AIO_RUNTIME_AUTH\' environment variables are configured.'
    )
  })

  test('missing auth', async () => {
    command.argv = []
    global.fakeConfig['runtime.auth'] = null

    await expect(command.init()).rejects.toThrow(
      'Database commands require App Builder project configuration.\nPlease make sure the \'AIO_RUNTIME_NAMESPACE\' and \'AIO_RUNTIME_AUTH\' environment variables are configured.'
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
    mockInit.mockReset()
  })

  test('successful DB client initialization', async () => {
    mockInit.mockResolvedValue(mockDbInstance)

    await command.initializeDBClient()

    expect(command.db).toBe(mockDbInstance)
    expect(command.debugLogger.info).toHaveBeenCalledWith('DB client initialized successfully')
  })

  test('DB client initialization with debug logging', async () => {
    mockInit.mockResolvedValue(mockDbInstance)

    await command.initializeDBClient()

    expect(command.debugLogger.info).toHaveBeenCalledWith(
      'Initializing DB client with config:',
      expect.objectContaining({
        namespace: global.fakeConfig['runtime.namespace'],
        region: 'amer',
        hasAuth: true,
        endpoint: 'default'
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
    mockInit.mockReset()
    mockInit.mockResolvedValue(mockDbInstance)
  })

  test('dbConfig contains expected properties', async () => {
    command.argv = []
    await command.init()

    expect(command.dbConfig).toEqual({
      namespace: global.fakeConfig['runtime.namespace'],
      auth: global.fakeConfig['runtime.auth'],
      region: 'amer',
      endpoint: undefined
    })
  })

  test('dbConfig with all custom values', async () => {
    global.fakeConfig['db.region'] = 'emea'
    global.fakeConfig['db.endpoint'] = 'https://custom.db.com'

    command.argv = []
    await command.init()

    expect(command.dbConfig).toEqual({
      namespace: global.fakeConfig['runtime.namespace'],
      auth: global.fakeConfig['runtime.auth'],
      region: 'emea', // Uses config value
      endpoint: 'https://custom.db.com'
    })
  })
})
