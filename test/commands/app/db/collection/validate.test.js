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

import { ValidateCollection } from '../../../../../src/commands/app/db/collection/validate.js'
import { expect, jest } from '@jest/globals'
import { stdout } from 'stdout-stderr'
import { DBBaseCommand } from '../../../../../src/DBBaseCommand.js'

// Use the global DB mock
const mockListCollections = jest.fn()
const mockValidateCollection = jest.fn()

describe('prototype', () => {
  test('extends DBBaseCommand', () => {
    expect(ValidateCollection.prototype instanceof DBBaseCommand).toBe(true)
  })
  test('args', () => {
    expect(Object.keys(ValidateCollection.args)).toEqual(['collectionName'])
    expect(ValidateCollection.args.collectionName.required).toBe(true)
  })
  test('flags', () => {
    expect(Object.keys(ValidateCollection.flags).sort()).toEqual(['region'])
    expect(ValidateCollection.enableJsonFlag).toEqual(true)
  })
})

describe('run', () => {
  let command
  beforeEach(async () => {
    command = new ValidateCollection(['users'])
    command.config = {
      runHook: jest.fn().mockResolvedValue({})
    }

    // Reset mocks
    mockListCollections.mockReset()
    mockValidateCollection.mockReset()

    // Mock the db client connection
    global.mockDBInstance.connect = jest.fn().mockResolvedValue({
      listCollections: mockListCollections,
      validateCollection: mockValidateCollection
    })
  })

  describe('successful validation', () => {
    test('validates collection without --json flag (valid result)', async () => {
      command.argv = ['users']
      await command.init()

      // Mock existing collection
      mockListCollections.mockResolvedValue([
        { name: 'users', documentCount: 10 }
      ])
      mockValidateCollection.mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: [],
        info: {
          totalDocuments: 10,
          checkedIndexes: 2
        }
      })

      const result = await command.run()

      expect(global.mockDBInstance.connect).toHaveBeenCalled()
      expect(mockListCollections).toHaveBeenCalled()
      expect(mockValidateCollection).toHaveBeenCalledWith('users')

      expect(result).toEqual({
        collectionName: 'users',
        validation: {
          isValid: true,
          errors: [],
          warnings: [],
          info: {
            totalDocuments: 10,
            checkedIndexes: 2
          }
        },
        namespace: 'test-namespace',
        timestamp: expect.any(String)
      })

      expect(stdout.output).toContain("Validating collection 'users'...")
      expect(stdout.output).toContain("Collection 'users' is valid")
      expect(stdout.output).toContain('Namespace: test-namespace')
      expect(stdout.output).toContain('totalDocuments: 10')
      expect(stdout.output).toContain('checkedIndexes: 2')
      expect(stdout.output).toContain('Validated:')
    })

    test('validates collection with --json flag', async () => {
      command.argv = ['users', '--json']
      await command.init()

      // Mock existing collection
      mockListCollections.mockResolvedValue([
        { name: 'users', documentCount: 10 }
      ])
      mockValidateCollection.mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: []
      })

      const result = await command.run()

      expect(result).toEqual({
        collectionName: 'users',
        validation: {
          isValid: true,
          errors: [],
          warnings: []
        },
        namespace: 'test-namespace',
        timestamp: expect.any(String)
      })

      // Should not show console messages with --json
      expect(stdout.output).not.toContain("Validating collection 'users'...")
      expect(stdout.output).not.toContain("Collection 'users' is valid")
      expect(stdout.output).not.toContain('Namespace:')
    })

    test('validates collection with validation issues', async () => {
      command.argv = ['users']
      await command.init()

      // Mock existing collection with validation issues
      mockListCollections.mockResolvedValue([
        { name: 'users', documentCount: 10 }
      ])
      mockValidateCollection.mockResolvedValue({
        isValid: false,
        errors: ['Missing required index on email field'],
        warnings: ['Large document size detected', 'Unused index found'],
        info: {
          totalDocuments: 10,
          checkedIndexes: 3
        }
      })

      const result = await command.run()

      expect(result).toEqual({
        collectionName: 'users',
        validation: {
          isValid: false,
          errors: ['Missing required index on email field'],
          warnings: ['Large document size detected', 'Unused index found'],
          info: {
            totalDocuments: 10,
            checkedIndexes: 3
          }
        },
        namespace: 'test-namespace',
        timestamp: expect.any(String)
      })

      expect(stdout.output).toContain("Collection 'users' has validation issues")
      expect(stdout.output).toContain('Errors:')
      expect(stdout.output).toContain('- Missing required index on email field')
      expect(stdout.output).toContain('Warnings:')
      expect(stdout.output).toContain('- Large document size detected')
      expect(stdout.output).toContain('- Unused index found')
      expect(stdout.output).toContain('Info:')
      expect(stdout.output).toContain('totalDocuments: 10')
      expect(stdout.output).toContain('checkedIndexes: 3')
    })

    test('validates collection with minimal result', async () => {
      command.argv = ['products']
      await command.init()

      // Mock existing collection and minimal validation result
      mockListCollections.mockResolvedValue([
        { name: 'products', documentCount: 5 }
      ])
      mockValidateCollection.mockResolvedValue({
        isValid: true
      })

      const result = await command.run()

      expect(result).toEqual({
        collectionName: 'products',
        validation: {
          isValid: true
        },
        namespace: 'test-namespace',
        timestamp: expect.any(String)
      })

      expect(stdout.output).toContain("Collection 'products' is valid")
      expect(stdout.output).not.toContain('Errors:')
      expect(stdout.output).not.toContain('Warnings:')
      expect(stdout.output).not.toContain('Info:')
    })

    test('validates collection with undefined isValid (defaults to valid)', async () => {
      command.argv = ['items']
      await command.init()

      // Mock existing collection and validation result without isValid
      mockListCollections.mockResolvedValue([
        { name: 'items', documentCount: 3 }
      ])
      mockValidateCollection.mockResolvedValue({
        info: {
          totalDocuments: 3
        }
      })

      const result = await command.run()

      expect(result).toEqual({
        collectionName: 'items',
        validation: {
          info: {
            totalDocuments: 3
          }
        },
        namespace: 'test-namespace',
        timestamp: expect.any(String)
      })

      expect(stdout.output).toContain("Collection 'items' is valid")
    })
  })

  describe('collection does not exist', () => {
    test('fails when collection does not exist without --json flag', async () => {
      command.argv = ['users']
      await command.init()

      // Mock no existing collections with that name
      mockListCollections.mockResolvedValue([
        { name: 'products', documentCount: 5 }
      ])

      await expect(command.run()).rejects.toThrow("Collection 'users' does not exist")

      expect(mockValidateCollection).not.toHaveBeenCalled()
      expect(stdout.output).toContain("Collection 'users' does not exist")
      expect(stdout.output).toContain('Namespace: test-namespace')
    })

    test('fails when collection does not exist with --json flag', async () => {
      command.argv = ['users', '--json']
      await command.init()

      // Mock no existing collections
      mockListCollections.mockResolvedValue([])

      await expect(command.run()).rejects.toThrow("Collection 'users' does not exist")

      expect(mockValidateCollection).not.toHaveBeenCalled()
      // Should not show console messages with --json
      expect(stdout.output).not.toContain("Collection 'users' does not exist")
      expect(stdout.output).not.toContain('Namespace:')
    })
  })

  describe('error handling', () => {
    test('connection error without --json flag', async () => {
      command.argv = ['users']
      await command.init()

      global.mockDBInstance.connect.mockRejectedValue(new Error('Connection failed'))

      await expect(command.run()).rejects.toThrow("Failed to validate collection 'users': Connection failed")

      expect(stdout.output).toContain('Failed to validate collection')
      expect(stdout.output).toContain('Collection: users')
      expect(stdout.output).toContain('Namespace: test-namespace')
      expect(stdout.output).toContain('Error: Connection failed')
    })

    test('connection error with --json flag', async () => {
      command.argv = ['users', '--json']
      await command.init()

      global.mockDBInstance.connect.mockRejectedValue(new Error('Connection failed'))

      await expect(command.run()).rejects.toThrow("Failed to validate collection 'users': Connection failed")

      // Should not show console messages with --json
      expect(stdout.output).not.toContain('Failed to validate collection')
      expect(stdout.output).not.toContain('Collection: users')
      expect(stdout.output).not.toContain('Namespace:')
    })

    test('listCollections error', async () => {
      command.argv = ['users']
      await command.init()

      global.mockDBInstance.connect.mockResolvedValue({
        listCollections: mockListCollections,
        validateCollection: mockValidateCollection
      })
      mockListCollections.mockRejectedValue(new Error('Query failed'))

      await expect(command.run()).rejects.toThrow("Failed to validate collection 'users': Query failed")

      expect(stdout.output).toContain('Failed to validate collection')
      expect(stdout.output).toContain('Error: Query failed')
    })

    test('validateCollection error', async () => {
      command.argv = ['users']
      await command.init()

      global.mockDBInstance.connect.mockResolvedValue({
        listCollections: mockListCollections,
        validateCollection: mockValidateCollection
      })
      mockListCollections.mockResolvedValue([
        { name: 'users', documentCount: 10 }
      ])
      mockValidateCollection.mockRejectedValue(new Error('Validation failed'))

      await expect(command.run()).rejects.toThrow("Failed to validate collection 'users': Validation failed")

      expect(stdout.output).toContain('Failed to validate collection')
      expect(stdout.output).toContain('Error: Validation failed')
    })

    test('authentication error', async () => {
      command.argv = ['users']
      await command.init()

      global.mockDBInstance.connect.mockRejectedValue(new Error('401 Unauthorized'))

      await expect(command.run()).rejects.toThrow("Failed to validate collection 'users': 401 Unauthorized")

      expect(stdout.output).toContain('Failed to validate collection')
      expect(stdout.output).toContain('401 Unauthorized')
    })
  })
})
