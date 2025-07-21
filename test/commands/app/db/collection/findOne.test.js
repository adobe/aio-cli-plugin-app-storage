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
import { FindOne } from '../../../../../src/commands/app/db/collection/findOne.js'
import { expect, jest } from '@jest/globals'
import { stdout } from 'stdout-stderr'
import { DBBaseCommand } from '../../../../../src/DBBaseCommand.js'

// Use the global DB mock and set up collection methods
const mockFindOne = jest.fn()
const mockCollection = {
  findOne: mockFindOne
}
const mockClient = {
  collection: jest.fn().mockReturnValue(mockCollection)
}
const mockConnect = global.mockDBInstance.connect

describe('prototype', () => {
  test('extends DBBaseCommand', () => {
    expect(FindOne.prototype instanceof DBBaseCommand).toBe(true)
  })

  test('args', () => {
    expect(Object.keys(FindOne.args)).toEqual(['collection', 'filter'])
    expect(FindOne.args.collection.required).toBe(true)
    expect(FindOne.args.filter.required).toBe(true)
  })

  test('flags', () => {
    const expectedFlags = Object.keys(DBBaseCommand.flags).concat(['projection']).sort()
    expect(Object.keys(FindOne.flags).sort()).toEqual(expectedFlags)
    expect(FindOne.flags.projection.char).toBe('p')
    expect(FindOne.enableJsonFlag).toEqual(true)
  })

  test('description', () => {
    expect(FindOne.description).toBe('Find a single document in a collection')
  })

  test('examples', () => {
    expect(FindOne.examples).toBeDefined()
    expect(FindOne.examples.length).toBeGreaterThan(0)
  })
})

describe('run', () => {
  let command

  beforeEach(async () => {
    command = new FindOne(['users', '{"name": "John"}'])
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
    mockFindOne.mockReset()
    mockCollection.findOne = mockFindOne
    mockClient.collection.mockClear()
    mockConnect.mockClear()
    mockConnect.mockResolvedValue(mockClient)
  })

  describe('successful find', () => {
    test('finds document successfully', async () => {
      await command.init()

      const foundDoc = {
        _id: '507f1f77bcf86cd799439011',
        name: 'John',
        age: 30,
        email: 'john@example.com'
      }
      mockFindOne.mockResolvedValue(foundDoc)

      const result = await command.run()

      expect(mockConnect).toHaveBeenCalled()
      expect(mockClient.collection).toHaveBeenCalledWith('users')
      expect(mockFindOne).toHaveBeenCalledWith({ name: 'John' }, {})

      expect(result).toEqual({
        collection: 'users',
        filter: { name: 'John' },
        projection: undefined,
        document: foundDoc,
        namespace: 'test-namespace',
        timestamp: expect.any(String)
      })

      expect(stdout.output).toContain('Finding document in collection \'users\'...')
      expect(stdout.output).toContain('Document found in collection \'users\'')
      expect(stdout.output).toContain('Namespace: test-namespace')
      expect(stdout.output).toContain('Document:')
      expect(stdout.output).toContain('"name": "John"')
    })

    test('finds document with projection', async () => {
      command.argv = ['users', '{"name": "John"}', '--projection', '{"name": 1, "email": 1, "_id": 0}']
      await command.init()

      const foundDoc = {
        name: 'John',
        email: 'john@example.com'
      }
      mockFindOne.mockResolvedValue(foundDoc)

      const result = await command.run()

      expect(mockFindOne).toHaveBeenCalledWith(
        { name: 'John' },
        { projection: { name: 1, email: 1, _id: 0 } }
      )

      expect(result.projection).toEqual({ name: 1, email: 1, _id: 0 })
      expect(result.document).toEqual(foundDoc)
      expect(stdout.output).toContain('Using projection: {"name":1,"email":1,"_id":0}')
      expect(stdout.output).toContain('Projection applied: Yes')
    })

    test('handles no document found', async () => {
      await command.init()

      mockFindOne.mockResolvedValue(null)

      const result = await command.run()

      expect(result.document).toBeNull()
      expect(stdout.output).toContain('No document found in collection \'users\' matching the filter')
      expect(stdout.output).toContain('Namespace: test-namespace')
    })

    test('finds with complex filter', async () => {
      const complexFilter = {
        $and: [
          { age: { $gte: 18 } },
          { status: 'active' }
        ]
      }

      command.argv = ['users', JSON.stringify(complexFilter)]
      await command.init()

      const foundDoc = {
        _id: '507f1f77bcf86cd799439012',
        name: 'Jane',
        age: 25,
        status: 'active'
      }
      mockFindOne.mockResolvedValue(foundDoc)

      const result = await command.run()

      expect(mockFindOne).toHaveBeenCalledWith(complexFilter, {})
      expect(result.filter).toEqual(complexFilter)
    })
  })

  describe('error handling', () => {
    test('handles invalid JSON filter', async () => {
      command.argv = ['users', '{"invalid": json}']

      await expect(command.init()).rejects.toThrow('Invalid filter JSON:')
    })

    test('handles invalid JSON projection', async () => {
      command.argv = ['users', '{"name": "John"}', '--projection', '{"invalid": json}']

      await expect(command.init()).rejects.toThrow('Invalid projection JSON:')
    })

    test('handles database connection error', async () => {
      command.argv = ['users', '{"name": "John"}']
      await command.init()

      const error = new Error('Database connection failed')
      mockConnect.mockRejectedValue(error)

      await expect(command.run()).rejects.toThrow('Failed to find document in collection \'users\': Database connection failed')

      expect(stdout.output).toContain('Failed to find document')
      expect(stdout.output).toContain('Collection: users')
      expect(stdout.output).toContain('Namespace: test-namespace')
    })

    test('handles find operation error', async () => {
      command.argv = ['users', '{"name": "John"}']
      await command.init()

      const error = new Error('Find operation failed')
      mockFindOne.mockRejectedValue(error)

      await expect(command.run()).rejects.toThrow('Failed to find document in collection \'users\': Find operation failed')

      expect(stdout.output).toContain('Failed to find document')
    })

    test('handles invalid projection format', async () => {
      command.argv = ['users', '{"name": "John"}', '--projection', 'invalid']

      await expect(command.init()).rejects.toThrow('Invalid projection JSON:')
    })
  })

  describe('JSON parsing', () => {
    test('parses simple JSON filter', async () => {
      command.argv = ['products', '{"category": "electronics"}']
      await command.init()

      const foundDoc = { _id: '1', name: 'Laptop', category: 'electronics' }
      mockFindOne.mockResolvedValue(foundDoc)

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

      const foundDoc = { _id: '1', name: 'Widget', price: 50, stock: 10 }
      mockFindOne.mockResolvedValue(foundDoc)

      const result = await command.run()

      expect(result.filter).toEqual(operatorFilter)
    })

    test('parses projection JSON', async () => {
      const projection = { name: 1, price: 1, _id: 0 }

      command.argv = ['products', '{"name": "Widget"}', '--projection', JSON.stringify(projection)]
      await command.init()

      const foundDoc = { name: 'Widget', price: 50 }
      mockFindOne.mockResolvedValue(foundDoc)

      const result = await command.run()

      expect(result.projection).toEqual(projection)
    })

    test('handles empty JSON objects', async () => {
      command.argv = ['users', '{}']
      await command.init()

      const foundDoc = { _id: '1', name: 'John' }
      mockFindOne.mockResolvedValue(foundDoc)

      const result = await command.run()

      expect(result.filter).toEqual({})
    })
  })

  describe('console output', () => {
    test('displays proper console output for successful find', async () => {
      await command.init()

      const foundDoc = {
        _id: '507f1f77bcf86cd799439013',
        name: 'John',
        age: 30
      }
      mockFindOne.mockResolvedValue(foundDoc)

      await command.run()

      expect(stdout.output).toContain('Finding document in collection \'users\'...')
      expect(stdout.output).toContain('Document found in collection \'users\'')
      expect(stdout.output).toContain('Namespace: test-namespace')
      expect(stdout.output).toContain('Document:')
      expect(stdout.output).toContain('"name": "John"')
      expect(stdout.output).toContain('Searched:')
    })

    test('displays proper console output when no document found', async () => {
      await command.init()

      mockFindOne.mockResolvedValue(null)

      await command.run()

      expect(stdout.output).toContain('No document found in collection \'users\' matching the filter')
      expect(stdout.output).toContain('Namespace: test-namespace')
    })

    test('displays projection information when used', async () => {
      command.argv = ['users', '{"name": "John"}', '--projection', '{"name": 1}']
      await command.init()

      const foundDoc = { name: 'John' }
      mockFindOne.mockResolvedValue(foundDoc)

      await command.run()

      expect(stdout.output).toContain('Using projection: {"name":1}')
      expect(stdout.output).toContain('Projection applied: Yes')
    })

    test('does not display projection information when not used', async () => {
      await command.init()

      const foundDoc = { name: 'John' }
      mockFindOne.mockResolvedValue(foundDoc)

      await command.run()

      expect(stdout.output).not.toContain('Using projection:')
      expect(stdout.output).not.toContain('Projection applied: Yes')
    })
  })

  describe('JSON flag', () => {
    test('suppresses console output with --json flag', async () => {
      command.argv = ['users', '{"name": "John"}', '--json']
      await command.init()

      const foundDoc = { _id: '1', name: 'John' }
      mockFindOne.mockResolvedValue(foundDoc)

      const result = await command.run()

      expect(result.document).toEqual(foundDoc)
      // Should not show console messages with --json
      expect(stdout.output).not.toContain('Finding document in collection')
      expect(stdout.output).not.toContain('Document found in collection')
      expect(stdout.output).not.toContain('Document:')
    })

    test('does not display document content with --json flag', async () => {
      command.argv = ['users', '{"name": "John"}', '--json']
      await command.init()

      const foundDoc = { _id: '1', name: 'John' }
      mockFindOne.mockResolvedValue(foundDoc)

      await command.run()

      expect(stdout.output).not.toContain('"name": "John"')
    })
  })

  describe('timestamp', () => {
    test('includes ISO timestamp in result', async () => {
      await command.init()

      const foundDoc = { _id: '1', name: 'John' }
      mockFindOne.mockResolvedValue(foundDoc)

      const result = await command.run()

      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)

      // Verify it's a recent timestamp
      const timestamp = new Date(result.timestamp)
      const now = new Date()
      expect(Math.abs(now.getTime() - timestamp.getTime())).toBeLessThan(5000) // Within 5 seconds
    })
  })
})
