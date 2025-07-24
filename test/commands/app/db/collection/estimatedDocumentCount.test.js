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

import { EstimatedDocumentCount } from '../../../../../src/commands/app/db/collection/estimatedDocumentCount.js'
import { expect, jest } from '@jest/globals'
import { stdout } from 'stdout-stderr'
import { DBBaseCommand } from '../../../../../src/DBBaseCommand.js'

describe('EstimatedDocumentCount', () => {
  let command
  let mockConnect
  let mockCollection
  let mockClient
  let mockEstimatedDocumentCount

  beforeEach(() => {
    command = new EstimatedDocumentCount(['users'])
    command.config = { runHook: jest.fn().mockResolvedValue({}) }
    command.db = global.mockDBInstance
    command.rtNamespace = 'test-namespace'
    command.debugLogger = {
      info: jest.fn(),
      error: jest.fn()
    }

    // Setup mocks
    mockEstimatedDocumentCount = jest.fn()
    mockCollection = {
      estimatedDocumentCount: mockEstimatedDocumentCount
    }
    mockClient = {
      collection: jest.fn().mockReturnValue(mockCollection)
    }
    mockConnect = global.mockDBInstance.connect

    // Reset mocks
    mockEstimatedDocumentCount.mockReset()
    mockCollection.estimatedDocumentCount = mockEstimatedDocumentCount
    mockClient.collection.mockClear()
    mockConnect.mockClear()
    mockConnect.mockResolvedValue(mockClient)
  })

  describe('command structure', () => {
    test('has correct description', () => {
      expect(EstimatedDocumentCount.description).toBe('Get estimated document count for a collection based on collection metadata')
    })

    test('has correct examples', () => {
      expect(EstimatedDocumentCount.examples).toEqual([
        '$ aio app db collection estimatedDocumentCount users',
        '$ aio app db collection estimatedDocumentCount products',
        '$ aio app db collection estimatedDocumentCount posts --json'
      ])
    })

    test('has correct args', () => {
      expect(EstimatedDocumentCount.args.collection.required).toBe(true)
      expect(EstimatedDocumentCount.args.collection.description).toBe('The name of the collection')
    })

    test('flags', () => {
      const expectedFlags = Object.keys(DBBaseCommand.flags).sort()
      expect(Object.keys(EstimatedDocumentCount.flags).sort()).toEqual(expectedFlags)
      expect(EstimatedDocumentCount.enableJsonFlag).toEqual(true)
    })
  })

  describe('successful count', () => {
    test('gets estimated document count successfully', async () => {
      await command.init()

      const estimatedCount = 150
      mockEstimatedDocumentCount.mockResolvedValue(estimatedCount)

      const result = await command.run()

      expect(mockConnect).toHaveBeenCalled()
      expect(mockClient.collection).toHaveBeenCalledWith('users')
      expect(mockEstimatedDocumentCount).toHaveBeenCalledWith({})

      expect(result).toEqual({
        collection: 'users',
        estimatedCount,
        namespace: 'test-namespace',
        timestamp: expect.any(String)
      })
    })

    test('handles zero count result', async () => {
      await command.init()

      const estimatedCount = 0
      mockEstimatedDocumentCount.mockResolvedValue(estimatedCount)

      const result = await command.run()

      expect(result.estimatedCount).toBe(0)
    })
  })

  describe('error handling', () => {
    test('handles database connection error', async () => {
      await command.init()

      const connectionError = new Error('Connection failed')
      mockConnect.mockRejectedValue(connectionError)

      await expect(command.run()).rejects.toThrow('Connection failed')
    })

    test('handles collection estimatedDocumentCount error', async () => {
      await command.init()

      const countError = new Error('Estimated count operation failed')
      mockEstimatedDocumentCount.mockRejectedValue(countError)

      await expect(command.run()).rejects.toThrow('Estimated count operation failed')
    })
  })

  describe('output formatting', () => {
    test('displays success message with estimated count', async () => {
      stdout.start()
      await command.init()

      mockEstimatedDocumentCount.mockResolvedValue(150)

      await command.run()

      stdout.stop()
      expect(stdout.output).toContain('Estimated 150 document(s) in collection \'users\'')
      expect(stdout.output).toContain('Namespace: test-namespace')
      expect(stdout.output).toContain('Note: This is an estimate based on collection metadata')
    })

    test('displays error message on failure', async () => {
      stdout.start()
      await command.init()

      const countError = new Error('Estimated count operation failed')
      mockEstimatedDocumentCount.mockRejectedValue(countError)

      try {
        await command.run()
      } catch (error) {
        // Expected to throw
      }

      stdout.stop()
      expect(stdout.output).toContain('Failed to get estimated document count')
      expect(stdout.output).toContain('Collection: users')
      expect(stdout.output).toContain('Namespace: test-namespace')
    })
  })
})
