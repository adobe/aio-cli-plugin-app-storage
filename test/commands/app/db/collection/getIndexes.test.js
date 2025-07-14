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

import { GetIndexes } from '../../../../../src/commands/app/db/collection/getIndexes.js'
import { expect, jest } from '@jest/globals'
import { stdout } from 'stdout-stderr'
import { DBBaseCommand } from '../../../../../src/DBBaseCommand.js'

// Use the global DB mock
const mockCollection = jest.fn()
const mockGetIndexes = jest.fn()
const successVal = [
  {
    v: 2,
    ley: { _id: 1 },
    name: '_id_'
  },
  {
    v: 2,
    ley: { category: 1 },
    name: 'CategoryPriceIndex'
  },
  {
    v: 2,
    ley: { price: 1 },
    name: 'price_1'
  }
]

describe('prototype', () => {
  test('extends DBBaseCommand', () => {
    expect(GetIndexes.prototype instanceof DBBaseCommand).toBe(true)
  })
  test('args', () => {
    expect(Object.keys(GetIndexes.args)).toEqual(['collectionName'])
    expect(GetIndexes.args.collectionName.required).toBe(true)
  })
  test('flags', () => {
    expect(GetIndexes.enableJsonFlag).toEqual(true)
  })
})

describe('run', () => {
  const collectionName = 'users'
  const rtNamespace = 'test-namespace'

  let command
  beforeEach(async () => {
    command = new GetIndexes([collectionName])
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
        collectionName,
        namespace: rtNamespace,
        timestamp: expect.any(String),
        indexes: successVal
      })

      expect(stdout.output).toContain(`Getting indexes from collection '${collectionName}'...`)
      expect(stdout.output).toContain('Indexes retrieved successfully')
      expect(stdout.output).toContain(`Namespace: ${rtNamespace}`)
      expect(stdout.output).toContain('Indexes:')
    })

    test('Gets indexes with --json flag', async () => {
      command.argv = [collectionName, '--json']
      await command.init()

      // Mock collection drop response
      mockGetIndexes.mockResolvedValue(successVal)

      const result = await command.run()

      expect(result).toEqual({
        collectionName,
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
