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

import { DropCollection } from '../../../../../src/commands/app/db/collection/drop.js'
import { expect, jest } from '@jest/globals'
import { stdout } from 'stdout-stderr'
import { DBBaseCommand } from '../../../../../src/DBBaseCommand.js'

// Use the global DB mock
const mockListCollections = jest.fn()
const mockDropCollection = jest.fn()

describe('prototype', () => {
  test('extends DBBaseCommand', () => {
    expect(DropCollection.prototype instanceof DBBaseCommand).toBe(true)
  })
  test('args', () => {
    expect(Object.keys(DropCollection.args)).toEqual(['collectionName'])
    expect(DropCollection.args.collectionName.required).toBe(true)
  })
  test('flags', () => {
    expect(Object.keys(DropCollection.flags).sort()).toEqual(['region'])
    expect(DropCollection.enableJsonFlag).toEqual(true)
  })
})

describe('run', () => {
  let command
  beforeEach(async () => {
    command = new DropCollection(['users'])
    command.config = {
      runHook: jest.fn().mockResolvedValue({})
    }

    // Reset mocks
    mockListCollections.mockReset()
    mockDropCollection.mockReset()

    // Mock the db client connection
    global.mockDBInstance.connect = jest.fn().mockResolvedValue({
      listCollections: mockListCollections,
      dropCollection: mockDropCollection
    })
  })

  describe('successful collection drop', () => {
    test('drops collection without --json flag', async () => {
      command.argv = ['users']
      await command.init()

      // Mock existing collection
      mockListCollections.mockResolvedValue([
        { name: 'users', documentCount: 10 }
      ])
      mockDropCollection.mockResolvedValue({ ok: 1, info: 'Collection dropped' })

      const result = await command.run()

      expect(global.mockDBInstance.connect).toHaveBeenCalled()
      expect(mockListCollections).toHaveBeenCalled()
      expect(mockDropCollection).toHaveBeenCalledWith('users')

      expect(result).toEqual({
        collectionName: 'users',
        status: 'dropped',
        namespace: 'test-namespace',
        timestamp: expect.any(String),
        result: { ok: 1, info: 'Collection dropped' }
      })

      expect(stdout.output).toContain("Dropping collection 'users'...")
      expect(stdout.output).toContain("Collection 'users' dropped successfully")
      expect(stdout.output).toContain('Namespace: test-namespace')
      expect(stdout.output).toContain('Dropped:')
    })

    test('drops collection with --json flag', async () => {
      command.argv = ['users', '--json']
      await command.init()

      // Mock existing collection
      mockListCollections.mockResolvedValue([
        { name: 'users', documentCount: 10 }
      ])
      mockDropCollection.mockResolvedValue({ ok: 1, info: 'Collection dropped' })

      const result = await command.run()

      expect(result).toEqual({
        collectionName: 'users',
        status: 'dropped',
        namespace: 'test-namespace',
        timestamp: expect.any(String),
        result: { ok: 1, info: 'Collection dropped' }
      })

      // Should not show console messages with --json
      expect(stdout.output).not.toContain("Dropping collection 'users'...")
      expect(stdout.output).not.toContain("Collection 'users' dropped successfully")
      expect(stdout.output).not.toContain('Namespace:')
    })

    test('drops collection with minimal result', async () => {
      command.argv = ['products']
      await command.init()

      // Mock existing collection and minimal result
      mockListCollections.mockResolvedValue([
        { name: 'products', documentCount: 5 }
      ])
      mockDropCollection.mockResolvedValue(null)

      const result = await command.run()

      expect(result).toEqual({
        collectionName: 'products',
        status: 'dropped',
        namespace: 'test-namespace',
        timestamp: expect.any(String),
        result: null
      })

      expect(stdout.output).toContain("Collection 'products' dropped successfully")
      expect(stdout.output).not.toContain('Details:')
    })
  })

  describe('collection does not exist', () => {
    test('fails when collection does not exist without --json flag', async () => {
      command.argv = ['users']
      await command.init()

      // Mock no existing collections
      mockListCollections.mockResolvedValue([
        { name: 'products', documentCount: 5 }
      ])

      await expect(command.run()).rejects.toThrow("Collection 'users' does not exist")

      expect(mockDropCollection).not.toHaveBeenCalled()
      expect(stdout.output).toContain("Collection 'users' does not exist")
      expect(stdout.output).toContain('Namespace: test-namespace')
    })

    test('fails when collection does not exist with --json flag', async () => {
      command.argv = ['users', '--json']
      await command.init()

      // Mock no existing collections
      mockListCollections.mockResolvedValue([])

      await expect(command.run()).rejects.toThrow("Collection 'users' does not exist")

      expect(mockDropCollection).not.toHaveBeenCalled()
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

      await expect(command.run()).rejects.toThrow("Failed to drop collection 'users': Connection failed")

      expect(stdout.output).toContain('Failed to drop collection')
      expect(stdout.output).toContain('Collection: users')
      expect(stdout.output).toContain('Namespace: test-namespace')
      expect(stdout.output).toContain('Error: Connection failed')
    })

    test('connection error with --json flag', async () => {
      command.argv = ['users', '--json']
      await command.init()

      global.mockDBInstance.connect.mockRejectedValue(new Error('Connection failed'))

      await expect(command.run()).rejects.toThrow("Failed to drop collection 'users': Connection failed")

      // Should not show console messages with --json
      expect(stdout.output).not.toContain('Failed to drop collection')
      expect(stdout.output).not.toContain('Collection: users')
      expect(stdout.output).not.toContain('Namespace:')
    })

    test('listCollections error', async () => {
      command.argv = ['users']
      await command.init()

      global.mockDBInstance.connect.mockResolvedValue({
        listCollections: mockListCollections,
        dropCollection: mockDropCollection
      })
      mockListCollections.mockRejectedValue(new Error('Query failed'))

      await expect(command.run()).rejects.toThrow("Failed to drop collection 'users': Query failed")

      expect(stdout.output).toContain('Failed to drop collection')
      expect(stdout.output).toContain('Error: Query failed')
    })

    test('dropCollection error', async () => {
      command.argv = ['users']
      await command.init()

      global.mockDBInstance.connect.mockResolvedValue({
        listCollections: mockListCollections,
        dropCollection: mockDropCollection
      })
      mockListCollections.mockResolvedValue([
        { name: 'users', documentCount: 10 }
      ])
      mockDropCollection.mockRejectedValue(new Error('Drop failed'))

      await expect(command.run()).rejects.toThrow("Failed to drop collection 'users': Drop failed")

      expect(stdout.output).toContain('Failed to drop collection')
      expect(stdout.output).toContain('Error: Drop failed')
    })

    test('authentication error', async () => {
      command.argv = ['users']
      await command.init()

      global.mockDBInstance.connect.mockRejectedValue(new Error('401 Unauthorized'))

      await expect(command.run()).rejects.toThrow("Failed to drop collection 'users': 401 Unauthorized")

      expect(stdout.output).toContain('Failed to drop collection')
      expect(stdout.output).toContain('401 Unauthorized')
    })
  })
})
