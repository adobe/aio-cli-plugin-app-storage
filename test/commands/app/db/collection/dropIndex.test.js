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

import { DropIndex } from '../../../../../src/commands/app/db/collection/dropIndex.js'
import { expect, jest } from '@jest/globals'
import { stdout } from 'stdout-stderr'
import { DBBaseCommand } from '../../../../../src/DBBaseCommand.js'

// Use the global DB mock
const mockCollection = jest.fn()
const mockDropIndex = jest.fn()

describe('prototype', () => {
  test('extends DBBaseCommand', () => {
    expect(DropIndex.prototype instanceof DBBaseCommand).toBe(true)
  })
  test('args', () => {
    expect(Object.keys(DropIndex.args).sort()).toEqual(['collection', 'indexName'])
    expect(DropIndex.args.collection.required).toBe(true)
    expect(DropIndex.args.indexName.required).toBe(true)
  })
  test('flags', () => {
    const expectedFlags = Object.keys(DBBaseCommand.flags).sort()
    expect(Object.keys(DropIndex.flags).sort()).toEqual(expectedFlags)
    expect(DropIndex.enableJsonFlag).toEqual(true)
  })
})

describe('run', () => {
  const collectionName = 'users'
  const indexName = 'price_1'
  const rtNamespace = 'test-namespace'

  let command
  beforeEach(async () => {
    command = new DropIndex([collectionName, indexName])
    command.config = {
      runHook: jest.fn().mockResolvedValue({})
    }

    // Reset mocks
    mockCollection.mockReset()
    mockDropIndex.mockReset()

    // Mock the db client connection
    global.mockDBInstance.connect = jest.fn().mockResolvedValue({
      collection: mockCollection
    })

    // Mock the collection.dropIndex() method
    mockCollection.mockReturnValue({
      dropIndex: mockDropIndex
    })
  })

  describe('successful index drop', () => {
    test('drops index without --json flag', async () => {
      command.argv = [collectionName, indexName]
      await command.init()

      // Mock collection drop response
      mockDropIndex.mockResolvedValue({ ok: 1, nIndexesWas: 3 })

      const result = await command.run()

      expect(global.mockDBInstance.connect).toHaveBeenCalled()
      expect(mockCollection).toHaveBeenCalledWith(collectionName)
      expect(mockDropIndex).toHaveBeenCalledWith(indexName)

      expect(result).toEqual({
        collection: collectionName,
        indexName,
        status: 'dropped',
        namespace: rtNamespace,
        timestamp: expect.any(String),
        result: { ok: 1, nIndexesWas: 3 }
      })

      expect(stdout.output).toContain(`Dropping index '${indexName}' from collection '${collectionName}'...`)
      expect(stdout.output).toContain(`Index '${indexName}' dropped successfully`)
      expect(stdout.output).toContain(`Namespace: ${rtNamespace}`)
      expect(stdout.output).toContain('Dropped:')
    })

    test('drops index with --json flag', async () => {
      command.argv = [collectionName, indexName, '--json']
      await command.init()

      // Mock collection drop response
      mockDropIndex.mockResolvedValue({ ok: 1, nIndexesWas: 3 })

      const result = await command.run()

      expect(result).toEqual({
        collection: collectionName,
        indexName,
        status: 'dropped',
        namespace: rtNamespace,
        timestamp: expect.any(String),
        result: { ok: 1, nIndexesWas: 3 }
      })

      // Should not show console messages with --json
      expect(stdout.output).not.toContain(`Dropping index '${indexName}' from collection '${collectionName}'...`)
      expect(stdout.output).not.toContain(`Index '${indexName}' dropped successfully`)
      expect(stdout.output).not.toContain('Namespace:')
    })
  })

  describe('argument validation', () => {
    test('fails when a required parameter is missing', async () => {
      command = new DropIndex([])
      command.config = {
        runHook: jest.fn().mockResolvedValue({})
      }
      command.argv = ['collectionName']

      // oclif will throw validation error during init() for missing required args
      await expect(command.init()).rejects.toThrow('Missing 1 required arg')

      expect(mockDropIndex).not.toHaveBeenCalled()
    })

    test('fails when collection name is empty string', async () => {
      command = new DropIndex([''])
      command.config = {
        runHook: jest.fn().mockResolvedValue({})
      }
      command.argv = ['', 'indexName']

      await expect(async () => {
        await command.init()
        await command.run()
      }).rejects.toThrow('Collection name: Must be a non-empty string')

      expect(mockDropIndex).not.toHaveBeenCalled()
    })

    test('fails when index name is empty string', async () => {
      command = new DropIndex([''])
      command.config = {
        runHook: jest.fn().mockResolvedValue({})
      }
      command.argv = ['collectionName', '']

      await expect(async () => {
        await command.init()
        await command.run()
      }).rejects.toThrow('Index name: Must be a non-empty string')

      expect(mockDropIndex).not.toHaveBeenCalled()
    })
  })

  describe('error handling', () => {
    test('connection error without --json flag', async () => {
      command.argv = [collectionName, indexName]
      await command.init()

      global.mockDBInstance.connect.mockRejectedValue(new Error('Connection failed'))

      await expect(command.run()).rejects.toThrow(`Failed to drop index '${indexName}' from collection '${collectionName}': Connection failed`)

      expect(stdout.output).toContain('Failed to drop index')
      expect(stdout.output).toContain(`Collection: ${collectionName}`)
      expect(stdout.output).toContain(`Namespace: ${rtNamespace}`)
      expect(stdout.output).toContain('Error: Connection failed')
    })
  })
})
