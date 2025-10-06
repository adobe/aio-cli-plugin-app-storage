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

import { InsertMany } from '../../../../../src/commands/app/db/collection/insertMany.js'
import { expect, jest } from '@jest/globals'
import { stdout } from 'stdout-stderr'
import { DBBaseCommand } from '../../../../../src/DBBaseCommand.js'

// Use the global DB mock
const mockCollection = jest.fn()
const mockInsertMany = jest.fn()

describe('prototype', () => {
  test('extends DBBaseCommand', () => {
    expect(InsertMany.prototype instanceof DBBaseCommand).toBe(true)
  })
  test('args', () => {
    expect(Object.keys(InsertMany.args)).toEqual(['collection', 'documents'])
    expect(InsertMany.args.collection.required).toBe(true)
    expect(InsertMany.args.documents.required).toBe(true)
  })
  test('flags', () => {
    const expectedFlags = Object.keys(DBBaseCommand.flags).concat(['bypassDocumentValidation']).sort()
    expect(Object.keys(InsertMany.flags).sort()).toEqual(expectedFlags)
    expect(InsertMany.enableJsonFlag).toEqual(true)
  })
})

describe('run', () => {
  let command
  beforeEach(async () => {
    command = new InsertMany(['users', '[{"name": "John", "age": 30}]'])
    command.config = {
      runHook: jest.fn().mockResolvedValue({})
    }

    // Reset mocks
    mockCollection.mockReset()
    mockInsertMany.mockReset()

    // Mock the db client connection
    global.mockDBInstance.connect = jest.fn().mockResolvedValue({
      collection: mockCollection
    })

    mockCollection.mockResolvedValue({
      insertMany: mockInsertMany
    })
  })

  describe('successful document insertion', () => {
    test('inserts documents without --json flag', async () => {
      command.argv = ['users', '[{"name": "John", "age": 30}, {"name": "Jane", "age": 25}]']
      await command.init()

      const mockResult = {
        insertedCount: 2,
        insertedIds: { 0: 'id1', 1: 'id2' },
        acknowledged: true
      }
      mockInsertMany.mockResolvedValue(mockResult)

      const result = await command.run()

      expect(global.mockDBInstance.connect).toHaveBeenCalled()
      expect(mockCollection).toHaveBeenCalledWith('users')
      expect(mockInsertMany).toHaveBeenCalledWith([
        { name: 'John', age: 30 },
        { name: 'Jane', age: 25 }
      ], {})

      expect(result).toEqual({
        collection: 'users',
        status: 'inserted',
        namespace: 'test-namespace',
        timestamp: expect.any(String),
        result: mockResult
      })

      expect(stdout.output).toContain("Inserting 2 documents into collection 'users'...")
      expect(stdout.output).toContain("Successfully inserted 2 documents into collection 'users'")
      expect(stdout.output).toContain('Collection: users')
      expect(stdout.output).toContain('Namespace: test-namespace')
      expect(stdout.output).toContain('Inserted IDs: {"0":"id1","1":"id2"}')
      expect(stdout.output).toContain('Inserted:')
    })

    test('inserts documents with --json flag', async () => {
      command.argv = ['products', '[{"id": 1, "name": "Product A"}]', '--json']
      await command.init()

      const mockResult = {
        insertedCount: 1,
        insertedIds: { 0: 'id1' },
        acknowledged: true
      }
      mockInsertMany.mockResolvedValue(mockResult)

      const result = await command.run()

      expect(result).toEqual({
        collection: 'products',
        status: 'inserted',
        namespace: 'test-namespace',
        timestamp: expect.any(String),
        result: mockResult
      })

      // Should not show console messages with --json
      expect(stdout.output).not.toContain("Inserting 1 documents into collection 'products'...")
      expect(stdout.output).not.toContain("Successfully inserted 1 documents into collection 'products'")
      expect(stdout.output).not.toContain('Collection: products')
      expect(stdout.output).not.toContain('Namespace:')
    })

    test('inserts documents with minimal result', async () => {
      command.argv = ['logs', '[{"level": "info", "message": "test"}]']
      await command.init()

      const mockResult = {
        insertedCount: 1
      }
      mockInsertMany.mockResolvedValue(mockResult)

      const result = await command.run()

      expect(result).toEqual({
        collection: 'logs',
        status: 'inserted',
        namespace: 'test-namespace',
        timestamp: expect.any(String),
        result: mockResult
      })

      expect(stdout.output).toContain("Successfully inserted 1 documents into collection 'logs'")
      expect(stdout.output).not.toContain('Inserted IDs:')
    })

    test('inserts documents with bypassDocumentValidation flag', async () => {
      command.argv = ['temp', '[{"data": "test"}]', '--bypassDocumentValidation']
      await command.init()

      const mockResult = {
        insertedCount: 1,
        insertedIds: { 0: 'id1' },
        acknowledged: true
      }
      mockInsertMany.mockResolvedValue(mockResult)

      const result = await command.run()

      expect(mockInsertMany).toHaveBeenCalledWith(
        [{ data: 'test' }],
        { bypassDocumentValidation: true }
      )

      expect(result).toEqual({
        collection: 'temp',
        status: 'inserted',
        namespace: 'test-namespace',
        timestamp: expect.any(String),
        options: { bypassDocumentValidation: true },
        result: mockResult
      })

      expect(stdout.output).toContain("Successfully inserted 1 documents into collection 'temp'")
      expect(stdout.output).toContain('Bypassing document validation')
    })

    test('inserts documents with bypassDocumentValidation flag only', async () => {
      command.argv = ['bulk', '[{"field": "value"}]', '--bypassDocumentValidation']
      await command.init()

      const mockResult = {
        insertedCount: 1,
        insertedIds: { 0: 'id1' },
        acknowledged: true
      }
      mockInsertMany.mockResolvedValue(mockResult)

      const result = await command.run()

      expect(mockInsertMany).toHaveBeenCalledWith(
        [{ field: 'value' }],
        { bypassDocumentValidation: true }
      )

      expect(result).toEqual({
        collection: 'bulk',
        status: 'inserted',
        namespace: 'test-namespace',
        timestamp: expect.any(String),
        options: { bypassDocumentValidation: true },
        result: mockResult
      })

      expect(stdout.output).toContain("Successfully inserted 1 documents into collection 'bulk'")
      expect(stdout.output).toContain('Bypassing document validation')
    })
  })

  describe('argument validation', () => {
    test('fails when collection name is missing', async () => {
      command = new InsertMany([])
      command.config = {
        runHook: jest.fn().mockResolvedValue({})
      }
      command.argv = []

      await expect(command.init()).rejects.toThrow('Missing 2 required args')

      expect(mockCollection).not.toHaveBeenCalled()
      expect(mockInsertMany).not.toHaveBeenCalled()
    })

    test('fails when documents argument is missing', async () => {
      command = new InsertMany(['users'])
      command.config = {
        runHook: jest.fn().mockResolvedValue({})
      }
      command.argv = ['users']

      await expect(command.init()).rejects.toThrow('Missing 1 required arg')

      expect(mockCollection).not.toHaveBeenCalled()
      expect(mockInsertMany).not.toHaveBeenCalled()
    })

    test('fails when collection name is empty string', async () => {
      command = new InsertMany(['', '[{"name": "John"}]'])
      command.config = {
        runHook: jest.fn().mockResolvedValue({})
      }
      command.argv = ['', '[{"name": "John"}]']

      await expect(async () => {
        await command.init()
        await command.run()
      }).rejects.toThrow('Collection name: Must be a non-empty string')

      expect(mockCollection).not.toHaveBeenCalled()
      expect(mockInsertMany).not.toHaveBeenCalled()
    })

    test('fails when documents is empty string', async () => {
      command.argv = ['users', '']

      await expect(async () => {
        await command.init()
        await command.run()
      }).rejects.toThrow('Documents: Must be a non-empty JSON array string')

      expect(mockCollection).not.toHaveBeenCalled()
      expect(mockInsertMany).not.toHaveBeenCalled()
    })

    test('fails when documents is not valid JSON', async () => {
      command.argv = ['users', '["John"']

      await expect(async () => {
        await command.init()
        await command.run()
      }).rejects.toThrow('Documents: JSON parse error:')

      expect(mockCollection).not.toHaveBeenCalled()
      expect(mockInsertMany).not.toHaveBeenCalled()
    })

    test('fails when documents is not a JSON array', async () => {
      command.argv = ['users', '{"name": "John"}']

      await expect(async () => {
        await command.init()
        await command.run()
      }).rejects.toThrow('Documents: Must be a JSON array')

      expect(mockCollection).not.toHaveBeenCalled()
      expect(mockInsertMany).not.toHaveBeenCalled()
    })

    test('fails when documents array is empty', async () => {
      command.argv = ['users', '[]']

      await expect(async () => {
        await command.init()
        await command.run()
      }).rejects.toThrow('Documents: Array cannot be empty')

      expect(mockCollection).not.toHaveBeenCalled()
      expect(mockInsertMany).not.toHaveBeenCalled()
    })

    test('fails when documents array contains non-objects', async () => {
      command.argv = ['users', '[{"name": "John"}, "not an object"]']

      await expect(async () => {
        await command.init()
        await command.run()
      }).rejects.toThrow('Documents: Element at index 1 must be an object')

      expect(mockCollection).not.toHaveBeenCalled()
      expect(mockInsertMany).not.toHaveBeenCalled()
    })

    test('fails when documents array contains null', async () => {
      command.argv = ['users', '[{"name": "John"}, null]']

      await expect(async () => {
        await command.init()
        await command.run()
      }).rejects.toThrow('Documents: Element at index 1 must be an object')

      expect(mockCollection).not.toHaveBeenCalled()
      expect(mockInsertMany).not.toHaveBeenCalled()
    })

    test('fails when documents array contains nested arrays', async () => {
      command.argv = ['users', '[{"name": "John"}, [1, 2, 3]]']

      await expect(async () => {
        await command.init()
        await command.run()
      }).rejects.toThrow('Documents: Element at index 1 must be an object')

      expect(mockCollection).not.toHaveBeenCalled()
      expect(mockInsertMany).not.toHaveBeenCalled()
    })
  })

  describe('error handling', () => {
    test('connection error without --json flag', async () => {
      command.argv = ['users', '[{"name": "John"}]']
      await command.init()

      global.mockDBInstance.connect.mockRejectedValue(new Error('Connection failed'))

      await expect(command.run()).rejects.toThrow("Failed to insert documents into collection 'users': Connection failed")

      expect(stdout.output).toContain('Failed to insert documents')
      expect(stdout.output).toContain('Collection: users')
      expect(stdout.output).toContain('Namespace: test-namespace')
      expect(stdout.output).toContain('Error: Connection failed')
    })

    test('connection error with --json flag', async () => {
      command.argv = ['users', '[{"name": "John"}]', '--json']
      await command.init()

      global.mockDBInstance.connect.mockRejectedValue(new Error('Connection failed'))

      await expect(command.run()).rejects.toThrow("Failed to insert documents into collection 'users': Connection failed")

      // Should not show console messages with --json
      expect(stdout.output).not.toContain('Failed to insert documents')
      expect(stdout.output).not.toContain('Collection: users')
      expect(stdout.output).not.toContain('Namespace:')
    })

    test('collection error', async () => {
      command.argv = ['users', '[{"name": "John"}]']
      await command.init()

      global.mockDBInstance.connect.mockResolvedValue({
        collection: mockCollection
      })
      mockCollection.mockRejectedValue(new Error('Collection not found'))

      await expect(command.run()).rejects.toThrow("Failed to insert documents into collection 'users': Collection not found")

      expect(stdout.output).toContain('Failed to insert documents')
      expect(stdout.output).toContain('Error: Collection not found')
    })

    test('insertMany error', async () => {
      command.argv = ['users', '[{"name": "John"}]']
      await command.init()

      global.mockDBInstance.connect.mockResolvedValue({
        collection: mockCollection
      })
      mockCollection.mockResolvedValue({
        insertMany: mockInsertMany
      })
      mockInsertMany.mockRejectedValue(new Error('Insert failed'))

      await expect(command.run()).rejects.toThrow("Failed to insert documents into collection 'users': Insert failed")

      expect(stdout.output).toContain('Failed to insert documents')
      expect(stdout.output).toContain('Error: Insert failed')
    })

    test('authentication error', async () => {
      command.argv = ['users', '[{"name": "John"}]']
      await command.init()

      global.mockDBInstance.connect.mockRejectedValue(new Error('401 Unauthorized'))

      await expect(command.run()).rejects.toThrow("Failed to insert documents into collection 'users': 401 Unauthorized")

      expect(stdout.output).toContain('Failed to insert documents')
      expect(stdout.output).toContain('401 Unauthorized')
    })
  })
})
