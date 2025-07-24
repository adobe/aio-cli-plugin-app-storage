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

import { Find } from '../../../../../src/commands/app/db/collection/find.js'
import { expect, jest } from '@jest/globals'
import { stdout } from 'stdout-stderr'
import { DBBaseCommand } from '../../../../../src/DBBaseCommand.js'

// Use the global DB mock and set up collection methods
const mockFindArray = jest.fn()
const mockCollection = jest.fn()

describe('prototype', () => {
  test('extends DBBaseCommand', () => {
    expect(Find.prototype instanceof DBBaseCommand).toBe(true)
  })

  test('args', () => {
    expect(Object.keys(Find.args)).toEqual(['collection', 'filter'])
    expect(Find.args.collection.required).toBe(true)
    expect(Find.args.filter.required).toBe(true)
  })

  test('flags', () => {
    const expectedFlags = Object.keys(DBBaseCommand.flags).concat(['skip', 'limit', 'sort', 'projection']).sort()
    expect(Object.keys(Find.flags).sort()).toEqual(expectedFlags)
    expect(Find.enableJsonFlag).toEqual(true)
  })

  test('examples', () => {
    expect(Find.examples).toBeDefined()
    expect(Find.examples.length).toBeGreaterThan(0)
  })
})

describe('run', () => {
  let command

  beforeEach(async () => {
    command = new Find(['users', '{"email":{"$regex":"example\\\\.com$"}}'])
    command.config = {
      runHook: jest.fn().mockResolvedValue({})
    }

    mockCollection.mockReset()
    mockFindArray.mockReset()

    global.mockDBInstance.connect = jest.fn().mockResolvedValue({
      collection: mockCollection
    })

    mockCollection.mockReturnValue({
      findArray: mockFindArray
    })
  })

  describe('successful find', () => {
    test('displays proper console output for successful find with no flags', async () => {
      command.argv = ['users', '{"name": "John"}']
      await command.init()

      const found = [{
        _id: '507f1f77bcf86cd799439013',
        name: 'John',
        age: 30
      }]
      mockFindArray.mockResolvedValue(found)

      await command.run()

      expect(stdout.output).toContain('Finding documents in collection \'users\'...')
      expect(stdout.output).toMatch(/Filter:\n *\{\n +"name": "John"\n *\}/)
      expect(stdout.output).toContain('Limit: 20') // Default limit
      expect(stdout.output).not.toContain('Skip:')
      expect(stdout.output).not.toContain('Sort:')
      expect(stdout.output).not.toContain('Projection:')
      expect(stdout.output).toContain('Namespace: test-namespace')
      expect(stdout.output).toContain('Retrieved 1 document(s) from collection \'users\'')
      expect(stdout.output).toContain('Results:')
      expect(stdout.output).toContain('"name": "John"')
      expect(stdout.output).toContain('Searched:')
    })

    test('displays proper console output for successful find with multiple results', async () => {
      command.argv = ['users', '{"name": "John"}']
      await command.init()

      const found = [
        { _id: '507f1f77bcf86cd799439014', name: 'John', age: 30 },
        { _id: '507f1f77bcf86cd799439015', name: 'Jim', age: 31 }
      ]
      mockFindArray.mockResolvedValue(found)

      await command.run()

      expect(stdout.output).toContain('Finding documents in collection \'users\'...')
      expect(stdout.output).toContain('Retrieved 2 document(s) from collection \'users\'')
      expect(stdout.output).toContain('Results:')
      expect(stdout.output).toContain('"name": "John"')
      expect(stdout.output).toContain('"name": "Jim"')
    })

    test('displays proper console output when no document found', async () => {
      await command.init()

      mockFindArray.mockResolvedValue([])

      await command.run()

      expect(stdout.output).toContain('No documents matching the filter criteria found in collection \'users\'.')
      expect(stdout.output).not.toContain('Results:')
    })

    test('displays flag information when used', async () => {
      command.argv = [
        'users',
        '{"name": "John"}',
        '--limit', '10',
        '--skip', '5',
        '--sort', '{"age":-1}',
        '--projection', '{"name": 1}'
      ]
      await command.init()

      const found = [{ name: 'John' }]
      mockFindArray.mockResolvedValue(found)

      await command.run()

      expect(stdout.output).toContain('Limit: 10')
      expect(stdout.output).toContain('Skip: 5')
      expect(stdout.output).toMatch(/Sort:\n *\{\n +"age": -1\n *\}/)
      expect(stdout.output).toMatch(/Projection:\n *\{\n +"name": 1\n *\}/)
    })
  })

  describe('error handling', () => {
    test('handles missing collection name', async () => {
      command.argv = ['', '{}']
      await expect(async () => {
        await command.init()
        await command.run()
      }).rejects.toThrow('Collection name: Must be a non-empty string')
      expect(mockFindArray).not.toHaveBeenCalled()
    })

    test('handles missing filter argument', async () => {
      command.argv = ['users']

      await expect(async () => {
        await command.init()
        await command.run()
      }).rejects.toThrow('Missing 1 required arg')
      expect(mockFindArray).not.toHaveBeenCalled()
    })

    test('handles invalid JSON filter', async () => {
      command.argv = ['users', '{"invalid": json}']

      await expect(async () => {
        await command.init()
        await command.run()
      }).rejects.toThrow('JSON parse error:')
      expect(mockFindArray).not.toHaveBeenCalled()
    })

    test('handles invalid JSON projection', async () => {
      command.argv = ['users', '{"name": "John"}', '--projection', '{"invalid": json}']

      await expect(async () => {
        await command.init()
        await command.run()
      }).rejects.toThrow('JSON parse error:')
      expect(mockFindArray).not.toHaveBeenCalled()
    })

    test('handles invalid sort flag', async () => {
      command.argv = ['users', '{"name": "John"}', '--sort', 'invalid']

      await expect(async () => {
        await command.init()
        await command.run()
      }).rejects.toThrow('JSON parse error:')
      expect(mockFindArray).not.toHaveBeenCalled()
    })

    test('handles invalid limit value', async () => {
      command.argv = ['users', '{"name": "John"}', '--limit', '200']

      await expect(async () => {
        await command.init()
        await command.run()
      }).rejects.toThrow('Expected an integer less than or equal to')
      expect(mockFindArray).not.toHaveBeenCalled()
    })

    test('handles database connection error', async () => {
      command.argv = ['users', '{"name": "John"}']
      await command.init()

      global.mockDBInstance.connect.mockRejectedValue(new Error('Database connection failed'))

      await expect(command.run()).rejects.toThrow('Failed to find documents in collection \'users\': Database connection failed')

      expect(stdout.output).toContain('Failed to find documents')
      expect(stdout.output).toContain('Collection: users')
      expect(stdout.output).toContain('Namespace: test-namespace')
    })
  })

  describe('JSON parsing', () => {
    test('parses simple JSON filter', async () => {
      command.argv = ['products', '{"category": "electronics"}']
      await command.init()

      const found = [{ _id: '1', name: 'Laptop', category: 'electronics' }]
      mockFindArray.mockResolvedValue(found)

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

      const found = [{ _id: '1', name: 'Widget', price: 50, stock: 10 }]
      mockFindArray.mockResolvedValue(found)

      const result = await command.run()

      expect(result.filter).toEqual(operatorFilter)
    })

    test('parses projection JSON', async () => {
      const projection = { name: 1, price: 1, _id: 0 }

      command.argv = ['products', '{"name": "Widget"}', '--projection', JSON.stringify(projection)]
      await command.init()

      const found = [{ name: 'Widget', price: 50 }]
      mockFindArray.mockResolvedValue(found)

      const result = await command.run()

      expect(result.options.projection).toEqual(projection)
    })

    test('handles empty JSON objects', async () => {
      command.argv = ['users', '{}']
      await command.init()

      const found = [{ _id: '1', name: 'John' }]
      mockFindArray.mockResolvedValue(found)

      const result = await command.run()

      expect(result.filter).toEqual({})
    })
  })

  describe('JSON flag', () => {
    test('suppresses console output with --json flag', async () => {
      command.argv = ['users', '{"name": "John"}', '--json']
      await command.init()

      const found = [{ _id: '1', name: 'John' }]
      mockFindArray.mockResolvedValue(found)

      const result = await command.run()

      expect(result.results).toEqual(found)
      // Should not show console messages with --json
      expect(stdout.output).not.toContain('Finding documents in collection')
      expect(stdout.output).not.toContain('Results:')
    })
  })

  describe('timestamp', () => {
    test('includes ISO timestamp in result', async () => {
      await command.init()

      const found = [{ _id: '1', name: 'John' }]
      mockFindArray.mockResolvedValue(found)

      const result = await command.run()

      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)

      // Verify it's a recent timestamp
      const timestamp = new Date(result.timestamp)
      const now = new Date()
      expect(Math.abs(now.getTime() - timestamp.getTime())).toBeLessThan(5000) // Within 5 seconds
    })
  })
})
