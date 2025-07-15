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
const mockCollection = jest.fn()
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
    expect(Object.keys(RenameCollection.flags).sort()).toEqual([])
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
    mockCollection.mockReset()
    mockRenameCollection.mockReset()

    // Mock the db client connection
    global.mockDBInstance.connect = jest.fn().mockResolvedValue({
      collection: mockCollection
    })

    // Mock the collection.renameCollection() method
    mockCollection.mockReturnValue({
      renameCollection: mockRenameCollection
    })
  })

  describe('successful collection rename', () => {
    test('renames collection without --json flag', async () => {
      command.argv = ['users', 'customers']
      await command.init()

      // Mock collection rename response
      mockRenameCollection.mockResolvedValue({ ok: 1, info: 'Collection renamed' })

      const result = await command.run()

      expect(global.mockDBInstance.connect).toHaveBeenCalled()
      expect(mockCollection).toHaveBeenCalledWith('users')
      expect(mockRenameCollection).toHaveBeenCalledWith('customers')

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

      // Mock collection rename response
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

      // Mock collection rename response with minimal result
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

  describe('rename errors', () => {
    test('fails when current collection does not exist without --json flag', async () => {
      command.argv = ['users', 'customers']
      await command.init()

      // Mock renameCollection method to throw an error for non-existent collection
      mockRenameCollection.mockRejectedValue(new Error('Collection not found'))

      await expect(command.run()).rejects.toThrow("Failed to rename collection 'users': Collection not found")

      expect(stdout.output).toContain('Failed to rename collection')
      expect(stdout.output).toContain('Current: users')
      expect(stdout.output).toContain('New: customers')
      expect(stdout.output).toContain('Namespace: test-namespace')
      expect(stdout.output).toContain('Error: Collection not found')
    })

    test('fails when current collection does not exist with --json flag', async () => {
      command.argv = ['users', 'customers', '--json']
      await command.init()

      // Mock renameCollection method to throw an error for non-existent collection
      mockRenameCollection.mockRejectedValue(new Error('Collection not found'))

      await expect(command.run()).rejects.toThrow("Failed to rename collection 'users': Collection not found")

      // Should not show console messages with --json
      expect(stdout.output).not.toContain('Failed to rename collection')
      expect(stdout.output).not.toContain('Current: users')
      expect(stdout.output).not.toContain('Namespace:')
    })

    test('fails when new collection name already exists without --json flag', async () => {
      command.argv = ['users', 'products']
      await command.init()

      // Mock renameCollection method to throw an error for existing target collection
      mockRenameCollection.mockRejectedValue(new Error('Target collection already exists'))

      await expect(command.run()).rejects.toThrow("Failed to rename collection 'users': Target collection already exists")

      expect(stdout.output).toContain('Failed to rename collection')
      expect(stdout.output).toContain('Current: users')
      expect(stdout.output).toContain('New: products')
      expect(stdout.output).toContain('Error: Target collection already exists')
    })

    test('fails when new collection name already exists with --json flag', async () => {
      command.argv = ['users', 'products', '--json']
      await command.init()

      // Mock renameCollection method to throw an error for existing target collection
      mockRenameCollection.mockRejectedValue(new Error('Target collection already exists'))

      await expect(command.run()).rejects.toThrow("Failed to rename collection 'users': Target collection already exists")

      // Should not show console messages with --json
      expect(stdout.output).not.toContain('Failed to rename collection')
      expect(stdout.output).not.toContain('Current: users')
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

    test('renameCollection method error', async () => {
      command.argv = ['users', 'customers']
      await command.init()

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
