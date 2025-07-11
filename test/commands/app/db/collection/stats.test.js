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
const mockListCollections = jest.fn()
const mockGetCollectionStats = jest.fn()

describe('prototype', () => {
  test('extends DBBaseCommand', () => {
    expect(StatsCollection.prototype instanceof DBBaseCommand).toBe(true)
  })
  test('args', () => {
    expect(Object.keys(StatsCollection.args)).toEqual(['collectionName'])
    expect(StatsCollection.args.collectionName.required).toBe(true)
  })
  test('flags', () => {
    expect(Object.keys(StatsCollection.flags).sort()).toEqual(['region'])
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
    mockListCollections.mockReset()
    mockGetCollectionStats.mockReset()

    // Mock the db client connection
    global.mockDBInstance.connect = jest.fn().mockResolvedValue({
      listCollections: mockListCollections,
      getCollectionStats: mockGetCollectionStats
    })
  })

  describe('successful stats retrieval', () => {
    test('gets collection stats without --json flag', async () => {
      command.argv = ['users']
      await command.init()

      // Mock existing collection
      mockListCollections.mockResolvedValue([
        { name: 'users', documentCount: 10 }
      ])
      mockGetCollectionStats.mockResolvedValue({
        documents: 10,
        size: 1024,
        indexes: 2,
        avgDocumentSize: 102.4
      })

      const result = await command.run()

      expect(global.mockDBInstance.connect).toHaveBeenCalled()
      expect(mockListCollections).toHaveBeenCalled()
      expect(mockGetCollectionStats).toHaveBeenCalledWith('users')

      expect(result).toEqual({
        collectionName: 'users',
        stats: {
          documents: 10,
          size: 1024,
          indexes: 2,
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
      expect(stdout.output).toContain('avgDocumentSize: 102.4')
      expect(stdout.output).toContain('Retrieved:')
    })

    test('gets collection stats with --json flag', async () => {
      command.argv = ['users', '--json']
      await command.init()

      // Mock existing collection
      mockListCollections.mockResolvedValue([
        { name: 'users', documentCount: 10 }
      ])
      mockGetCollectionStats.mockResolvedValue({
        documents: 10,
        size: 1024,
        indexes: 2
      })

      const result = await command.run()

      expect(result).toEqual({
        collectionName: 'users',
        stats: {
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

      // Mock existing collection and minimal stats
      mockListCollections.mockResolvedValue([
        { name: 'products', documentCount: 5 }
      ])
      mockGetCollectionStats.mockResolvedValue({
        documents: 5
      })

      const result = await command.run()

      expect(result).toEqual({
        collectionName: 'products',
        stats: {
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

      // Mock existing collection and empty stats
      mockListCollections.mockResolvedValue([
        { name: 'empty', documentCount: 0 }
      ])
      mockGetCollectionStats.mockResolvedValue({})

      const result = await command.run()

      expect(result).toEqual({
        collectionName: 'empty',
        stats: {},
        namespace: 'test-namespace',
        timestamp: expect.any(String)
      })

      expect(stdout.output).toContain("Stats for collection 'empty':")
      // Should not show individual stats entries for empty object
      expect(stdout.output).not.toContain('documents:')
    })
  })

  describe('collection does not exist', () => {
    test('fails when collection does not exist without --json flag', async () => {
      command.argv = ['users']
      await command.init()

      // Mock no existing collections with that name
      mockListCollections.mockResolvedValue([
        { name: 'products', documentCount: 5 }
      ])

      await expect(command.run()).rejects.toThrow("Collection 'users' does not exist")

      expect(mockGetCollectionStats).not.toHaveBeenCalled()
      expect(stdout.output).toContain("Collection 'users' does not exist")
      expect(stdout.output).toContain('Namespace: test-namespace')
    })

    test('fails when collection does not exist with --json flag', async () => {
      command.argv = ['users', '--json']
      await command.init()

      // Mock no existing collections
      mockListCollections.mockResolvedValue([])

      await expect(command.run()).rejects.toThrow("Collection 'users' does not exist")

      expect(mockGetCollectionStats).not.toHaveBeenCalled()
      // Should not show console messages with --json
      expect(stdout.output).not.toContain("Collection 'users' does not exist")
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

    test('listCollections error', async () => {
      command.argv = ['users']
      await command.init()

      global.mockDBInstance.connect.mockResolvedValue({
        listCollections: mockListCollections,
        getCollectionStats: mockGetCollectionStats
      })
      mockListCollections.mockRejectedValue(new Error('Query failed'))

      await expect(command.run()).rejects.toThrow("Failed to get stats for collection 'users': Query failed")

      expect(stdout.output).toContain('Failed to get collection stats')
      expect(stdout.output).toContain('Error: Query failed')
    })

    test('getCollectionStats error', async () => {
      command.argv = ['users']
      await command.init()

      global.mockDBInstance.connect.mockResolvedValue({
        listCollections: mockListCollections,
        getCollectionStats: mockGetCollectionStats
      })
      mockListCollections.mockResolvedValue([
        { name: 'users', documentCount: 10 }
      ])
      mockGetCollectionStats.mockRejectedValue(new Error('Stats failed'))

      await expect(command.run()).rejects.toThrow("Failed to get stats for collection 'users': Stats failed")

      expect(stdout.output).toContain('Failed to get collection stats')
      expect(stdout.output).toContain('Error: Stats failed')
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
