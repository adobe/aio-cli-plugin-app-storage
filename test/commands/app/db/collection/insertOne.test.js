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
import { InsertOne } from '../../../../../src/commands/app/db/collection/insertOne.js'
import { expect, jest } from '@jest/globals'
import { stdout } from 'stdout-stderr'
import { DBBaseCommand } from '../../../../../src/DBBaseCommand.js'

// Use the global DB mock and set up collection methods
const mockInsertOne = jest.fn()
const mockCollection = {
  insertOne: mockInsertOne
}
const mockClient = {
  collection: jest.fn().mockReturnValue(mockCollection)
}
const mockConnect = global.mockDBInstance.connect

describe('prototype', () => {
  test('extends DBBaseCommand', () => {
    expect(InsertOne.prototype instanceof DBBaseCommand).toBe(true)
  })

  test('args', () => {
    expect(Object.keys(InsertOne.args)).toEqual(['collection', 'document'])
    expect(InsertOne.args.collection.required).toBe(true)
    expect(InsertOne.args.document.required).toBe(true)
  })

  test('flags', () => {
    const expectedFlags = Object.keys(DBBaseCommand.flags).concat(['bypassDocumentValidation']).sort()
    expect(Object.keys(InsertOne.flags).sort()).toEqual(expectedFlags)
    expect(InsertOne.flags.bypassDocumentValidation.default).toBe(false)
    expect(InsertOne.enableJsonFlag).toEqual(true)
  })

  test('description', () => {
    expect(InsertOne.description).toBe('Insert a single document into a collection')
  })

  test('examples', () => {
    expect(InsertOne.examples).toBeDefined()
    expect(InsertOne.examples.length).toBeGreaterThan(0)
  })
})

describe('run', () => {
  let command

  beforeEach(async () => {
    command = new InsertOne(['users', '{"name": "John", "age": 30}'])
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
    mockInsertOne.mockReset()
    mockCollection.insertOne = mockInsertOne
    mockClient.collection.mockClear()
    mockConnect.mockClear()
    mockConnect.mockResolvedValue(mockClient)
  })

  describe('successful insertion', () => {
    test('inserts document successfully', async () => {
      await command.init()

      const insertResult = {
        insertedId: '507f1f77bcf86cd799439011',
        acknowledged: true
      }
      mockInsertOne.mockResolvedValue(insertResult)

      const result = await command.run()

      expect(mockConnect).toHaveBeenCalled()
      expect(mockClient.collection).toHaveBeenCalledWith('users')
      expect(mockInsertOne).toHaveBeenCalledWith({ name: 'John', age: 30 }, {})

      expect(result).toEqual({
        collection: 'users',
        document: { name: 'John', age: 30 },
        insertedId: '507f1f77bcf86cd799439011',
        acknowledged: true,
        namespace: 'test-namespace',
        timestamp: expect.any(String),
        result: insertResult
      })

      expect(stdout.output).toContain('Inserting document into collection \'users\'...')
      expect(stdout.output).toContain('Document inserted successfully into collection \'users\'')
      expect(stdout.output).toContain('Namespace: test-namespace')
      expect(stdout.output).toContain('Inserted ID: 507f1f77bcf86cd799439011')
      expect(stdout.output).toContain('Acknowledged: true')
    })

    test('inserts with bypassDocumentValidation flag', async () => {
      command.argv = ['users', '{"name": "John", "age": 30}', '--bypassDocumentValidation']
      await command.init()

      const insertResult = {
        insertedId: '507f1f77bcf86cd799439012',
        acknowledged: true
      }
      mockInsertOne.mockResolvedValue(insertResult)

      const result = await command.run()

      expect(mockInsertOne).toHaveBeenCalledWith(
        { name: 'John', age: 30 },
        { bypassDocumentValidation: true }
      )

      expect(result.result).toEqual(insertResult)
      expect(stdout.output).toContain('Bypassing document validation')
      expect(stdout.output).toContain('Validation bypassed: Yes')
    })

    test('inserts complex document', async () => {
      const complexDoc = {
        name: 'John Doe',
        age: 30,
        address: {
          street: '123 Main St',
          city: 'New York',
          zip: '10001'
        },
        hobbies: ['reading', 'swimming'],
        isActive: true
      }

      command.argv = ['users', JSON.stringify(complexDoc)]
      await command.init()

      const insertResult = {
        insertedId: '507f1f77bcf86cd799439013',
        acknowledged: true
      }
      mockInsertOne.mockResolvedValue(insertResult)

      const result = await command.run()

      expect(mockInsertOne).toHaveBeenCalledWith(complexDoc, {})
      expect(result.document).toEqual(complexDoc)
    })
  })

  describe('error handling', () => {
    test('handles invalid JSON document', async () => {
      command.argv = ['users', '{"invalid": json}']
      await command.init()

      await expect(command.run()).rejects.toThrow('Invalid document JSON:')
    })

    test('handles database connection error', async () => {
      await command.init()

      const error = new Error('Database connection failed')
      mockConnect.mockRejectedValue(error)

      await expect(command.run()).rejects.toThrow('Failed to insert document into collection \'users\': Database connection failed')

      expect(stdout.output).toContain('Failed to insert document')
      expect(stdout.output).toContain('Collection: users')
      expect(stdout.output).toContain('Namespace: test-namespace')
      expect(stdout.output).toContain('Error: Database connection failed')
    })

    test('handles insert operation error', async () => {
      await command.init()

      const error = new Error('Duplicate key error')
      mockInsertOne.mockRejectedValue(error)

      await expect(command.run()).rejects.toThrow('Failed to insert document into collection \'users\': Duplicate key error')

      expect(stdout.output).toContain('Failed to insert document')
      expect(stdout.output).toContain('Error: Duplicate key error')
    })

    test('handles validation error', async () => {
      await command.init()

      const error = new Error('Document validation failed')
      mockInsertOne.mockRejectedValue(error)

      await expect(command.run()).rejects.toThrow('Failed to insert document into collection \'users\': Document validation failed')
    })
  })

  describe('JSON parsing', () => {
    test('parses simple JSON document', async () => {
      command.argv = ['products', '{"name": "Widget", "price": 10.99}']
      await command.init()

      const insertResult = {
        insertedId: '507f1f77bcf86cd799439014',
        acknowledged: true
      }
      mockInsertOne.mockResolvedValue(insertResult)

      const result = await command.run()

      expect(result.document).toEqual({ name: 'Widget', price: 10.99 })
    })

    test('parses JSON with nested objects', async () => {
      const nestedDoc = {
        product: {
          name: 'Laptop',
          specs: {
            ram: '16GB',
            storage: '512GB'
          }
        }
      }

      command.argv = ['products', JSON.stringify(nestedDoc)]
      await command.init()

      const insertResult = {
        insertedId: '507f1f77bcf86cd799439015',
        acknowledged: true
      }
      mockInsertOne.mockResolvedValue(insertResult)

      const result = await command.run()

      expect(result.document).toEqual(nestedDoc)
    })

    test('handles malformed JSON', async () => {
      command.argv = ['users', '{"name": "John", "age":}']
      await command.init()

      await expect(command.run()).rejects.toThrow('Invalid document JSON:')
    })

    test('handles empty JSON object', async () => {
      command.argv = ['users', '{}']
      await command.init()

      const insertResult = {
        insertedId: '507f1f77bcf86cd799439016',
        acknowledged: true
      }
      mockInsertOne.mockResolvedValue(insertResult)

      const result = await command.run()

      expect(result.document).toEqual({})
    })
  })

  describe('console output', () => {
    test('displays proper console output for successful insertion', async () => {
      await command.init()

      const insertResult = {
        insertedId: '507f1f77bcf86cd799439017',
        acknowledged: true
      }
      mockInsertOne.mockResolvedValue(insertResult)

      await command.run()

      expect(stdout.output).toContain('Inserting document into collection \'users\'...')
      expect(stdout.output).toContain('Document inserted successfully into collection \'users\'')
      expect(stdout.output).toContain('Namespace: test-namespace')
      expect(stdout.output).toContain('Inserted ID: 507f1f77bcf86cd799439017')
      expect(stdout.output).toContain('Acknowledged: true')
      expect(stdout.output).toContain('Inserted:')
    })

    test('displays validation bypass message when flag is used', async () => {
      command.argv = ['users', '{"name": "John"}', '--bypassDocumentValidation']
      await command.init()

      const insertResult = {
        insertedId: '507f1f77bcf86cd799439018',
        acknowledged: true
      }
      mockInsertOne.mockResolvedValue(insertResult)

      await command.run()

      expect(stdout.output).toContain('Bypassing document validation')
      expect(stdout.output).toContain('Validation bypassed: Yes')
    })

    test('does not display validation bypass message when flag is not used', async () => {
      await command.init()

      const insertResult = {
        insertedId: '507f1f77bcf86cd799439019',
        acknowledged: true
      }
      mockInsertOne.mockResolvedValue(insertResult)

      await command.run()

      expect(stdout.output).not.toContain('Bypassing document validation')
      expect(stdout.output).not.toContain('Validation bypassed: Yes')
    })
  })

  describe('JSON flag', () => {
    test('suppresses console output with --json flag', async () => {
      command.argv = ['users', '{"name": "John"}', '--json']
      await command.init()

      const insertResult = {
        insertedId: '507f1f77bcf86cd799439020',
        acknowledged: true
      }
      mockInsertOne.mockResolvedValue(insertResult)

      const result = await command.run()

      expect(result.insertedId).toBe('507f1f77bcf86cd799439020')
      // Should not show console messages with --json
      expect(stdout.output).not.toContain('Inserting document into collection')
      expect(stdout.output).not.toContain('Document inserted successfully')
    })
  })

  describe('timestamp', () => {
    test('includes ISO timestamp in result', async () => {
      await command.init()

      const insertResult = {
        insertedId: '507f1f77bcf86cd799439022',
        acknowledged: true
      }
      mockInsertOne.mockResolvedValue(insertResult)

      const result = await command.run()

      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)

      // Verify it's a recent timestamp
      const timestamp = new Date(result.timestamp)
      const now = new Date()
      expect(Math.abs(now.getTime() - timestamp.getTime())).toBeLessThan(5000) // Within 5 seconds
    })
  })
})
