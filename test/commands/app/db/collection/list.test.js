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

import { List } from '../../../../../src/commands/app/db/collection/list.js'
import { expect, jest } from '@jest/globals'
import { stdout } from 'stdout-stderr'
import { DBBaseCommand } from '../../../../../src/DBBaseCommand.js'

// Use the global DB mock
const mockListCollections = jest.fn()

describe('prototype', () => {
  test('extends DBBaseCommand', () => {
    expect(List.prototype instanceof DBBaseCommand).toBe(true)
  })
  test('args', () => {
    expect(Object.keys(List.args)).toEqual([])
  })
  test('flags', () => {
    const expectedFlags = [...Object.keys(DBBaseCommand.flags), 'info'].sort()
    expect(Object.keys(List.flags).sort()).toEqual(expectedFlags)
    expect(List.enableJsonFlag).toEqual(true)
  })
})

describe('run', () => {
  let command
  beforeEach(async () => {
    command = new List([])
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

      expect(stdout.output).toContain('Fetching collections...')
      expect(stdout.output).toContain('Collection Information:')
      expect(stdout.output).toContain('Total Collections: 3')
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
      expect(stdout.output).toContain('Collection Information:')
      expect(stdout.output).toContain('No collections found')
    })

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

  describe('successful collection info retrieval with --info flag', () => {
    test('returns full collection information without --json flag', async () => {
      command.argv = ['--info']
      await command.init()

      const collectionInfo = [
        { name: 'users', idIndex: { key: { _id: 1 }, name: '_id_' }, info: { readOnly: false } },
        { name: 'products', idIndex: { key: { _sku: 1 }, name: '_sku_' }, info: { readOnly: false } },
        { name: 'orders', idIndex: { key: { _orderId: -1 }, name: '_orderId_' }, info: { readOnly: false } }
      ]
      mockListCollections.mockResolvedValue(collectionInfo)

      const result = await command.run()

      expect(global.mockDBInstance.connect).toHaveBeenCalled()
      expect(mockListCollections).toHaveBeenCalled()
      expect(result).toEqual(collectionInfo)

      expect(stdout.output).toContain('Fetching collections...')
      expect(stdout.output).toContain('Collection Information:')
      expect(stdout.output).toContain('Namespace: test-namespace')
      expect(stdout.output).toContain('Total Collections: 3')
      expect(stdout.output).toContain('users')
      expect(stdout.output).toContain('products')
      expect(stdout.output).toContain('orders')
    })

    test('returns collection information with --json flag', async () => {
      command.argv = ['--info', '--json']
      await command.init()

      const collectionInfo = [
        { name: 'users', idIndex: { key: { _id: 1 }, name: '_id_' }, info: { readOnly: false } },
        { name: 'products', idIndex: { key: { _sku: 1 }, name: '_sku_' }, info: { readOnly: false } }
      ]
      mockListCollections.mockResolvedValue(collectionInfo)

      const result = await command.run()

      expect(result).toEqual(collectionInfo)

      // Should not show console messages with --json
      expect(stdout.output).not.toContain('Fetching collection info...')
      expect(stdout.output).not.toContain('Collection Information:')
      expect(stdout.output).not.toContain('Namespace:')
    })

    test('displays validator information when present', async () => {
      command.argv = ['--info']
      await command.init()

      const collectionInfo = [
        {
          name: 'users',
          idIndex: { key: { _id: 1 }, name: '_id_' },
          info: { readOnly: false },
          options: {
            validator: { $jsonSchema: { type: 'object' } },
            validationLevel: 'strict',
            validationAction: 'error'
          }
        }
      ]
      mockListCollections.mockResolvedValue(collectionInfo)

      const result = await command.run()

      expect(result).toEqual(collectionInfo)

      expect(stdout.output).toContain('validator')
      expect(stdout.output).toContain('validationLevel')
      expect(stdout.output).toContain('validationAction')
    })
  })

  describe('error handling', () => {
    test('connection error', async () => {
      command.argv = []
      await command.init()

      global.mockDBInstance.connect.mockRejectedValue(new Error('Connection failed'))

      await expect(command.run()).rejects.toThrow('Failed to fetch collections: Connection failed')

      expect(stdout.output).toContain('Error fetching collections')
      expect(stdout.output).toContain('Namespace: test-namespace')
      expect(stdout.output).toContain('Error: Connection failed')
    })

    test('listCollections error', async () => {
      command.argv = []
      await command.init()

      global.mockDBInstance.connect.mockResolvedValue({
        listCollections: mockListCollections
      })
      mockListCollections.mockRejectedValue(new Error('Query failed'))

      await expect(command.run()).rejects.toThrow('Failed to fetch collections: Query failed')

      expect(stdout.output).toContain('Error fetching collections')
      expect(stdout.output).toContain('Namespace: test-namespace')
      expect(stdout.output).toContain('Error: Query failed')
    })
  })
})
