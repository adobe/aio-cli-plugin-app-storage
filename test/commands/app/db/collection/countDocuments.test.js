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

import { CountDocuments } from '../../../../../src/commands/app/db/collection/countDocuments.js'
import { expect, jest } from '@jest/globals'
import { stdout } from 'stdout-stderr'
import { DBBaseCommand } from '../../../../../src/DBBaseCommand.js'

describe('CountDocuments', () => {
  let command
  let mockConnect
  let mockCollection
  let mockClient
  let mockCountDocuments

  beforeEach(() => {
    command = new CountDocuments(['users'])
    command.config = { runHook: jest.fn().mockResolvedValue({}) }
    command.db = global.mockDBInstance
    command.rtNamespace = 'test-namespace'
    command.debugLogger = { info: jest.fn(), error: jest.fn() }

    // Setup mocks
    mockCountDocuments = jest.fn()
    mockCollection = {
      countDocuments: mockCountDocuments
    }
    mockClient = {
      collection: jest.fn().mockReturnValue(mockCollection)
    }
    mockConnect = global.mockDBInstance.connect

    // Reset mocks
    mockCountDocuments.mockReset()
    mockCollection.countDocuments = mockCountDocuments
    mockClient.collection.mockClear()
    mockConnect.mockClear()
    mockConnect.mockResolvedValue(mockClient)
  })

  describe('command structure', () => {
    test('has correct description', () => {
      expect(CountDocuments.description).toBe('Count documents in a collection')
    })

    test('has correct examples', () => {
      expect(CountDocuments.examples).toEqual([
        '$ aio app db collection countDocuments users',
        '$ aio app db collection countDocuments users \'{"age": {"$gte": 21}}\'',
        '$ aio app db collection countDocuments products \'{"category": "electronics"}\' --json'
      ])
    })

    test('has correct args', () => {
      expect(CountDocuments.args.collection.required).toBe(true)
      expect(CountDocuments.args.collection.description).toBe('The name of the collection')
      expect(CountDocuments.args.query.required).toBe(false)
      expect(CountDocuments.args.query.description).toBe('The query filter document (JSON string). If not provided, counts all documents.')
    })

    test('flags', () => {
      const expectedFlags = Object.keys(DBBaseCommand.flags).sort()
      expect(Object.keys(CountDocuments.flags).sort()).toEqual(expectedFlags)
      expect(CountDocuments.enableJsonFlag).toEqual(true)
    })
  })

  describe('successful count', () => {
    test('counts documents successfully', async () => {
      await command.init()

      const documentCount = 150
      mockCountDocuments.mockResolvedValue(documentCount)

      const result = await command.run()

      expect(mockConnect).toHaveBeenCalled()
      expect(mockClient.collection).toHaveBeenCalledWith('users')
      expect(mockCountDocuments).toHaveBeenCalledWith({}, {})

      expect(result).toEqual({
        collection: 'users',
        query: {},
        count: documentCount,
        namespace: 'test-namespace',
        timestamp: expect.any(String)
      })
    })

    test('counts documents with query filter', async () => {
      command = new CountDocuments(['users', '{"age": {"$gte": 21}}'])
      command.config = { runHook: jest.fn().mockResolvedValue({}) }
      command.db = global.mockDBInstance
      command.rtNamespace = 'test-namespace'
      command.debugLogger = { info: jest.fn(), error: jest.fn() }

      await command.init()

      const documentCount = 75
      mockCountDocuments.mockResolvedValue(documentCount)

      const result = await command.run()

      expect(mockCountDocuments).toHaveBeenCalledWith({ age: { $gte: 21 } }, {})

      expect(result).toEqual({
        collection: 'users',
        query: { age: { $gte: 21 } },
        count: documentCount,
        namespace: 'test-namespace',
        timestamp: expect.any(String)
      })
    })

    test('handles zero count result', async () => {
      await command.init()

      const documentCount = 0
      mockCountDocuments.mockResolvedValue(documentCount)

      const result = await command.run()

      expect(result.count).toBe(0)
    })
  })

  describe('error handling', () => {
    test('handles database connection error', async () => {
      await command.init()

      const connectionError = new Error('Connection failed')
      mockConnect.mockRejectedValue(connectionError)

      await expect(command.run()).rejects.toThrow('Connection failed')
    })

    test('handles collection countDocuments error', async () => {
      await command.init()

      const countError = new Error('Count operation failed')
      mockCountDocuments.mockRejectedValue(countError)

      await expect(command.run()).rejects.toThrow('Count operation failed')
    })

    test('handles invalid query JSON', async () => {
      command.argv = ['users', 'invalid-json']

      await expect(async () => {
        await command.init()
        await command.run()
      }).rejects.toThrow('Query: JSON parse error')
      expect(mockCountDocuments).not.toHaveBeenCalled()
    })
  })

  describe('output formatting', () => {
    test('displays success message with count', async () => {
      stdout.start()
      await command.init()

      mockCountDocuments.mockResolvedValue(150)

      await command.run()

      stdout.stop()
      expect(stdout.output).toContain('Found 150 document(s) in collection \'users\'')
      expect(stdout.output).toContain('Namespace: test-namespace')
    })

    test('displays query filter when provided', async () => {
      stdout.start()
      command = new CountDocuments(['users', '{"age": {"$gte": 21}}'])
      command.config = { runHook: jest.fn().mockResolvedValue({}) }
      command.db = global.mockDBInstance
      command.rtNamespace = 'test-namespace'
      command.debugLogger = { info: jest.fn(), error: jest.fn() }

      await command.init()

      mockCountDocuments.mockResolvedValue(75)

      await command.run()

      stdout.stop()
      expect(stdout.output).toContain('Using query filter: {"age":{"$gte":21}}')
      expect(stdout.output).toContain('Query filter applied: Yes')
    })

    test('displays error message on failure', async () => {
      stdout.start()
      await command.init()

      const countError = new Error('Count operation failed')
      mockCountDocuments.mockRejectedValue(countError)

      try {
        await command.run()
      } catch (error) {
        // Expected to throw
      }

      stdout.stop()
      expect(stdout.output).toContain('Failed to count documents')
      expect(stdout.output).toContain('Collection: users')
      expect(stdout.output).toContain('Namespace: test-namespace')
    })
  })
})
