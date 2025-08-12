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
import { beforeEach, jest } from '@jest/globals'
import { stdout, stderr } from 'stdout-stderr'
import config from '@adobe/aio-lib-core-config'
jest.setTimeout(10000)

jest.unstable_mockModule('fs/promises', async () => ({
  readFile: () => { throw new Error('fake error no file') }
}))

// NOTE: if not wrapped in beforeAll/afterAll this may end up timing out random tests.... jest bug?
beforeAll(async () => {
  jest
    .useFakeTimers({ advanceTimers: true })
    .setSystemTime(new Date('2000-01-01'))
})
afterAll(async () => {
  jest.useRealTimers()
})

// mock config
config.get = (key) => {
  return global.fakeConfig[key] || null
}

// mock state
const mockInit = jest.fn()
const mockInstance = {
  get: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  stats: jest.fn(),
  list: jest.fn(),
  any: jest.fn(),
  deleteAll: jest.fn()
}
jest.unstable_mockModule('@adobe/aio-lib-state', () => ({
  init: mockInit
}))
global.getStateInstanceMock = () => mockInstance

// mock db
const mockDBInit = jest.fn()
const mockDBInstance = {
  ping: jest.fn(),
  provisionStatus: jest.fn(),
  provisionRequest: jest.fn(),
  deleteDatabase: jest.fn(),
  connect: jest.fn()
}
jest.unstable_mockModule('@adobe/aio-lib-db', () => ({
  init: mockDBInit
}))
global.mockDBInit = mockDBInit
global.mockDBInstance = mockDBInstance

// mock prompt
const mockPrompt = {
  input: jest.fn()
}
jest.unstable_mockModule('@inquirer/prompts', () => ({
  ...mockPrompt
}))
global.getPromptInstanceMock = () => mockPrompt

const mockEnv = jest.fn()
jest.unstable_mockModule('@adobe/aio-lib-env', () => ({
  getCliEnv: mockEnv
}))
global.getCliEnvMock = () => mockEnv

beforeEach(() => {
  // trap console log
  stdout.start()
  stderr.start()

  // config fakes
  global.fakeConfig = {
    'state.region': null,
    'runtime.namespace': 'test-namespace',
    'runtime.auth': 'auth',
    'state.endpoint': null,
    'db.endpoint': null,
    'db.region': null
  }
  delete process.env.AIO_STATE_ENDPOINT
  delete process.env.AIO_DB_ENDPOINT

  mockInit.mockReset()
  mockInit.mockResolvedValue(mockInstance)
  Object.values(mockInstance).forEach(mock => mock.mockReset())

  mockDBInit.mockReset()
  mockDBInit.mockResolvedValue(mockDBInstance)
  Object.values(mockDBInstance).forEach(mock => mock.mockReset())

  Object.values(mockPrompt).forEach(mock => mock.mockReset())

  mockEnv.mockReset()
  mockEnv.mockReturnValue('prod')
})
afterEach(() => { stdout.stop(); stderr.stop() })
