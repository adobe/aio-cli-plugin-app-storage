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

import { RenameCollection } from '../../../../../src/commands/app/db/collection/rename.js'
import { expect, jest } from '@jest/globals'
import { stdout } from 'stdout-stderr'
import { DBBaseCommand } from '../../../../../src/DBBaseCommand.js'

// Use the global DB mock
const mockListCollections = jest.fn()
const mockRenameCollection = jest.fn()

describe('prototype', () => {
  test('extends DBBaseCommand', () => {
    expect(RenameCollection.prototype instanceof DBBaseCommand).toBe(true)
  })
  test('args', () => {
    expect(Object.keys(RenameCollection.args)).toEqual(['currentName', 'newName'])
    expect(RenameCollection.args.currentName.required).toBe(true)
    expect(RenameCollection.args.newName.required).toBe(true)
  })
  test('flags', () => {
    expect(Object.keys(RenameCollection.flags).sort()).toEqual(['region'])
    expect(RenameCollection.enableJsonFlag).toEqual(true)
  })
})

describe('run', () => {
  let command
  beforeEach(async () => {
    command = new RenameCollection(['users', 'customers'])
    command.config = {
      runHook: jest.fn().mockResolvedValue({})
    }

    // Reset mocks
    mockListCollections.mockReset()
    mockRenameCollection.mockReset()

    // Mock the db client connection
    global.mockDBInstance.connect = jest.fn().mockResolvedValue({
      listCollections: mockListCollections,
      renameCollection: mockRenameCollection
    })
  })

  describe('successful collection rename', () => {
    test('renames collection without --json flag', async () => {
      command.argv = ['users', 'customers']
      await command.init()

      // Mock existing collection (users exists, customers does not)
      mockListCollections.mockResolvedValue([
        { name: 'users', documentCount: 10 },
        { name: 'products', documentCount: 5 }
      ])
      mockRenameCollection.mockResolvedValue({ ok: 1, info: 'Collection renamed' })

      const result = await command.run()

      expect(global.mockDBInstance.connect).toHaveBeenCalled()
      expect(mockListCollections).toHaveBeenCalled()
      expect(mockRenameCollection).toHaveBeenCalledWith('users', 'customers')

      expect(result).toEqual({
        currentName: 'users',
        newName: 'customers',
        status: 'renamed',
        namespace: 'test-namespace',
        timestamp: expect.any(String),
        result: { ok: 1, info: 'Collection renamed' }
      })

      expect(stdout.output).toContain("Renaming collection 'users' to 'customers'...")
      expect(stdout.output).toContain("Collection 'users' renamed to 'customers' successfully")
      expect(stdout.output).toContain('Namespace: test-namespace')
      expect(stdout.output).toContain('Renamed:')
    })

    test('renames collection with --json flag', async () => {
      command.argv = ['users', 'customers', '--json']
      await command.init()

      // Mock existing collection (users exists, customers does not)
      mockListCollections.mockResolvedValue([
        { name: 'users', documentCount: 10 }
      ])
      mockRenameCollection.mockResolvedValue({ ok: 1, info: 'Collection renamed' })

      const result = await command.run()

      expect(result).toEqual({
        currentName: 'users',
        newName: 'customers',
        status: 'renamed',
        namespace: 'test-namespace',
        timestamp: expect.any(String),
        result: { ok: 1, info: 'Collection renamed' }
      })

      // Should not show console messages with --json
      expect(stdout.output).not.toContain("Renaming collection 'users' to 'customers'...")
      expect(stdout.output).not.toContain("Collection 'users' renamed to 'customers' successfully")
      expect(stdout.output).not.toContain('Namespace:')
    })

    test('renames collection with minimal result', async () => {
      command.argv = ['products', 'items']
      await command.init()

      // Mock existing collection and minimal result
      mockListCollections.mockResolvedValue([
        { name: 'products', documentCount: 5 }
      ])
      mockRenameCollection.mockResolvedValue(null)

      const result = await command.run()

      expect(result).toEqual({
        currentName: 'products',
        newName: 'items',
        status: 'renamed',
        namespace: 'test-namespace',
        timestamp: expect.any(String),
        result: null
      })

      expect(stdout.output).toContain("Collection 'products' renamed to 'items' successfully")
      expect(stdout.output).not.toContain('Details:')
    })
  })

  describe('current collection does not exist', () => {
    test('fails when current collection does not exist without --json flag', async () => {
      command.argv = ['users', 'customers']
      await command.init()

      // Mock no existing collections with that name
      mockListCollections.mockResolvedValue([
        { name: 'products', documentCount: 5 }
      ])

      await expect(command.run()).rejects.toThrow("Collection 'users' does not exist")

      expect(mockRenameCollection).not.toHaveBeenCalled()
      expect(stdout.output).toContain("Collection 'users' does not exist")
      expect(stdout.output).toContain('Namespace: test-namespace')
    })

    test('fails when current collection does not exist with --json flag', async () => {
      command.argv = ['users', 'customers', '--json']
      await command.init()

      // Mock no existing collections
      mockListCollections.mockResolvedValue([])

      await expect(command.run()).rejects.toThrow("Collection 'users' does not exist")

      expect(mockRenameCollection).not.toHaveBeenCalled()
      // Should not show console messages with --json
      expect(stdout.output).not.toContain("Collection 'users' does not exist")
      expect(stdout.output).not.toContain('Namespace:')
    })
  })

  describe('new collection name already exists', () => {
    test('fails when new collection name already exists without --json flag', async () => {
      command.argv = ['users', 'products']
      await command.init()

      // Mock both collections exist
      mockListCollections.mockResolvedValue([
        { name: 'users', documentCount: 10 },
        { name: 'products', documentCount: 5 }
      ])

      await expect(command.run()).rejects.toThrow("Collection 'products' already exists")

      expect(mockRenameCollection).not.toHaveBeenCalled()
      expect(stdout.output).toContain("Collection 'products' already exists")
      expect(stdout.output).toContain('Namespace: test-namespace')
    })

    test('fails when new collection name already exists with --json flag', async () => {
      command.argv = ['users', 'products', '--json']
      await command.init()

      // Mock both collections exist
      mockListCollections.mockResolvedValue([
        { name: 'users', documentCount: 10 },
        { name: 'products', documentCount: 5 }
      ])

      await expect(command.run()).rejects.toThrow("Collection 'products' already exists")

      expect(mockRenameCollection).not.toHaveBeenCalled()
      // Should not show console messages with --json
      expect(stdout.output).not.toContain("Collection 'products' already exists")
      expect(stdout.output).not.toContain('Namespace:')
    })
  })

  describe('error handling', () => {
    test('connection error without --json flag', async () => {
      command.argv = ['users', 'customers']
      await command.init()

      global.mockDBInstance.connect.mockRejectedValue(new Error('Connection failed'))

      await expect(command.run()).rejects.toThrow("Failed to rename collection 'users': Connection failed")

      expect(stdout.output).toContain('Failed to rename collection')
      expect(stdout.output).toContain('Current: users')
      expect(stdout.output).toContain('New: customers')
      expect(stdout.output).toContain('Namespace: test-namespace')
      expect(stdout.output).toContain('Error: Connection failed')
    })

    test('connection error with --json flag', async () => {
      command.argv = ['users', 'customers', '--json']
      await command.init()

      global.mockDBInstance.connect.mockRejectedValue(new Error('Connection failed'))

      await expect(command.run()).rejects.toThrow("Failed to rename collection 'users': Connection failed")

      // Should not show console messages with --json
      expect(stdout.output).not.toContain('Failed to rename collection')
      expect(stdout.output).not.toContain('Current: users')
      expect(stdout.output).not.toContain('New: customers')
      expect(stdout.output).not.toContain('Namespace:')
    })

    test('listCollections error', async () => {
      command.argv = ['users', 'customers']
      await command.init()

      global.mockDBInstance.connect.mockResolvedValue({
        listCollections: mockListCollections,
        renameCollection: mockRenameCollection
      })
      mockListCollections.mockRejectedValue(new Error('Query failed'))

      await expect(command.run()).rejects.toThrow("Failed to rename collection 'users': Query failed")

      expect(stdout.output).toContain('Failed to rename collection')
      expect(stdout.output).toContain('Error: Query failed')
    })

    test('renameCollection error', async () => {
      command.argv = ['users', 'customers']
      await command.init()

      global.mockDBInstance.connect.mockResolvedValue({
        listCollections: mockListCollections,
        renameCollection: mockRenameCollection
      })
      mockListCollections.mockResolvedValue([
        { name: 'users', documentCount: 10 }
      ])
      mockRenameCollection.mockRejectedValue(new Error('Rename failed'))

      await expect(command.run()).rejects.toThrow("Failed to rename collection 'users': Rename failed")

      expect(stdout.output).toContain('Failed to rename collection')
      expect(stdout.output).toContain('Error: Rename failed')
    })

    test('authentication error', async () => {
      command.argv = ['users', 'customers']
      await command.init()

      global.mockDBInstance.connect.mockRejectedValue(new Error('401 Unauthorized'))

      await expect(command.run()).rejects.toThrow("Failed to rename collection 'users': 401 Unauthorized")

      expect(stdout.output).toContain('Failed to rename collection')
      expect(stdout.output).toContain('401 Unauthorized')
    })
  })
})
