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

import { List } from '../../../../../src/commands/app/db/index/list.js'
import { expect, jest } from '@jest/globals'
import { stdout } from 'stdout-stderr'
import { DBBaseCommand } from '../../../../../src/DBBaseCommand.js'

// Use the global DB mock
const mockCollection = jest.fn()
const mockGetIndexes = jest.fn()
const successVal = [
  {
    v: 2,
    key: { _id: 1 },
    name: '_id_'
  },
  {
    v: 2,
    key: { category: 1 },
    name: 'CategoryPriceIndex'
  },
  {
    v: 2,
    key: { price: 1 },
    name: 'price_1'
  }
]

describe('prototype', () => {
  test('extends DBBaseCommand', () => {
    expect(List.prototype instanceof DBBaseCommand).toBe(true)
  })
  test('args', () => {
    expect(Object.keys(List.args)).toEqual(['collection'])
    expect(List.args.collection.required).toBe(true)
  })
  test('flags', () => {
    const expectedFlags = Object.keys(DBBaseCommand.flags).sort()
    expect(Object.keys(List.flags).sort()).toEqual(expectedFlags)
    expect(List.enableJsonFlag).toEqual(true)
  })
})

describe('run', () => {
  const collectionName = 'users'
  const rtNamespace = 'test-namespace'

  let command
  beforeEach(async () => {
    command = new List([collectionName])
    command.config = {
      runHook: jest.fn().mockResolvedValue({})
    }

    // Reset mocks
    mockCollection.mockReset()
    mockGetIndexes.mockReset()

    // Mock the db client connection
    global.mockDBInstance.connect = jest.fn().mockResolvedValue({
      collection: mockCollection
    })

    // Mock the collection.drop() method
    mockCollection.mockReturnValue({
      getIndexes: mockGetIndexes
    })
  })

  describe('successfully retrieves indexes', () => {
    test('Gets indexes without --json flag', async () => {
      command.argv = [collectionName]
      await command.init()

      // Mock collection drop response
      mockGetIndexes.mockResolvedValue(successVal)

      const result = await command.run()

      expect(global.mockDBInstance.connect).toHaveBeenCalled()
      expect(mockCollection).toHaveBeenCalledWith(collectionName)
      expect(mockGetIndexes).toHaveBeenCalled()

      expect(result).toEqual({
        collection: collectionName,
        namespace: rtNamespace,
        timestamp: expect.any(String),
        indexes: successVal
      })

      expect(stdout.output).toContain(`Getting indexes from collection '${collectionName}'...`)
      expect(stdout.output).toContain('Indexes retrieved successfully')
      expect(stdout.output).toContain(`Namespace: ${rtNamespace}`)
      expect(stdout.output).toContain('Indexes:')
    })

    test('gets empty list of indexes', async () => {
      command.argv = [collectionName]
      await command.init()
      mockGetIndexes.mockResolvedValue([])

      const result = await command.run()

      expect(result).toEqual({
        collection: collectionName,
        namespace: rtNamespace,
        timestamp: expect.any(String),
        indexes: []
      })

      expect(stdout.output).toContain(`Getting indexes from collection '${collectionName}'...`)
      expect(stdout.output).toContain('Indexes retrieved successfully')
      expect(stdout.output).toContain(`Namespace: ${rtNamespace}`)
      expect(stdout.output).toContain('No indexes found for this collection')
    })

    test('Gets indexes with --json flag', async () => {
      command.argv = [collectionName, '--json']
      await command.init()

      // Mock collection drop response
      mockGetIndexes.mockResolvedValue(successVal)

      const result = await command.run()

      expect(result).toEqual({
        collection: collectionName,
        namespace: rtNamespace,
        timestamp: expect.any(String),
        indexes: successVal
      })

      // Should not show console messages with --json
      expect(stdout.output).not.toContain(`Getting indexes from collection '${collectionName}'...`)
      expect(stdout.output).not.toContain('Indexes retrieved successfully')
      expect(stdout.output).not.toContain(`Namespace: ${rtNamespace}`)
      expect(stdout.output).not.toContain('Indexes:')
    })
  })

  describe('missing collection name', () => {
    test('fails when collection name is missing', async () => {
      command = new List([])
      command.config = {
        runHook: jest.fn().mockResolvedValue({})
      }
      command.argv = []

      // oclif will throw validation error during init() for missing required args
      await expect(command.init()).rejects.toThrow('Missing 1 required arg')

      expect(mockGetIndexes).not.toHaveBeenCalled()
    })

    test('fails when collection name is empty string', async () => {
      command = new List([''])
      command.config = {
        runHook: jest.fn().mockResolvedValue({})
      }
      command.argv = ['']

      await expect(async () => {
        await command.init()
        await command.run()
      }).rejects.toThrow('Collection name: Must be a non-empty string')

      expect(mockGetIndexes).not.toHaveBeenCalled()
    })
  })

  describe('error handling', () => {
    test('connection error without --json flag', async () => {
      command.argv = [collectionName]
      await command.init()

      global.mockDBInstance.connect.mockRejectedValue(new Error('Connection failed'))

      await expect(command.run())
        .rejects
        .toThrow(`Failed to retrieve indexes from collection '${collectionName}': Connection failed`)

      expect(stdout.output).toContain('Failed to retrieve indexes')
      expect(stdout.output).toContain(`Collection: ${collectionName}`)
      expect(stdout.output).toContain(`Namespace: ${rtNamespace}`)
      expect(stdout.output).toContain('Error: Connection failed')
    })
  })
})
