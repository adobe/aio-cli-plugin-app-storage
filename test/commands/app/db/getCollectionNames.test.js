/*
Copyright 2025 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

import { GetCollectionNames } from '../../../../src/commands/app/db/getCollectionNames.js'
import { expect, jest } from '@jest/globals'
import { stdout } from 'stdout-stderr'
import { DBBaseCommand } from '../../../../src/DBBaseCommand.js'

// Use the global DB mock
const mockListCollections = jest.fn()

describe('prototype', () => {
  test('extends DBBaseCommand', () => {
    expect(GetCollectionNames.prototype instanceof DBBaseCommand).toBe(true)
  })
  test('args', () => {
    expect(Object.keys(GetCollectionNames.args)).toEqual([])
  })
  test('flags', () => {
    expect(Object.keys(GetCollectionNames.flags).sort()).toEqual(['region'])
    expect(GetCollectionNames.enableJsonFlag).toEqual(true)
  })
})

describe('run', () => {
  let command
  beforeEach(async () => {
    command = new GetCollectionNames([])
    command.config = {
      runHook: jest.fn().mockResolvedValue({})
    }

    // Reset mocks
    mockListCollections.mockReset()

    // Mock the db client connection
    global.mockDBInstance.connect = jest.fn().mockResolvedValue({
      listCollections: mockListCollections
    })
  })

  describe('successful collection names retrieval', () => {
    test('returns array of collection names', async () => {
      command.argv = []
      await command.init()

      const collectionInfo = [
        { name: 'users', documentCount: 100 },
        { name: 'products', documentCount: 50 },
        { name: 'orders', documentCount: 200 }
      ]
      mockListCollections.mockResolvedValue(collectionInfo)

      const result = await command.run()

      expect(global.mockDBInstance.connect).toHaveBeenCalled()
      expect(mockListCollections).toHaveBeenCalled()
      expect(result).toEqual(['users', 'products', 'orders'])

      expect(stdout.output).toContain('Fetching collection names...')
      expect(stdout.output).toContain('Collection names:')
      expect(stdout.output).toContain('users')
      expect(stdout.output).toContain('products')
      expect(stdout.output).toContain('orders')
    })

    test('handles empty collection list', async () => {
      command.argv = []
      await command.init()

      mockListCollections.mockResolvedValue([])

      const result = await command.run()

      expect(result).toEqual([])
      expect(stdout.output).toContain('Collection names:')
      expect(stdout.output).toContain('[]')
    })
  })

  describe('json output', () => {
    test('json flag returns raw array', async () => {
      command.argv = ['--json']
      await command.init()

      const collectionInfo = [
        { name: 'test1', documentCount: 10 },
        { name: 'test2', documentCount: 20 }
      ]
      mockListCollections.mockResolvedValue(collectionInfo)

      const result = await command.run()

      expect(result).toEqual(['test1', 'test2'])
      // Should not show console messages with --json
      expect(stdout.output).not.toContain('Fetching collection names...')
      expect(stdout.output).not.toContain('Collection names:')
    })
  })

  describe('error handling', () => {
    test('connection error', async () => {
      command.argv = []
      await command.init()

      global.mockDBInstance.connect.mockRejectedValue(new Error('Connection failed'))

      // Mock command.exit to prevent test from actually exiting
      const mockExit = jest.spyOn(command, 'exit').mockImplementation(() => {})

      await command.run()

      expect(stdout.output).toContain('Error fetching collection names')
      expect(stdout.output).toContain('Connection failed')
      expect(mockExit).toHaveBeenCalledWith(1)

      mockExit.mockRestore()
    })

    test('listCollections error', async () => {
      command.argv = []
      await command.init()

      global.mockDBInstance.connect.mockResolvedValue({
        listCollections: mockListCollections
      })
      mockListCollections.mockRejectedValue(new Error('Query failed'))

      const mockExit = jest.spyOn(command, 'exit').mockImplementation(() => {})

      await command.run()

      expect(stdout.output).toContain('Error fetching collection names')
      expect(stdout.output).toContain('Query failed')
      expect(mockExit).toHaveBeenCalledWith(1)

      mockExit.mockRestore()
    })
  })
})
