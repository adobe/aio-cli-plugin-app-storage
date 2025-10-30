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
import { Replace } from '../../../../../src/commands/app/db/document/replace.js'
import { expect, jest } from '@jest/globals'
import { stdout } from 'stdout-stderr'
import { DBBaseCommand } from '../../../../../src/DBBaseCommand.js'

// Use the global DB mock and set up collection methods
const mockReplaceOne = jest.fn()
const mockCollection = {
  replaceOne: mockReplaceOne
}
const mockClient = {
  collection: jest.fn().mockReturnValue(mockCollection)
}
const mockConnect = global.mockDBInstance.connect

describe('prototype', () => {
  test('extends DBBaseCommand', () => {
    expect(Replace.prototype instanceof DBBaseCommand).toBe(true)
  })

  test('args', () => {
    expect(Object.keys(Replace.args)).toEqual(['collection', 'filter', 'replacement'])
    expect(Replace.args.collection.required).toBe(true)
    expect(Replace.args.filter.required).toBe(true)
    expect(Replace.args.replacement.required).toBe(true)
  })

  test('flags', () => {
    const expectedFlags = Object.keys(DBBaseCommand.flags).concat(['upsert']).sort()
    expect(Object.keys(Replace.flags).sort()).toEqual(expectedFlags)
    expect(Replace.flags.upsert.char).toBe('u')
    expect(Replace.flags.upsert.default).toBe(false)
    expect(Replace.enableJsonFlag).toEqual(true)
  })

  test('description', () => {
    expect(Replace.description).toBe('Replace a single document in a collection')
  })

  test('examples', () => {
    expect(Replace.examples).toBeDefined()
    expect(Replace.examples.length).toBeGreaterThan(0)
  })
})

describe('run', () => {
  let command

  beforeEach(async () => {
    command = new Replace(['users', '{"name": "John"}', '{"name": "John Doe", "age": 30, "status": "active"}'])
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
    mockReplaceOne.mockReset()
    mockCollection.replaceOne = mockReplaceOne
    mockClient.collection.mockClear()
    mockConnect.mockClear()
    mockConnect.mockResolvedValue(mockClient)
  })

  describe('successful replacement', () => {
    test('replaces document successfully', async () => {
      await command.init()

      const replaceResult = {
        matchedCount: 1,
        modifiedCount: 1,
        acknowledged: true,
        upsertedId: null,
        upsertedCount: 0
      }
      mockReplaceOne.mockResolvedValue(replaceResult)

      const result = await command.run()

      expect(mockConnect).toHaveBeenCalled()
      expect(mockClient.collection).toHaveBeenCalledWith('users')
      expect(mockReplaceOne).toHaveBeenCalledWith(
        { name: 'John' },
        { name: 'John Doe', age: 30, status: 'active' },
        {}
      )

      expect(result).toEqual({
        collection: 'users',
        filter: { name: 'John' },
        replacement: { name: 'John Doe', age: 30, status: 'active' },
        namespace: 'test-namespace',
        timestamp: expect.any(String),
        result: replaceResult
      })

      expect(stdout.output).toContain('Replacing document in collection \'users\'...')
      expect(stdout.output).toContain('Document replaced successfully in collection \'users\'')
      expect(stdout.output).toContain('Namespace: test-namespace')
    })

    test('replaces with upsert flag', async () => {
      command.argv = ['users', '{"name": "John"}', '{"name": "John Doe", "age": 30}', '--upsert']
      await command.init()

      const replaceResult = {
        matchedCount: 0,
        modifiedCount: 0,
        acknowledged: true,
        upsertedId: '507f1f77bcf86cd799439011',
        upsertedCount: 1
      }
      mockReplaceOne.mockResolvedValue(replaceResult)

      const result = await command.run()

      expect(mockReplaceOne).toHaveBeenCalledWith(
        { name: 'John' },
        { name: 'John Doe', age: 30 },
        { upsert: true }
      )

      expect(result.result.upsertedId).toBe('507f1f77bcf86cd799439011')
      expect(result.result.upsertedCount).toBe(1)
      expect(stdout.output).toContain('Upsert enabled: Will create document if not found')
      expect(stdout.output).toContain('Document created (upserted) in collection \'users\'')
      expect(stdout.output).toContain('Upserted ID: 507f1f77bcf86cd799439011')
      expect(stdout.output).toContain('Upserted count: 1')
    })

    test('handles no document found without upsert', async () => {
      await command.init()

      const replaceResult = {
        matchedCount: 0,
        modifiedCount: 0,
        acknowledged: true,
        upsertedId: null,
        upsertedCount: 0
      }
      mockReplaceOne.mockResolvedValue(replaceResult)

      const result = await command.run()

      expect(result.result.matchedCount).toBe(0)
      expect(result.result.modifiedCount).toBe(0)
      expect(stdout.output).toContain('No document found in collection \'users\' matching the filter')
    })

    test('replaces with complex filter and replacement', async () => {
      const complexFilter = {
        $and: [
          { age: { $gte: 18 } },
          { status: 'active' }
        ]
      }
      const complexReplacement = {
        name: 'Jane Doe',
        age: 25,
        status: 'premium',
        joinDate: '2024-01-01T00:00:00.000Z',
        preferences: {
          theme: 'dark',
          notifications: true
        }
      }

      command.argv = ['users', JSON.stringify(complexFilter), JSON.stringify(complexReplacement)]
      await command.init()

      const replaceResult = {
        matchedCount: 1,
        modifiedCount: 1,
        acknowledged: true,
        upsertedId: null,
        upsertedCount: 0
      }
      mockReplaceOne.mockResolvedValue(replaceResult)

      const result = await command.run()

      expect(mockReplaceOne).toHaveBeenCalledWith(complexFilter, complexReplacement, {})
      expect(result.filter).toEqual(complexFilter)
      expect(result.replacement).toEqual(complexReplacement)
    })
  })

  describe('error handling', () => {
    test('handles invalid JSON filter', async () => {
      command.argv = ['users', '{"invalid": json}', '{"name": "John"}']

      await expect(async () => {
        await command.init()
        await command.run()
      }).rejects.toThrow('JSON parse error:')
      expect(mockReplaceOne).not.toHaveBeenCalled()
    })

    test('handles invalid JSON replacement', async () => {
      command.argv = ['users', '{"name": "John"}', '{"invalid": json}']

      await expect(async () => {
        await command.init()
        await command.run()
      }).rejects.toThrow('JSON parse error:')
      expect(mockReplaceOne).not.toHaveBeenCalled()
    })

    test('handles database connection error', async () => {
      await command.init()

      const error = new Error('Database connection failed')
      mockConnect.mockRejectedValue(error)

      await expect(command.run()).rejects.toThrow('Failed to replace document in collection \'users\': Database connection failed')

      expect(stdout.output).toContain('Failed to replace document')
      expect(stdout.output).toContain('Collection: users')
      expect(stdout.output).toContain('Namespace: test-namespace')
    })

    test('handles replace operation error', async () => {
      await command.init()

      const error = new Error('Replace operation failed')
      mockReplaceOne.mockRejectedValue(error)

      await expect(command.run()).rejects.toThrow('Failed to replace document in collection \'users\': Replace operation failed')

      expect(stdout.output).toContain('Failed to replace document')
    })

    test('handles validation error', async () => {
      await command.init()

      const error = new Error('Document validation failed')
      mockReplaceOne.mockRejectedValue(error)

      await expect(command.run()).rejects.toThrow('Failed to replace document in collection \'users\': Document validation failed')
    })
  })

  describe('JSON parsing', () => {
    test('parses simple JSON filter and replacement', async () => {
      command.argv = ['products', '{"category": "electronics"}', '{"name": "New Product", "category": "electronics", "price": 99.99}']
      await command.init()

      const replaceResult = {
        matchedCount: 1,
        modifiedCount: 1,
        acknowledged: true,
        upsertedId: null,
        upsertedCount: 0
      }
      mockReplaceOne.mockResolvedValue(replaceResult)

      const result = await command.run()

      expect(result.filter).toEqual({ category: 'electronics' })
      expect(result.replacement).toEqual({ name: 'New Product', category: 'electronics', price: 99.99 })
    })

    test('parses JSON with nested objects', async () => {
      const nestedReplacement = {
        name: 'Updated Product',
        specs: {
          cpu: 'Intel i7',
          ram: '16GB',
          storage: '1TB SSD'
        },
        features: ['wireless', 'bluetooth', 'touchscreen']
      }

      command.argv = ['products', '{"_id": "123"}', JSON.stringify(nestedReplacement)]
      await command.init()

      const replaceResult = {
        matchedCount: 1,
        modifiedCount: 1,
        acknowledged: true,
        upsertedId: null,
        upsertedCount: 0
      }
      mockReplaceOne.mockResolvedValue(replaceResult)

      const result = await command.run()

      expect(result.replacement).toEqual(nestedReplacement)
    })

    test('handles malformed JSON filter', async () => {
      command.argv = ['users', '{"name": "John", "age":}', '{"name": "John"}']

      await expect(async () => {
        await command.init()
        await command.run()
      }).rejects.toThrow('JSON parse error:')
      expect(mockReplaceOne).not.toHaveBeenCalled()
    })

    test('handles malformed JSON replacement', async () => {
      command.argv = ['users', '{"name": "John"}', '{"name": "John", "age":}']

      await expect(async () => {
        await command.init()
        await command.run()
      }).rejects.toThrow('JSON parse error:')
      expect(mockReplaceOne).not.toHaveBeenCalled()
    })

    test('handles empty JSON objects', async () => {
      command.argv = ['users', '{}', '{"name": "Default User"}']
      await command.init()

      const replaceResult = {
        matchedCount: 1,
        modifiedCount: 1,
        acknowledged: true,
        upsertedId: null,
        upsertedCount: 0
      }
      mockReplaceOne.mockResolvedValue(replaceResult)

      const result = await command.run()

      expect(result.filter).toEqual({})
      expect(result.replacement).toEqual({ name: 'Default User' })
    })
  })

  describe('console output', () => {
    test('displays proper console output for successful replacement', async () => {
      await command.init()

      const replaceResult = {
        matchedCount: 1,
        modifiedCount: 1,
        acknowledged: true,
        upsertedId: null,
        upsertedCount: 0
      }
      mockReplaceOne.mockResolvedValue(replaceResult)

      await command.run()

      expect(stdout.output).toContain('Replacing document in collection \'users\'...')
      expect(stdout.output).toContain('Document replaced successfully in collection \'users\'')
      expect(stdout.output).toContain('Namespace: test-namespace')
      expect(stdout.output).toContain('Replaced:')
    })

    test('displays proper console output for upsert', async () => {
      command.argv = ['users', '{"name": "John"}', '{"name": "John Doe", "age": 30}', '--upsert']
      await command.init()

      const replaceResult = {
        matchedCount: 0,
        modifiedCount: 0,
        acknowledged: true,
        upsertedId: '507f1f77bcf86cd799439011',
        upsertedCount: 1
      }
      mockReplaceOne.mockResolvedValue(replaceResult)

      await command.run()

      expect(stdout.output).toContain('Upsert enabled: Will create document if not found')
      expect(stdout.output).toContain('Document created (upserted) in collection \'users\'')
      expect(stdout.output).toContain('Upserted ID: 507f1f77bcf86cd799439011')
      expect(stdout.output).toContain('Upserted count: 1')
    })

    test('displays proper console output when no document found', async () => {
      await command.init()

      const replaceResult = {
        matchedCount: 0,
        modifiedCount: 0,
        acknowledged: true,
        upsertedId: null,
        upsertedCount: 0
      }
      mockReplaceOne.mockResolvedValue(replaceResult)

      await command.run()

      expect(stdout.output).toContain('No document found in collection \'users\' matching the filter')
    })

    test('does not display upsert message when flag is not used', async () => {
      await command.init()

      const replaceResult = {
        matchedCount: 1,
        modifiedCount: 1,
        acknowledged: true,
        upsertedId: null,
        upsertedCount: 0
      }
      mockReplaceOne.mockResolvedValue(replaceResult)

      await command.run()

      expect(stdout.output).not.toContain('Upsert enabled')
    })
  })

  describe('JSON flag', () => {
    test('suppresses console output with --json flag', async () => {
      command.argv = ['users', '{"name": "John"}', '{"name": "John Doe", "age": 30}', '--json']
      await command.init()

      const replaceResult = {
        matchedCount: 1,
        modifiedCount: 1,
        acknowledged: true,
        upsertedId: null,
        upsertedCount: 0
      }
      mockReplaceOne.mockResolvedValue(replaceResult)

      const result = await command.run()

      expect(result.result.matchedCount).toBe(1)
      expect(result.result.modifiedCount).toBe(1)
      // Should not show console messages with --json
      expect(stdout.output).not.toContain('Replacing document in collection')
      expect(stdout.output).not.toContain('Document replaced successfully')
    })
  })

  describe('timestamp', () => {
    test('includes ISO timestamp in result', async () => {
      await command.init()

      const replaceResult = {
        matchedCount: 1,
        modifiedCount: 1,
        acknowledged: true,
        upsertedId: null,
        upsertedCount: 0
      }
      mockReplaceOne.mockResolvedValue(replaceResult)

      const result = await command.run()

      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)

      // Verify it's a recent timestamp
      const timestamp = new Date(result.timestamp)
      const now = new Date()
      expect(Math.abs(now.getTime() - timestamp.getTime())).toBeLessThan(5000) // Within 5 seconds
    })
  })
})
