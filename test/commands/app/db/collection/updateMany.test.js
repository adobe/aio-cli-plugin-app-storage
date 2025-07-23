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

import { UpdateMany } from '../../../../../src/commands/app/db/collection/updateMany.js'
import { expect, jest } from '@jest/globals'
import { stdout } from 'stdout-stderr'
import { DBBaseCommand } from '../../../../../src/DBBaseCommand.js'

// Use the global DB mock
const mockCollection = jest.fn()
const mockUpdateMany = jest.fn()

describe('prototype', () => {
  test('extends DBBaseCommand', () => {
    expect(UpdateMany.prototype instanceof DBBaseCommand).toBe(true)
  })
  test('args', () => {
    expect(Object.keys(UpdateMany.args)).toEqual(['collection', 'filter', 'update'])
    expect(UpdateMany.args.collection.required).toBe(true)
    expect(UpdateMany.args.filter.required).toBe(true)
    expect(UpdateMany.args.update.required).toBe(true)
  })
  test('flags', () => {
    const expectedFlags = Object.keys(DBBaseCommand.flags).concat(['upsert']).sort()
    expect(Object.keys(UpdateMany.flags).sort()).toEqual(expectedFlags)
    expect(UpdateMany.enableJsonFlag).toEqual(true)
  })
})

describe('run', () => {
  let command
  beforeEach(async () => {
    command = new UpdateMany(['users', '{"age": {"$lt": 30}}', '{"$set": {"status": "young"}}'])
    command.config = {
      runHook: jest.fn().mockResolvedValue({})
    }

    // Reset mocks
    mockCollection.mockReset()
    mockUpdateMany.mockReset()

    // Mock the db client connection
    global.mockDBInstance.connect = jest.fn().mockResolvedValue({
      collection: mockCollection
    })

    mockCollection.mockResolvedValue({
      updateMany: mockUpdateMany
    })
  })

  describe('successful document updates', () => {
    test('updates documents without --json flag', async () => {
      command.argv = ['users', '{"age": {"$lt": 30}}', '{"$set": {"status": "young"}}']
      await command.init()

      const mockResult = {
        matchedCount: 5,
        modifiedCount: 5,
        upsertedCount: 0,
        acknowledged: true
      }
      mockUpdateMany.mockResolvedValue(mockResult)

      const result = await command.run()

      expect(global.mockDBInstance.connect).toHaveBeenCalled()
      expect(mockCollection).toHaveBeenCalledWith('users')
      expect(mockUpdateMany).toHaveBeenCalledWith(
        { age: { $lt: 30 } },
        { $set: { status: 'young' } },
        {}
      )

      expect(result).toEqual({
        collection: 'users',
        status: 'updated',
        namespace: 'test-namespace',
        timestamp: expect.any(String),
        result: mockResult
      })

      expect(stdout.output).toContain("Updating documents in collection 'users'...")
      expect(stdout.output).toContain("Successfully updated documents in collection 'users'")
      expect(stdout.output).toContain('Collection: users')
      expect(stdout.output).toContain('Matched Count: 5')
      expect(stdout.output).toContain('Modified Count: 5')
      expect(stdout.output).toContain('Namespace: test-namespace')
      expect(stdout.output).toContain('Updated:')
    })

    test('updates documents with --json flag', async () => {
      command.argv = ['products', '{"category": "electronics"}', '{"$inc": {"price": 10}}', '--json']
      await command.init()

      const mockResult = {
        matchedCount: 3,
        modifiedCount: 3,
        upsertedCount: 0,
        acknowledged: true
      }
      mockUpdateMany.mockResolvedValue(mockResult)

      const result = await command.run()

      expect(result).toEqual({
        collection: 'products',
        status: 'updated',
        namespace: 'test-namespace',
        timestamp: expect.any(String),
        result: mockResult
      })

      // Should not show console messages with --json
      expect(stdout.output).not.toContain("Updating documents in collection 'products'...")
      expect(stdout.output).not.toContain("Successfully updated documents in collection 'products'")
      expect(stdout.output).not.toContain('Collection: products')
      expect(stdout.output).not.toContain('Namespace:')
    })

    test('updates documents with upsert flag', async () => {
      command.argv = ['inventory', '{"quantity": {"$lt": 5}}', '{"$set": {"lowStock": true}}', '--upsert']
      await command.init()

      const mockResult = {
        matchedCount: 2,
        modifiedCount: 2,
        upsertedCount: 0,
        acknowledged: true
      }
      mockUpdateMany.mockResolvedValue(mockResult)

      const result = await command.run()

      expect(mockUpdateMany).toHaveBeenCalledWith(
        { quantity: { $lt: 5 } },
        { $set: { lowStock: true } },
        { upsert: true }
      )

      expect(result).toEqual({
        collection: 'inventory',
        status: 'updated',
        namespace: 'test-namespace',
        timestamp: expect.any(String),
        options: { upsert: true },
        result: mockResult
      })

      expect(stdout.output).toContain("Successfully updated documents in collection 'inventory'")
      expect(stdout.output).toContain('Upsert enabled: Will create document if not found')
    })

    test('updates documents with upsert flag and creates new document', async () => {
      command.argv = ['logs', '{"level": "error"}', '{"$set": {"processed": true}}', '--upsert']
      await command.init()

      const mockResult = {
        matchedCount: 0,
        modifiedCount: 0,
        upsertedCount: 1,
        upsertedId: 'new-id-123',
        acknowledged: true
      }
      mockUpdateMany.mockResolvedValue(mockResult)

      const result = await command.run()

      expect(mockUpdateMany).toHaveBeenCalledWith(
        { level: 'error' },
        { $set: { processed: true } },
        { upsert: true }
      )

      expect(result).toEqual({
        collection: 'logs',
        status: 'updated',
        namespace: 'test-namespace',
        timestamp: expect.any(String),
        options: { upsert: true },
        result: mockResult
      })

      expect(stdout.output).toContain("No documents in collection 'logs' were found matching the filter, performed an upsert instead")
      expect(stdout.output).toContain('Upsert enabled: Will create document if not found')
      expect(stdout.output).toContain('Upserted ID: new-id-123')
    })

    test('updates documents with minimal result', async () => {
      command.argv = ['temp', '{"expired": true}', '{"$set": {"archived": true}}']
      await command.init()

      const mockResult = {
        matchedCount: 1,
        modifiedCount: 1
      }
      mockUpdateMany.mockResolvedValue(mockResult)

      const result = await command.run()

      expect(result).toEqual({
        collection: 'temp',
        status: 'updated',
        namespace: 'test-namespace',
        timestamp: expect.any(String),
        result: mockResult
      })

      expect(stdout.output).toContain("Successfully updated documents in collection 'temp'")
      expect(stdout.output).not.toContain('Upserted Count:')
    })
  })

  describe('argument validation', () => {
    test('fails when collection name is missing', async () => {
      command = new UpdateMany([])
      command.config = {
        runHook: jest.fn().mockResolvedValue({})
      }
      command.argv = []

      await expect(command.init()).rejects.toThrow('Missing 3 required args')

      expect(mockCollection).not.toHaveBeenCalled()
      expect(mockUpdateMany).not.toHaveBeenCalled()
    })

    test('fails when filter argument is missing', async () => {
      command = new UpdateMany(['users'])
      command.config = {
        runHook: jest.fn().mockResolvedValue({})
      }
      command.argv = ['users']

      await expect(command.init()).rejects.toThrow('Missing 2 required args')

      expect(mockCollection).not.toHaveBeenCalled()
      expect(mockUpdateMany).not.toHaveBeenCalled()
    })

    test('fails when update argument is missing', async () => {
      command = new UpdateMany(['users', '{"age": {"$lt": 30}}'])
      command.config = {
        runHook: jest.fn().mockResolvedValue({})
      }
      command.argv = ['users', '{"age": {"$lt": 30}}']

      await expect(command.init()).rejects.toThrow('Missing 1 required arg')

      expect(mockCollection).not.toHaveBeenCalled()
      expect(mockUpdateMany).not.toHaveBeenCalled()
    })

    test('fails when collection name is empty string', async () => {
      command = new UpdateMany(['', '{"age": {"$lt": 30}}', '{"$set": {"status": "young"}}'])
      command.config = {
        runHook: jest.fn().mockResolvedValue({})
      }
      command.argv = ['', '{"age": {"$lt": 30}}', '{"$set": {"status": "young"}}']

      await expect(async () => {
        await command.init()
        await command.run()
      }).rejects.toThrow('Collection name: Must be a non-empty string')

      expect(mockCollection).not.toHaveBeenCalled()
      expect(mockUpdateMany).not.toHaveBeenCalled()
    })

    test('fails when filter is empty string', async () => {
      command.argv = ['users', '', '{"$set": {"status": "young"}}']

      await expect(async () => {
        await command.init()
        await command.run()
      }).rejects.toThrow('Filter: Value \'\' is not a JSON object')

      expect(mockCollection).not.toHaveBeenCalled()
      expect(mockUpdateMany).not.toHaveBeenCalled()
    })

    test('fails when filter is not a JSON object', async () => {
      command.argv = ['users', '["age", "name"]', '{"$set": {"status": "young"}}']

      await expect(async () => {
        await command.init()
        await command.run()
      }).rejects.toThrow('Filter: Value \'["age", "name"]\' is not a JSON object')

      expect(mockCollection).not.toHaveBeenCalled()
      expect(mockUpdateMany).not.toHaveBeenCalled()
    })

    test('fails when update is empty string', async () => {
      command.argv = ['users', '{"age": {"$lt": 30}}', '']

      await expect(async () => {
        await command.init()
        await command.run()
      }).rejects.toThrow('Update: Value \'\' is not a JSON object')

      expect(mockCollection).not.toHaveBeenCalled()
      expect(mockUpdateMany).not.toHaveBeenCalled()
    })

    test('fails when update is not a JSON object', async () => {
      command.argv = ['users', '{"age": {"$lt": 30}}', '["$set", "status"]']

      await expect(async () => {
        await command.init()
        await command.run()
      }).rejects.toThrow('Update: Value \'["$set", "status"]\' is not a JSON object')

      expect(mockCollection).not.toHaveBeenCalled()
      expect(mockUpdateMany).not.toHaveBeenCalled()
    })
  })

  describe('error handling', () => {
    test('connection error without --json flag', async () => {
      command.argv = ['users', '{"age": {"$lt": 30}}', '{"$set": {"status": "young"}}']
      await command.init()

      global.mockDBInstance.connect.mockRejectedValue(new Error('Connection failed'))

      await expect(command.run()).rejects.toThrow("Failed to update documents in collection 'users': Connection failed")

      expect(stdout.output).toContain('Failed to update documents')
      expect(stdout.output).toContain('Collection: users')
      expect(stdout.output).toContain('Namespace: test-namespace')
      expect(stdout.output).toContain('Error: Connection failed')
    })

    test('connection error with --json flag', async () => {
      command.argv = ['users', '{"age": {"$lt": 30}}', '{"$set": {"status": "young"}}', '--json']
      await command.init()

      global.mockDBInstance.connect.mockRejectedValue(new Error('Connection failed'))

      await expect(command.run()).rejects.toThrow("Failed to update documents in collection 'users': Connection failed")

      // Should not show console messages with --json
      expect(stdout.output).not.toContain('Failed to update documents')
      expect(stdout.output).not.toContain('Collection: users')
      expect(stdout.output).not.toContain('Namespace:')
    })

    test('collection error', async () => {
      command.argv = ['users', '{"age": {"$lt": 30}}', '{"$set": {"status": "young"}}']
      await command.init()

      global.mockDBInstance.connect.mockResolvedValue({
        collection: mockCollection
      })
      mockCollection.mockRejectedValue(new Error('Collection not found'))

      await expect(command.run()).rejects.toThrow("Failed to update documents in collection 'users': Collection not found")

      expect(stdout.output).toContain('Failed to update documents')
      expect(stdout.output).toContain('Error: Collection not found')
    })

    test('updateMany error', async () => {
      command.argv = ['users', '{"age": {"$lt": 30}}', '{"$set": {"status": "young"}}']
      await command.init()

      global.mockDBInstance.connect.mockResolvedValue({
        collection: mockCollection
      })
      mockCollection.mockResolvedValue({
        updateMany: mockUpdateMany
      })
      mockUpdateMany.mockRejectedValue(new Error('Update failed'))

      await expect(command.run()).rejects.toThrow("Failed to update documents in collection 'users': Update failed")

      expect(stdout.output).toContain('Failed to update documents')
      expect(stdout.output).toContain('Error: Update failed')
    })

    test('authentication error', async () => {
      command.argv = ['users', '{"age": {"$lt": 30}}', '{"$set": {"status": "young"}}']
      await command.init()

      global.mockDBInstance.connect.mockRejectedValue(new Error('401 Unauthorized'))

      await expect(command.run()).rejects.toThrow("Failed to update documents in collection 'users': 401 Unauthorized")

      expect(stdout.output).toContain('Failed to update documents')
      expect(stdout.output).toContain('401 Unauthorized')
    })
  })
})
