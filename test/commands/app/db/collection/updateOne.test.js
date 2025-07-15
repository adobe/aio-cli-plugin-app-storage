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
import { UpdateOne } from '../../../../../src/commands/app/db/collection/updateOne.js'
import { expect, jest } from '@jest/globals'
import { stdout } from 'stdout-stderr'
import { DBBaseCommand } from '../../../../../src/DBBaseCommand.js'

// Use the global DB mock and set up collection methods
const mockUpdateOne = jest.fn()
const mockCollection = {
  updateOne: mockUpdateOne
}
const mockClient = {
  collection: jest.fn().mockReturnValue(mockCollection)
}
const mockConnect = global.mockDBInstance.connect

describe('prototype', () => {
  test('extends DBBaseCommand', () => {
    expect(UpdateOne.prototype instanceof DBBaseCommand).toBe(true)
  })

  test('args', () => {
    expect(Object.keys(UpdateOne.args)).toEqual(['collection', 'filter', 'update'])
    expect(UpdateOne.args.collection.required).toBe(true)
    expect(UpdateOne.args.filter.required).toBe(true)
    expect(UpdateOne.args.update.required).toBe(true)
  })

  test('flags', () => {
    const expectedFlags = Object.keys(DBBaseCommand.flags).concat(['upsert']).sort()
    expect(Object.keys(UpdateOne.flags).sort()).toEqual(expectedFlags)
    expect(UpdateOne.flags.upsert.char).toBe('u')
    expect(UpdateOne.flags.upsert.default).toBe(false)
    expect(UpdateOne.enableJsonFlag).toEqual(true)
  })

  test('description', () => {
    expect(UpdateOne.description).toBe('Update a single document in a collection')
  })

  test('examples', () => {
    expect(UpdateOne.examples).toBeDefined()
    expect(UpdateOne.examples.length).toBeGreaterThan(0)
  })
})

describe('run', () => {
  let command

  beforeEach(async () => {
    command = new UpdateOne(['users', '{"name": "John"}', '{"$set": {"age": 31}}'])
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
    mockUpdateOne.mockReset()
    mockCollection.updateOne = mockUpdateOne
    mockClient.collection.mockClear()
    mockConnect.mockClear()
    mockConnect.mockResolvedValue(mockClient)
  })

  describe('successful update', () => {
    test('updates document successfully', async () => {
      await command.init()

      const updateResult = {
        matchedCount: 1,
        modifiedCount: 1,
        acknowledged: true,
        upsertedId: null,
        upsertedCount: 0
      }
      mockUpdateOne.mockResolvedValue(updateResult)

      const result = await command.run()

      expect(mockConnect).toHaveBeenCalled()
      expect(mockClient.collection).toHaveBeenCalledWith('users')
      expect(mockUpdateOne).toHaveBeenCalledWith({ name: 'John' }, { $set: { age: 31 } }, {})

      expect(result).toEqual({
        collection: 'users',
        filter: { name: 'John' },
        update: { $set: { age: 31 } },
        matchedCount: 1,
        modifiedCount: 1,
        acknowledged: true,
        upsertedId: null,
        upsertedCount: 0,
        namespace: 'test-namespace',
        timestamp: expect.any(String),
        result: updateResult
      })

      expect(stdout.output).toContain('Updating document in collection \'users\'...')
      expect(stdout.output).toContain('Document updated successfully in collection \'users\'')
      expect(stdout.output).toContain('Namespace: test-namespace')
      expect(stdout.output).toContain('Matched: 1')
      expect(stdout.output).toContain('Modified: 1')
      expect(stdout.output).toContain('Acknowledged: true')
    })

    test('updates with upsert flag', async () => {
      command.argv = ['users', '{"name": "John"}', '{"$set": {"age": 31}}', '--upsert']
      await command.init()

      const updateResult = {
        matchedCount: 0,
        modifiedCount: 0,
        acknowledged: true,
        upsertedId: '507f1f77bcf86cd799439011',
        upsertedCount: 1
      }
      mockUpdateOne.mockResolvedValue(updateResult)

      const result = await command.run()

      expect(mockUpdateOne).toHaveBeenCalledWith(
        { name: 'John' },
        { $set: { age: 31 } },
        { upsert: true }
      )

      expect(result.upsertedId).toBe('507f1f77bcf86cd799439011')
      expect(result.upsertedCount).toBe(1)
      expect(stdout.output).toContain('Upsert enabled: Will create document if not found')
      expect(stdout.output).toContain('Document created (upserted) in collection \'users\'')
      expect(stdout.output).toContain('Upserted ID: 507f1f77bcf86cd799439011')
      expect(stdout.output).toContain('Upserted count: 1')
    })

    test('handles no document found without upsert', async () => {
      await command.init()

      const updateResult = {
        matchedCount: 0,
        modifiedCount: 0,
        acknowledged: true,
        upsertedId: null,
        upsertedCount: 0
      }
      mockUpdateOne.mockResolvedValue(updateResult)

      const result = await command.run()

      expect(result.matchedCount).toBe(0)
      expect(result.modifiedCount).toBe(0)
      expect(stdout.output).toContain('No document found in collection \'users\' matching the filter')
      expect(stdout.output).toContain('Matched: 0')
      expect(stdout.output).toContain('Modified: 0')
    })

    test('updates with complex filter and update', async () => {
      const complexFilter = {
        $and: [
          { age: { $gte: 18 } },
          { status: 'active' }
        ]
      }
      const complexUpdate = {
        $set: { lastLogin: '2024-01-01T00:00:00.000Z' },
        $inc: { loginCount: 1 }
      }

      command.argv = ['users', JSON.stringify(complexFilter), JSON.stringify(complexUpdate)]
      await command.init()

      const updateResult = {
        matchedCount: 1,
        modifiedCount: 1,
        acknowledged: true,
        upsertedId: null,
        upsertedCount: 0
      }
      mockUpdateOne.mockResolvedValue(updateResult)

      const result = await command.run()

      expect(mockUpdateOne).toHaveBeenCalledWith(complexFilter, complexUpdate, {})
      expect(result.filter).toEqual(complexFilter)
      expect(result.update).toEqual(complexUpdate)
    })
  })

  describe('error handling', () => {
    test('handles invalid JSON filter', async () => {
      command.argv = ['users', '{"invalid": json}', '{"$set": {"age": 31}}']
      await command.init()

      await expect(command.run()).rejects.toThrow('Invalid filter JSON:')
    })

    test('handles invalid JSON update', async () => {
      command.argv = ['users', '{"name": "John"}', '{"$set": invalid}']
      await command.init()

      await expect(command.run()).rejects.toThrow('Invalid update JSON:')
    })

    test('handles database connection error', async () => {
      await command.init()

      const error = new Error('Database connection failed')
      mockConnect.mockRejectedValue(error)

      await expect(command.run()).rejects.toThrow('Failed to update document in collection \'users\': Database connection failed')

      expect(stdout.output).toContain('Failed to update document')
      expect(stdout.output).toContain('Collection: users')
      expect(stdout.output).toContain('Namespace: test-namespace')
      expect(stdout.output).toContain('Error: Database connection failed')
    })

    test('handles update operation error', async () => {
      await command.init()

      const error = new Error('Update operation failed')
      mockUpdateOne.mockRejectedValue(error)

      await expect(command.run()).rejects.toThrow('Failed to update document in collection \'users\': Update operation failed')

      expect(stdout.output).toContain('Failed to update document')
      expect(stdout.output).toContain('Error: Update operation failed')
    })

    test('handles validation error', async () => {
      await command.init()

      const error = new Error('Document validation failed')
      mockUpdateOne.mockRejectedValue(error)

      await expect(command.run()).rejects.toThrow('Failed to update document in collection \'users\': Document validation failed')
    })
  })

  describe('JSON parsing', () => {
    test('parses simple JSON filter and update', async () => {
      command.argv = ['products', '{"category": "electronics"}', '{"$set": {"discount": 0.1}}']
      await command.init()

      const updateResult = {
        matchedCount: 1,
        modifiedCount: 1,
        acknowledged: true,
        upsertedId: null,
        upsertedCount: 0
      }
      mockUpdateOne.mockResolvedValue(updateResult)

      const result = await command.run()

      expect(result.filter).toEqual({ category: 'electronics' })
      expect(result.update).toEqual({ $set: { discount: 0.1 } })
    })

    test('parses JSON with various update operators', async () => {
      const updateOps = {
        $set: { name: 'Updated Name' },
        $inc: { count: 1 },
        $unset: { oldField: '' },
        $push: { tags: 'new-tag' }
      }

      command.argv = ['products', '{"_id": "123"}', JSON.stringify(updateOps)]
      await command.init()

      const updateResult = {
        matchedCount: 1,
        modifiedCount: 1,
        acknowledged: true,
        upsertedId: null,
        upsertedCount: 0
      }
      mockUpdateOne.mockResolvedValue(updateResult)

      const result = await command.run()

      expect(result.update).toEqual(updateOps)
    })

    test('handles malformed JSON filter', async () => {
      command.argv = ['users', '{"name": "John", "age":}', '{"$set": {"age": 31}}']
      await command.init()

      await expect(command.run()).rejects.toThrow('Invalid filter JSON:')
    })

    test('handles malformed JSON update', async () => {
      command.argv = ['users', '{"name": "John"}', '{"$set": {"age":}}']
      await command.init()

      await expect(command.run()).rejects.toThrow('Invalid update JSON:')
    })

    test('handles empty JSON objects', async () => {
      command.argv = ['users', '{}', '{"$set": {"updated": true}}']
      await command.init()

      const updateResult = {
        matchedCount: 1,
        modifiedCount: 1,
        acknowledged: true,
        upsertedId: null,
        upsertedCount: 0
      }
      mockUpdateOne.mockResolvedValue(updateResult)

      const result = await command.run()

      expect(result.filter).toEqual({})
      expect(result.update).toEqual({ $set: { updated: true } })
    })
  })

  describe('console output', () => {
    test('displays proper console output for successful update', async () => {
      await command.init()

      const updateResult = {
        matchedCount: 1,
        modifiedCount: 1,
        acknowledged: true,
        upsertedId: null,
        upsertedCount: 0
      }
      mockUpdateOne.mockResolvedValue(updateResult)

      await command.run()

      expect(stdout.output).toContain('Updating document in collection \'users\'...')
      expect(stdout.output).toContain('Document updated successfully in collection \'users\'')
      expect(stdout.output).toContain('Namespace: test-namespace')
      expect(stdout.output).toContain('Matched: 1')
      expect(stdout.output).toContain('Modified: 1')
      expect(stdout.output).toContain('Acknowledged: true')
      expect(stdout.output).toContain('Updated:')
    })

    test('displays proper console output for upsert', async () => {
      command.argv = ['users', '{"name": "John"}', '{"$set": {"age": 31}}', '--upsert']
      await command.init()

      const updateResult = {
        matchedCount: 0,
        modifiedCount: 0,
        acknowledged: true,
        upsertedId: '507f1f77bcf86cd799439011',
        upsertedCount: 1
      }
      mockUpdateOne.mockResolvedValue(updateResult)

      await command.run()

      expect(stdout.output).toContain('Upsert enabled: Will create document if not found')
      expect(stdout.output).toContain('Document created (upserted) in collection \'users\'')
      expect(stdout.output).toContain('Upserted ID: 507f1f77bcf86cd799439011')
      expect(stdout.output).toContain('Upserted count: 1')
    })

    test('displays proper console output when no document found', async () => {
      await command.init()

      const updateResult = {
        matchedCount: 0,
        modifiedCount: 0,
        acknowledged: true,
        upsertedId: null,
        upsertedCount: 0
      }
      mockUpdateOne.mockResolvedValue(updateResult)

      await command.run()

      expect(stdout.output).toContain('No document found in collection \'users\' matching the filter')
      expect(stdout.output).toContain('Matched: 0')
      expect(stdout.output).toContain('Modified: 0')
    })

    test('does not display upsert message when flag is not used', async () => {
      await command.init()

      const updateResult = {
        matchedCount: 1,
        modifiedCount: 1,
        acknowledged: true,
        upsertedId: null,
        upsertedCount: 0
      }
      mockUpdateOne.mockResolvedValue(updateResult)

      await command.run()

      expect(stdout.output).not.toContain('Upsert enabled')
    })
  })

  describe('JSON flag', () => {
    test('suppresses console output with --json flag', async () => {
      command.argv = ['users', '{"name": "John"}', '{"$set": {"age": 31}}', '--json']
      await command.init()

      const updateResult = {
        matchedCount: 1,
        modifiedCount: 1,
        acknowledged: true,
        upsertedId: null,
        upsertedCount: 0
      }
      mockUpdateOne.mockResolvedValue(updateResult)

      const result = await command.run()

      expect(result.matchedCount).toBe(1)
      expect(result.modifiedCount).toBe(1)
      // Should not show console messages with --json
      expect(stdout.output).not.toContain('Updating document in collection')
      expect(stdout.output).not.toContain('Document updated successfully')
    })
  })

  describe('timestamp', () => {
    test('includes ISO timestamp in result', async () => {
      await command.init()

      const updateResult = {
        matchedCount: 1,
        modifiedCount: 1,
        acknowledged: true,
        upsertedId: null,
        upsertedCount: 0
      }
      mockUpdateOne.mockResolvedValue(updateResult)

      const result = await command.run()

      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)

      // Verify it's a recent timestamp
      const timestamp = new Date(result.timestamp)
      const now = new Date()
      expect(Math.abs(now.getTime() - timestamp.getTime())).toBeLessThan(5000) // Within 5 seconds
    })
  })
})
