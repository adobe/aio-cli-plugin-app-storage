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

import { CreateCollection } from '../../../../../src/commands/app/db/collection/create.js'
import { expect, jest } from '@jest/globals'
import { stdout } from 'stdout-stderr'
import { DBBaseCommand } from '../../../../../src/DBBaseCommand.js'

// Use the global DB mock
const mockListCollections = jest.fn()
const mockCreateCollection = jest.fn()

describe('prototype', () => {
  test('extends DBBaseCommand', () => {
    expect(CreateCollection.prototype instanceof DBBaseCommand).toBe(true)
  })
  test('args', () => {
    expect(Object.keys(CreateCollection.args)).toEqual(['collectionName'])
    expect(CreateCollection.args.collectionName.required).toBe(true)
  })
  test('flags', () => {
    expect(Object.keys(CreateCollection.flags).sort()).toEqual(['region'])
    expect(CreateCollection.enableJsonFlag).toEqual(true)
  })
})

describe('run', () => {
  let command
  beforeEach(async () => {
    command = new CreateCollection(['users'])
    command.config = {
      runHook: jest.fn().mockResolvedValue({})
    }

    // Reset mocks
    mockListCollections.mockReset()
    mockCreateCollection.mockReset()

    // Mock the db client connection
    global.mockDBInstance.connect = jest.fn().mockResolvedValue({
      listCollections: mockListCollections,
      createCollection: mockCreateCollection
    })
  })

  describe('successful collection creation', () => {
    test('creates collection without --json flag', async () => {
      command.argv = ['users']
      await command.init()

      // Mock no existing collections
      mockListCollections.mockResolvedValue([])
      mockCreateCollection.mockResolvedValue({ ok: 1, info: 'Collection created' })

      const result = await command.run()

      expect(global.mockDBInstance.connect).toHaveBeenCalled()
      expect(mockListCollections).toHaveBeenCalled()
      expect(mockCreateCollection).toHaveBeenCalledWith('users')

      expect(result).toEqual({
        collectionName: 'users',
        status: 'created',
        namespace: 'test-namespace',
        timestamp: expect.any(String),
        result: { ok: 1, info: 'Collection created' }
      })

      expect(stdout.output).toContain("Creating collection 'users'...")
      expect(stdout.output).toContain("Collection 'users' created successfully")
      expect(stdout.output).toContain('Namespace: test-namespace')
      expect(stdout.output).toContain('Created:')
    })

    test('creates collection with --json flag', async () => {
      command.argv = ['users', '--json']
      await command.init()

      // Mock no existing collections
      mockListCollections.mockResolvedValue([])
      mockCreateCollection.mockResolvedValue({ ok: 1, info: 'Collection created' })

      const result = await command.run()

      expect(result).toEqual({
        collectionName: 'users',
        status: 'created',
        namespace: 'test-namespace',
        timestamp: expect.any(String),
        result: { ok: 1, info: 'Collection created' }
      })

      // Should not show console messages with --json
      expect(stdout.output).not.toContain("Creating collection 'users'...")
      expect(stdout.output).not.toContain("Collection 'users' created successfully")
      expect(stdout.output).not.toContain('Namespace:')
    })

    test('creates collection with minimal result', async () => {
      command.argv = ['products']
      await command.init()

      // Mock no existing collections and minimal result
      mockListCollections.mockResolvedValue([])
      mockCreateCollection.mockResolvedValue(null)

      const result = await command.run()

      expect(result).toEqual({
        collectionName: 'products',
        status: 'created',
        namespace: 'test-namespace',
        timestamp: expect.any(String),
        result: null
      })

      expect(stdout.output).toContain("Collection 'products' created successfully")
      expect(stdout.output).not.toContain('Details:')
    })
  })

  describe('collection already exists', () => {
    test('fails when collection exists without --json flag', async () => {
      command.argv = ['users']
      await command.init()

      // Mock existing collection
      mockListCollections.mockResolvedValue([
        { name: 'users', documentCount: 10 },
        { name: 'products', documentCount: 5 }
      ])

      await expect(command.run()).rejects.toThrow("Collection 'users' already exists")

      expect(mockCreateCollection).not.toHaveBeenCalled()
      expect(stdout.output).toContain("Collection 'users' already exists")
      expect(stdout.output).toContain('Namespace: test-namespace')
    })

    test('fails when collection exists with --json flag', async () => {
      command.argv = ['users', '--json']
      await command.init()

      // Mock existing collection
      mockListCollections.mockResolvedValue([
        { name: 'users', documentCount: 10 }
      ])

      await expect(command.run()).rejects.toThrow("Collection 'users' already exists")

      expect(mockCreateCollection).not.toHaveBeenCalled()
      // Should not show console messages with --json
      expect(stdout.output).not.toContain("Collection 'users' already exists")
      expect(stdout.output).not.toContain('Namespace:')
    })
  })

  describe('missing collection name', () => {
    test('fails when collection name is missing', async () => {
      command = new CreateCollection([])
      command.config = {
        runHook: jest.fn().mockResolvedValue({})
      }
      command.argv = []
      await command.init()

      await expect(command.run()).rejects.toThrow('Collection name is required')

      expect(mockListCollections).not.toHaveBeenCalled()
      expect(mockCreateCollection).not.toHaveBeenCalled()
    })
  })

  describe('error handling', () => {
    test('connection error without --json flag', async () => {
      command.argv = ['users']
      await command.init()

      global.mockDBInstance.connect.mockRejectedValue(new Error('Connection failed'))

      await expect(command.run()).rejects.toThrow("Failed to create collection 'users': Connection failed")

      expect(stdout.output).toContain('Failed to create collection')
      expect(stdout.output).toContain('Collection: users')
      expect(stdout.output).toContain('Namespace: test-namespace')
      expect(stdout.output).toContain('Error: Connection failed')
    })

    test('connection error with --json flag', async () => {
      command.argv = ['users', '--json']
      await command.init()

      global.mockDBInstance.connect.mockRejectedValue(new Error('Connection failed'))

      await expect(command.run()).rejects.toThrow("Failed to create collection 'users': Connection failed")

      // Should not show console messages with --json
      expect(stdout.output).not.toContain('Failed to create collection')
      expect(stdout.output).not.toContain('Collection: users')
      expect(stdout.output).not.toContain('Namespace:')
    })

    test('listCollections error', async () => {
      command.argv = ['users']
      await command.init()

      global.mockDBInstance.connect.mockResolvedValue({
        listCollections: mockListCollections,
        createCollection: mockCreateCollection
      })
      mockListCollections.mockRejectedValue(new Error('Query failed'))

      await expect(command.run()).rejects.toThrow("Failed to create collection 'users': Query failed")

      expect(stdout.output).toContain('Failed to create collection')
      expect(stdout.output).toContain('Error: Query failed')
    })

    test('createCollection error', async () => {
      command.argv = ['users']
      await command.init()

      global.mockDBInstance.connect.mockResolvedValue({
        listCollections: mockListCollections,
        createCollection: mockCreateCollection
      })
      mockListCollections.mockResolvedValue([])
      mockCreateCollection.mockRejectedValue(new Error('Creation failed'))

      await expect(command.run()).rejects.toThrow("Failed to create collection 'users': Creation failed")

      expect(stdout.output).toContain('Failed to create collection')
      expect(stdout.output).toContain('Error: Creation failed')
    })

    test('authentication error', async () => {
      command.argv = ['users']
      await command.init()

      global.mockDBInstance.connect.mockRejectedValue(new Error('401 Unauthorized'))

      await expect(command.run()).rejects.toThrow("Failed to create collection 'users': 401 Unauthorized")

      expect(stdout.output).toContain('Failed to create collection')
      expect(stdout.output).toContain('401 Unauthorized')
    })
  })
})
