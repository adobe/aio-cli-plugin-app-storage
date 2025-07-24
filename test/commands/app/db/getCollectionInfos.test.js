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

import { GetCollectionInfos } from '../../../../src/commands/app/db/getCollectionInfos.js'
import { expect, jest } from '@jest/globals'
import { stdout } from 'stdout-stderr'
import { DBBaseCommand } from '../../../../src/DBBaseCommand.js'

// Use the global DB mock
const mockListCollections = jest.fn()

describe('prototype', () => {
  test('extends DBBaseCommand', () => {
    expect(GetCollectionInfos.prototype instanceof DBBaseCommand).toBe(true)
  })
  test('args', () => {
    expect(Object.keys(GetCollectionInfos.args)).toEqual([])
  })
  test('flags', () => {
    expect(Object.keys(GetCollectionInfos.flags).sort()).toEqual([])
    expect(GetCollectionInfos.enableJsonFlag).toEqual(true)
  })
})

describe('run', () => {
  let command
  beforeEach(async () => {
    command = new GetCollectionInfos([])
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

  describe('successful collection info retrieval', () => {
    test('returns full collection information without --json flag', async () => {
      command.argv = []
      await command.init()

      const collectionInfo = [
        { name: 'users', documentCount: 100, size: 1024 },
        { name: 'products', documentCount: 50, size: 512 },
        { name: 'orders', documentCount: 200, size: 2048 }
      ]
      mockListCollections.mockResolvedValue(collectionInfo)

      const result = await command.run()

      expect(global.mockDBInstance.connect).toHaveBeenCalled()
      expect(mockListCollections).toHaveBeenCalled()
      expect(result).toEqual(collectionInfo)

      expect(stdout.output).toContain('Fetching collection info...')
      expect(stdout.output).toContain('Collection Information:')
      expect(stdout.output).toContain('Namespace: test-namespace')
      expect(stdout.output).toContain('Total Collections: 3')
      expect(stdout.output).toContain('Collection 1:')
      expect(stdout.output).toContain('name: users')
      expect(stdout.output).toContain('documentCount: 100')
      expect(stdout.output).toContain('size: 1,024')
      expect(stdout.output).toContain('Retrieved:')
    })

    test('returns collection information with --json flag', async () => {
      command.argv = ['--json']
      await command.init()

      const collectionInfo = [
        { name: 'users', documentCount: 100, size: 1024 },
        { name: 'products', documentCount: 50, size: 512 }
      ]
      mockListCollections.mockResolvedValue(collectionInfo)

      const result = await command.run()

      expect(result).toEqual(collectionInfo)

      // Should not show console messages with --json
      expect(stdout.output).not.toContain('Fetching collection info...')
      expect(stdout.output).not.toContain('Collection Information:')
      expect(stdout.output).not.toContain('Namespace:')
    })

    test('handles empty collection list', async () => {
      command.argv = []
      await command.init()

      mockListCollections.mockResolvedValue([])

      const result = await command.run()

      expect(result).toEqual([])
      expect(stdout.output).toContain('Collection Information:')
      expect(stdout.output).toContain('No collections found')
    })

    test('handles empty collection list with --json flag', async () => {
      command.argv = ['--json']
      await command.init()

      mockListCollections.mockResolvedValue([])

      const result = await command.run()

      expect(result).toEqual([])
      expect(stdout.output).not.toContain('No collections found')
    })
  })

  describe('formatValue method', () => {
    test('formats numbers with commas', async () => {
      command.argv = []
      await command.init()

      const formatted = command.formatValue(1000)
      expect(formatted).toBe('1,000')
    })

    test('formats objects as JSON', async () => {
      command.argv = []
      await command.init()

      const obj = { key: 'value' }
      const formatted = command.formatValue(obj)
      expect(formatted).toMatch(/\{\n +"key": "value"\n *\}/)
    })

    test('formats other types as strings', async () => {
      command.argv = []
      await command.init()

      expect(command.formatValue('test')).toBe('test')
      expect(command.formatValue(true)).toBe('true')
    })
  })

  describe('error handling', () => {
    test('connection error without --json flag', async () => {
      command.argv = []
      await command.init()

      global.mockDBInstance.connect.mockRejectedValue(new Error('Connection failed'))

      await expect(command.run()).rejects.toThrow('Failed to fetch collection information: Connection failed')

      expect(stdout.output).toContain('Failed to retrieve collection information')
      expect(stdout.output).toContain('Namespace: test-namespace')
      expect(stdout.output).toContain('Error: Connection failed')
    })

    test('connection error with --json flag', async () => {
      command.argv = ['--json']
      await command.init()

      global.mockDBInstance.connect.mockRejectedValue(new Error('Connection failed'))

      await expect(command.run()).rejects.toThrow('Failed to fetch collection information: Connection failed')

      // Should not show console messages with --json
      expect(stdout.output).not.toContain('Failed to retrieve collection information')
      expect(stdout.output).not.toContain('Namespace:')
    })

    test('listCollections error', async () => {
      command.argv = []
      await command.init()

      global.mockDBInstance.connect.mockResolvedValue({
        listCollections: mockListCollections
      })
      mockListCollections.mockRejectedValue(new Error('Query failed'))

      await expect(command.run()).rejects.toThrow('Failed to fetch collection information: Query failed')

      expect(stdout.output).toContain('Failed to retrieve collection information')
      expect(stdout.output).toContain('Error: Query failed')
    })

    test('authentication error', async () => {
      command.argv = []
      await command.init()

      global.mockDBInstance.connect.mockRejectedValue(new Error('401 Unauthorized'))

      await expect(command.run()).rejects.toThrow('Failed to fetch collection information: 401 Unauthorized')

      expect(stdout.output).toContain('Failed to retrieve collection information')
      expect(stdout.output).toContain('401 Unauthorized')
    })
  })
})
