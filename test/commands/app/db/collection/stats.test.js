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

import { StatsCollection } from '../../../../../src/commands/app/db/collection/stats.js'
import { expect, jest } from '@jest/globals'
import { stdout } from 'stdout-stderr'
import { DBBaseCommand } from '../../../../../src/DBBaseCommand.js'

// Use the global DB mock
const mockCollection = jest.fn()
const mockStats = jest.fn()

describe('prototype', () => {
  test('extends DBBaseCommand', () => {
    expect(StatsCollection.prototype instanceof DBBaseCommand).toBe(true)
  })
  test('args', () => {
    expect(Object.keys(StatsCollection.args)).toEqual(['collection'])
    expect(StatsCollection.args.collection.required).toBe(true)
  })
  test('flags', () => {
    const expectedFlags = Object.keys(DBBaseCommand.flags).sort()
    expect(Object.keys(StatsCollection.flags).sort()).toEqual(expectedFlags)
    expect(StatsCollection.enableJsonFlag).toEqual(true)
  })
})

describe('run', () => {
  let command
  beforeEach(async () => {
    command = new StatsCollection(['users'])
    command.config = {
      runHook: jest.fn().mockResolvedValue({})
    }

    // Reset mocks
    mockCollection.mockReset()
    mockStats.mockReset()

    // Mock the db client connection
    global.mockDBInstance.connect = jest.fn().mockResolvedValue({
      collection: mockCollection
    })

    // Mock the collection.stats() method
    mockCollection.mockReturnValue({
      stats: mockStats
    })
  })

  describe('successful stats retrieval', () => {
    test('gets collection stats without --json flag', async () => {
      command.argv = ['users']
      await command.init()

      // Mock collection stats response
      mockStats.mockResolvedValue({
        documentCount: 10,
        documents: 10,
        size: 1024,
        indexes: 2,
        indexSizes: {
          _id_: 512,
          otherIndex: 512
        },
        avgDocumentSize: 102.4
      })

      const result = await command.run()

      expect(global.mockDBInstance.connect).toHaveBeenCalled()
      expect(mockCollection).toHaveBeenCalledWith('users')
      expect(mockStats).toHaveBeenCalled()

      expect(result).toEqual({
        collection: 'users',
        stats: {
          documentCount: 10,
          documents: 10,
          size: 1024,
          indexes: 2,
          indexSizes: {
            _id_: 512,
            otherIndex: 512
          },
          avgDocumentSize: 102.4
        },
        namespace: 'test-namespace',
        timestamp: expect.any(String)
      })

      expect(stdout.output).toContain("Getting stats for collection 'users'...")
      expect(stdout.output).toContain("Stats for collection 'users':")
      expect(stdout.output).toContain('Namespace: test-namespace')
      expect(stdout.output).toContain('documents: 10')
      expect(stdout.output).toContain('size: 1024')
      expect(stdout.output).toContain('indexes: 2')
      expect(stdout.output).toContain('"_id_": 512')
      expect(stdout.output).toContain('"otherIndex": 512')
      expect(stdout.output).toContain('avgDocumentSize: 102.4')
      expect(stdout.output).toContain('Retrieved:')
    })

    test('gets collection stats with --json flag', async () => {
      command.argv = ['users', '--json']
      await command.init()

      // Mock collection stats response
      mockStats.mockResolvedValue({
        documentCount: 10,
        documents: 10,
        size: 1024,
        indexes: 2
      })

      const result = await command.run()

      expect(result).toEqual({
        collection: 'users',
        stats: {
          documentCount: 10,
          documents: 10,
          size: 1024,
          indexes: 2
        },
        namespace: 'test-namespace',
        timestamp: expect.any(String)
      })

      // Should not show console messages with --json
      expect(stdout.output).not.toContain("Getting stats for collection 'users'...")
      expect(stdout.output).not.toContain("Stats for collection 'users':")
      expect(stdout.output).not.toContain('Namespace:')
    })

    test('gets collection stats with minimal stats', async () => {
      command.argv = ['products']
      await command.init()

      // Mock collection stats response with minimal stats
      mockStats.mockResolvedValue({
        documentCount: 5,
        documents: 5
      })

      const result = await command.run()

      expect(result).toEqual({
        collection: 'products',
        stats: {
          documentCount: 5,
          documents: 5
        },
        namespace: 'test-namespace',
        timestamp: expect.any(String)
      })

      expect(stdout.output).toContain("Stats for collection 'products':")
      expect(stdout.output).toContain('documents: 5')
    })

    test('gets collection stats with empty stats', async () => {
      command.argv = ['empty']
      await command.init()

      // Mock collection stats response with empty stats
      mockStats.mockResolvedValue({
        documentCount: 0
      })

      const result = await command.run()

      expect(result).toEqual({
        collection: 'empty',
        stats: {
          documentCount: 0
        },
        namespace: 'test-namespace',
        timestamp: expect.any(String)
      })

      expect(stdout.output).toContain("Stats for collection 'empty':")
      // Should not show individual stats entries for empty object
      expect(stdout.output).not.toContain('documents:')
    })
  })

  describe('missing collection name', () => {
    test('fails when collection name is missing', async () => {
      command = new StatsCollection([])
      command.config = {
        runHook: jest.fn().mockResolvedValue({})
      }
      command.argv = []

      // oclif will throw validation error during init() for missing required args
      await expect(command.init()).rejects.toThrow('Missing 1 required arg')

      expect(mockStats).not.toHaveBeenCalled()
    })

    test('fails when collection name is empty string', async () => {
      command = new StatsCollection([''])
      command.config = {
        runHook: jest.fn().mockResolvedValue({})
      }
      command.argv = ['']

      await expect(async () => {
        await command.init()
        await command.run()
      }).rejects.toThrow('Collection name: Must be a non-empty string')

      expect(mockStats).not.toHaveBeenCalled()
    })
  })

  describe('collection does not exist', () => {
    test('fails when collection does not exist without --json flag', async () => {
      command.argv = ['users']
      await command.init()

      // Mock stats method to throw an error for non-existent collection
      mockStats.mockRejectedValue(new Error('Collection not found'))

      await expect(command.run()).rejects.toThrow("Failed to get stats for collection 'users': Collection not found")

      expect(stdout.output).toContain('Failed to get collection stats')
      expect(stdout.output).toContain('Collection: users')
      expect(stdout.output).toContain('Namespace: test-namespace')
      expect(stdout.output).toContain('Error: Collection not found')
    })

    test('fails when collection does not exist with --json flag', async () => {
      command.argv = ['users', '--json']
      await command.init()

      // Mock stats method to throw an error for non-existent collection
      mockStats.mockRejectedValue(new Error('Collection not found'))

      await expect(command.run()).rejects.toThrow("Failed to get stats for collection 'users': Collection not found")

      // Should not show console messages with --json
      expect(stdout.output).not.toContain('Failed to get collection stats')
      expect(stdout.output).not.toContain('Collection: users')
      expect(stdout.output).not.toContain('Namespace:')
    })
  })

  describe('error handling', () => {
    test('connection error without --json flag', async () => {
      command.argv = ['users']
      await command.init()

      global.mockDBInstance.connect.mockRejectedValue(new Error('Connection failed'))

      await expect(command.run()).rejects.toThrow("Failed to get stats for collection 'users': Connection failed")

      expect(stdout.output).toContain('Failed to get collection stats')
      expect(stdout.output).toContain('Collection: users')
      expect(stdout.output).toContain('Namespace: test-namespace')
      expect(stdout.output).toContain('Error: Connection failed')
    })

    test('connection error with --json flag', async () => {
      command.argv = ['users', '--json']
      await command.init()

      global.mockDBInstance.connect.mockRejectedValue(new Error('Connection failed'))

      await expect(command.run()).rejects.toThrow("Failed to get stats for collection 'users': Connection failed")

      // Should not show console messages with --json
      expect(stdout.output).not.toContain('Failed to get collection stats')
      expect(stdout.output).not.toContain('Collection: users')
      expect(stdout.output).not.toContain('Namespace:')
    })

    test('stats method error', async () => {
      command.argv = ['users']
      await command.init()

      mockStats.mockRejectedValue(new Error('Query failed'))

      await expect(command.run()).rejects.toThrow("Failed to get stats for collection 'users': Query failed")

      expect(stdout.output).toContain('Failed to get collection stats')
      expect(stdout.output).toContain('Error: Query failed')
    })

    test('collection data processing error', async () => {
      command.argv = ['users']
      await command.init()

      // Mock stats method to return valid data
      mockStats.mockResolvedValue({
        documentCount: 10
      })

      // This should work fine now since we just extract the collection data
      const result = await command.run()

      expect(result.stats).toEqual({
        documentCount: 10
      })
    })

    test('authentication error', async () => {
      command.argv = ['users']
      await command.init()

      global.mockDBInstance.connect.mockRejectedValue(new Error('401 Unauthorized'))

      await expect(command.run()).rejects.toThrow("Failed to get stats for collection 'users': 401 Unauthorized")

      expect(stdout.output).toContain('Failed to get collection stats')
      expect(stdout.output).toContain('401 Unauthorized')
    })
  })
})
