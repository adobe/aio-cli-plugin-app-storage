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
import { DeleteOne } from '../../../../../src/commands/app/db/collection/deleteOne.js'
import { expect, jest } from '@jest/globals'
import { stdout } from 'stdout-stderr'
import { DBBaseCommand } from '../../../../../src/DBBaseCommand.js'

// Use the global DB mock and set up collection methods
const mockDeleteOne = jest.fn()
const mockCollection = {
  deleteOne: mockDeleteOne
}
const mockClient = {
  collection: jest.fn().mockReturnValue(mockCollection)
}
const mockConnect = global.mockDBInstance.connect

describe('prototype', () => {
  test('extends DBBaseCommand', () => {
    expect(DeleteOne.prototype instanceof DBBaseCommand).toBe(true)
  })

  test('args', () => {
    expect(Object.keys(DeleteOne.args)).toEqual(['collection', 'filter'])
    expect(DeleteOne.args.collection.required).toBe(true)
    expect(DeleteOne.args.filter.required).toBe(true)
  })

  test('flags', () => {
    const expectedFlags = Object.keys(DBBaseCommand.flags).sort()
    expect(Object.keys(DeleteOne.flags).sort()).toEqual(expectedFlags)
    expect(DeleteOne.enableJsonFlag).toEqual(true)
  })

  test('description', () => {
    expect(DeleteOne.description).toBe('Delete a single document from a collection')
  })

  test('examples', () => {
    expect(DeleteOne.examples).toBeDefined()
    expect(DeleteOne.examples.length).toBeGreaterThan(0)
  })
})

describe('run', () => {
  let command

  beforeEach(async () => {
    command = new DeleteOne(['users', '{"name": "John"}'])
    command.config = {
      runHook: jest.fn().mockResolvedValue({})
    }
    command.db = global.mockDBInstance
    command.rtNamespace = 'test-namespace'
    command.debugLogger = {
      info: jest.fn(),
      error: jest.fn()
    }

    // Reset mocks
    mockDeleteOne.mockReset()
    mockCollection.deleteOne = mockDeleteOne
    mockClient.collection.mockClear()
    mockConnect.mockClear()
    mockConnect.mockResolvedValue(mockClient)
  })

  describe('successful deletion', () => {
    test('deletes document successfully', async () => {
      await command.init()

      const deleteResult = {
        deletedCount: 1,
        acknowledged: true
      }
      mockDeleteOne.mockResolvedValue(deleteResult)

      const result = await command.run()

      expect(mockConnect).toHaveBeenCalled()
      expect(mockClient.collection).toHaveBeenCalledWith('users')
      expect(mockDeleteOne).toHaveBeenCalledWith({ name: 'John' })

      expect(result).toEqual({
        collection: 'users',
        filter: { name: 'John' },
        deletedCount: 1,
        acknowledged: true,
        namespace: 'test-namespace',
        timestamp: expect.any(String),
        result: deleteResult
      })

      expect(stdout.output).toContain('Deleting document from collection \'users\'...')
      expect(stdout.output).toContain('Document deleted successfully from collection \'users\'')
      expect(stdout.output).toContain('Namespace: test-namespace')
      expect(stdout.output).toContain('Deleted: 1')
    })

    test('handles no document found', async () => {
      await command.init()

      const deleteResult = {
        deletedCount: 0,
        acknowledged: true
      }
      mockDeleteOne.mockResolvedValue(deleteResult)

      const result = await command.run()

      expect(result.deletedCount).toBe(0)
      expect(stdout.output).toContain('No document found in collection \'users\' matching the filter')
    })

    test('deletes with complex filter', async () => {
      const complexFilter = {
        $and: [
          { age: { $gte: 18 } },
          { status: 'active' }
        ]
      }

      command.argv = ['users', JSON.stringify(complexFilter)]
      await command.init()

      const deleteResult = {
        deletedCount: 1,
        acknowledged: true
      }
      mockDeleteOne.mockResolvedValue(deleteResult)

      const result = await command.run()

      expect(mockDeleteOne).toHaveBeenCalledWith(complexFilter)
      expect(result.filter).toEqual(complexFilter)
    })
  })

  describe('error handling', () => {
    test('handles invalid JSON filter', async () => {
      command.argv = ['users', '{"invalid": json}']

      await expect(command.init()).rejects.toThrow('Invalid filter JSON:')
    })

    test('handles database connection error', async () => {
      await command.init()

      const error = new Error('Database connection failed')
      mockConnect.mockRejectedValue(error)

      await expect(command.run()).rejects.toThrow('Failed to delete document from collection \'users\': Database connection failed')

      expect(stdout.output).toContain('Failed to delete document')
      expect(stdout.output).toContain('Collection: users')
      expect(stdout.output).toContain('Namespace: test-namespace')
    })

    test('handles delete operation error', async () => {
      await command.init()

      const error = new Error('Delete operation failed')
      mockDeleteOne.mockRejectedValue(error)

      await expect(command.run()).rejects.toThrow('Failed to delete document from collection \'users\': Delete operation failed')

      expect(stdout.output).toContain('Failed to delete document')
    })

    test('handles permission error', async () => {
      await command.init()

      const error = new Error('Insufficient permissions')
      mockDeleteOne.mockRejectedValue(error)

      await expect(command.run()).rejects.toThrow('Failed to delete document from collection \'users\': Insufficient permissions')
    })
  })

  describe('JSON parsing', () => {
    test('parses simple JSON filter', async () => {
      command.argv = ['products', '{"category": "electronics"}']
      await command.init()

      const deleteResult = {
        deletedCount: 1,
        acknowledged: true
      }
      mockDeleteOne.mockResolvedValue(deleteResult)

      const result = await command.run()

      expect(result.filter).toEqual({ category: 'electronics' })
    })

    test('parses JSON with operators', async () => {
      const operatorFilter = {
        price: { $lt: 100 },
        stock: { $gt: 0 }
      }

      command.argv = ['products', JSON.stringify(operatorFilter)]
      await command.init()

      const deleteResult = {
        deletedCount: 1,
        acknowledged: true
      }
      mockDeleteOne.mockResolvedValue(deleteResult)

      const result = await command.run()

      expect(result.filter).toEqual(operatorFilter)
    })

    test('handles malformed JSON', async () => {
      command.argv = ['users', '{"name": "John", "age":}']

      await expect(command.init()).rejects.toThrow('Invalid filter JSON:')
    })

    test('handles empty JSON object', async () => {
      command.argv = ['users', '{}']
      await command.init()

      const deleteResult = {
        deletedCount: 1,
        acknowledged: true
      }
      mockDeleteOne.mockResolvedValue(deleteResult)

      const result = await command.run()

      expect(result.filter).toEqual({})
    })
  })

  describe('console output', () => {
    test('displays proper console output for successful deletion', async () => {
      await command.init()

      const deleteResult = {
        deletedCount: 1,
        acknowledged: true
      }
      mockDeleteOne.mockResolvedValue(deleteResult)

      await command.run()

      expect(stdout.output).toContain('Deleting document from collection \'users\'...')
      expect(stdout.output).toContain('Document deleted successfully from collection \'users\'')
      expect(stdout.output).toContain('Namespace: test-namespace')
      expect(stdout.output).toContain('Deleted: 1')
      expect(stdout.output).toContain('Deleted:')
    })

    test('displays proper console output when no document found', async () => {
      await command.init()

      const deleteResult = {
        deletedCount: 0,
        acknowledged: true
      }
      mockDeleteOne.mockResolvedValue(deleteResult)

      await command.run()

      expect(stdout.output).toContain('No document found in collection \'users\' matching the filter')
      expect(stdout.output).toContain('Namespace: test-namespace')
    })
  })

  describe('JSON flag', () => {
    test('suppresses console output with --json flag', async () => {
      command.argv = ['users', '{"name": "John"}', '--json']
      await command.init()

      const deleteResult = {
        deletedCount: 1,
        acknowledged: true
      }
      mockDeleteOne.mockResolvedValue(deleteResult)

      const result = await command.run()

      expect(result.deletedCount).toBe(1)
      // Should not show console messages with --json
      expect(stdout.output).not.toContain('Deleting document from collection')
      expect(stdout.output).not.toContain('Document deleted successfully')
    })
  })

  describe('timestamp', () => {
    test('includes ISO timestamp in result', async () => {
      await command.init()

      const deleteResult = {
        deletedCount: 1,
        acknowledged: true
      }
      mockDeleteOne.mockResolvedValue(deleteResult)

      const result = await command.run()

      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)

      // Verify it's a recent timestamp
      const timestamp = new Date(result.timestamp)
      const now = new Date()
      expect(Math.abs(now.getTime() - timestamp.getTime())).toBeLessThan(5000) // Within 5 seconds
    })
  })
})
