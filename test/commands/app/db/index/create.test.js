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

import { Create } from '../../../../../src/commands/app/db/index/create.js'
import { expect, jest, test } from '@jest/globals'
import { stdout } from 'stdout-stderr'
import { DBBaseCommand } from '../../../../../src/DBBaseCommand.js'

// Use the global DB mock
const mockCollection = jest.fn()
const mockCreateIndex = jest.fn()

describe('prototype', () => {
  test('extends DBBaseCommand', () => {
    expect(Create.prototype instanceof DBBaseCommand).toBe(true)
  })
  test('args', () => {
    expect(Object.keys(Create.args)).toEqual(['collection'])
    expect(Create.args.collection.required).toBe(true)
  })
  test('flags', () => {
    const expectedFlags = Object.keys(DBBaseCommand.flags).concat(['key', 'name', 'spec', 'unique']).sort()
    expect(Object.keys(Create.flags).sort()).toEqual(expectedFlags)
    expect(Create.flags.key.atLeastOne.sort()).toEqual(['key', 'spec'])
    expect(Create.flags.spec.atLeastOne.sort()).toEqual(['key', 'spec'])
    expect(Create.flags.key.multiple).toEqual(true)
    expect(Create.flags.spec.multiple).toEqual(true)
    expect(Create.enableJsonFlag).toEqual(true)
  })
})

describe('run', () => {
  const collectionName = 'students'
  const spec1 = { name: 1 }
  const specString1 = '{"name": 1}'
  const spec2 = { age: -1 }
  const specString2 = '{"age": -1}'
  const key1 = 'grade'
  const key2 = 'teacher'
  const rtNamespace = 'test-namespace'
  let command

  beforeEach(async () => {
    command = new Create([collectionName])
    command.config = {
      runHook: jest.fn().mockResolvedValue({})
    }

    // Reset mocks
    mockCollection.mockReset()
    mockCreateIndex.mockReset()

    // Mock the db client connection
    global.mockDBInstance.connect = jest.fn().mockResolvedValue({
      collection: mockCollection
    })

    mockCollection.mockReturnValue({
      createIndex: mockCreateIndex
    })
  })

  describe('successful index creation', () => {
    test('creates index with specification', async () => {
      command.argv = [collectionName, '--spec', specString1]
      const indexName = 'name_1'
      mockCreateIndex.mockResolvedValue(indexName)
      await command.init()

      const result = await command.run()

      expect(global.mockDBInstance.connect).toHaveBeenCalled()
      expect(mockCollection).toHaveBeenCalledWith(collectionName)
      expect(mockCreateIndex).toHaveBeenCalledWith([spec1], {})

      expect(result).toEqual({
        collection: collectionName,
        indexName,
        specification: [spec1],
        status: 'created',
        namespace: rtNamespace,
        timestamp: expect.any(String)
      })

      expect(stdout.output).toContain(`Creating index on collection '${collectionName}'...`)
      expect(stdout.output).toContain(`Index '${indexName}' created successfully in the '${collectionName}' collection`)
      expect(stdout.output).toContain(`Namespace: ${rtNamespace}`)
      expect(stdout.output).toContain('Created:')
    })

    test('creates index with multiple specifications', async () => {
      command.argv = [collectionName, '--spec', specString1, `-s=${specString2}`]
      const indexName = 'name_1_age_-1'
      mockCreateIndex.mockResolvedValue(indexName)
      await command.init()

      const result = await command.run()

      expect(global.mockDBInstance.connect).toHaveBeenCalled()
      expect(mockCollection).toHaveBeenCalledWith(collectionName)
      expect(mockCreateIndex).toHaveBeenCalledWith([spec1, spec2], {})

      expect(result).toEqual({
        collection: collectionName,
        indexName,
        specification: [spec1, spec2],
        status: 'created',
        namespace: rtNamespace,
        timestamp: expect.any(String)
      })

      expect(stdout.output).toContain(`Creating index on collection '${collectionName}'...`)
      expect(stdout.output).toContain(`Index '${indexName}' created successfully in the '${collectionName}' collection`)
    })

    test('creates index with key', async () => {
      command.argv = [collectionName, '--key', key1]
      const indexName = 'grade_1'
      mockCreateIndex.mockResolvedValue(indexName)
      await command.init()

      const result = await command.run()

      expect(global.mockDBInstance.connect).toHaveBeenCalled()
      expect(mockCollection).toHaveBeenCalledWith(collectionName)
      expect(mockCreateIndex).toHaveBeenCalledWith([key1], {})

      expect(result).toEqual({
        collection: collectionName,
        indexName,
        specification: [key1],
        status: 'created',
        namespace: rtNamespace,
        timestamp: expect.any(String)
      })

      expect(stdout.output).toContain(`Creating index on collection '${collectionName}'...`)
      expect(stdout.output).toContain(`Index '${indexName}' created successfully in the '${collectionName}' collection`)
    })

    test('creates index with multiple keys', async () => {
      command.argv = [collectionName, '--key', key1, `-k=${key2}`]
      const indexName = 'grade_1_teacher_1'
      mockCreateIndex.mockResolvedValue(indexName)
      await command.init()

      const result = await command.run()

      expect(global.mockDBInstance.connect).toHaveBeenCalled()
      expect(mockCollection).toHaveBeenCalledWith(collectionName)
      expect(mockCreateIndex).toHaveBeenCalledWith([key1, key2], {})

      expect(result).toEqual({
        collection: collectionName,
        indexName,
        specification: [key1, key2],
        status: 'created',
        namespace: rtNamespace,
        timestamp: expect.any(String)
      })

      expect(stdout.output).toContain(`Creating index on collection '${collectionName}'...`)
      expect(stdout.output).toContain(`Index '${indexName}' created successfully in the '${collectionName}' collection`)
    })

    test('creates index with multiple keys and specifications in provided order', async () => {
      command.argv = [collectionName, '--key', key1, `--spec=${specString1}`, '-s', specString2, `-k=${key2}`]
      const indexName = 'grade_1_name_1_age_1_teacher_1'
      mockCreateIndex.mockResolvedValue(indexName)
      await command.init()

      const result = await command.run()

      expect(global.mockDBInstance.connect).toHaveBeenCalled()
      expect(mockCollection).toHaveBeenCalledWith(collectionName)
      expect(mockCreateIndex).toHaveBeenCalledWith([key1, spec1, spec2, key2], {})

      expect(result).toEqual({
        collection: collectionName,
        indexName,
        specification: [key1, spec1, spec2, key2],
        status: 'created',
        namespace: rtNamespace,
        timestamp: expect.any(String)
      })

      expect(stdout.output).toContain(`Creating index on collection '${collectionName}'...`)
      expect(stdout.output).toContain(`Index '${indexName}' created successfully in the '${collectionName}' collection`)
    })

    test('creates index with --json flag', async () => {
      command.argv = [collectionName, '--spec', specString1, '--json']
      const indexName = 'name_1'
      mockCreateIndex.mockResolvedValue(indexName)
      await command.init()

      const result = await command.run()

      // Mock no existing collections
      expect(global.mockDBInstance.connect).toHaveBeenCalled()
      expect(mockCollection).toHaveBeenCalledWith(collectionName)
      expect(mockCreateIndex).toHaveBeenCalledWith([spec1], {})

      expect(result).toEqual({
        collection: collectionName,
        indexName,
        specification: [spec1],
        status: 'created',
        namespace: rtNamespace,
        timestamp: expect.any(String)
      })

      // Should not show console messages with --json
      expect(stdout.output).not.toContain('Creating index on collection')
      expect(stdout.output).not.toContain(`Index '${indexName}' created successfully`)
      expect(stdout.output).not.toContain('Namespace:')
      expect(stdout.output).not.toContain('Created:')
    })

    test('creates index with name flag', async () => {
      command.argv = [collectionName, '-s', specString1, '--name', 'custom_index_name']
      await command.init()

      const indexName = 'custom_index_name'
      mockCreateIndex.mockResolvedValue(indexName)

      const result = await command.run()

      expect(mockCreateIndex).toHaveBeenCalledWith([spec1], { name: 'custom_index_name' })

      expect(result).toEqual({
        collection: collectionName,
        indexName,
        specification: [spec1],
        status: 'created',
        namespace: rtNamespace,
        timestamp: expect.any(String),
        options: { name: 'custom_index_name' }
      })

      expect(stdout.output).toContain(`Creating index '${indexName}' on collection '${collectionName}'...`)
      expect(stdout.output).toContain(`Index '${indexName}' created successfully in the '${collectionName}' collection`)
    })

    test('creates index with unique flag', async () => {
      command.argv = [collectionName, '-s', specString1, '--unique']
      await command.init()

      const indexName = 'name_1'
      mockCreateIndex.mockResolvedValue(indexName)

      const result = await command.run()

      expect(mockCreateIndex).toHaveBeenCalledWith([spec1], { unique: true })

      expect(result).toEqual({
        collection: collectionName,
        indexName,
        specification: [spec1],
        status: 'created',
        namespace: rtNamespace,
        timestamp: expect.any(String),
        options: { unique: true }
      })

      expect(stdout.output).toContain(`Creating index on collection '${collectionName}'...`)
      expect(stdout.output).toContain(`Index '${indexName}' created successfully in the '${collectionName}' collection`)
      expect(stdout.output).toContain('Unique: true')
    })

    test('creates index with multiple flags', async () => {
      command.argv = [collectionName, '-s', specString1, '--name', 'custom_index_name', '--unique']
      await command.init()

      const indexName = 'custom_index_name'
      mockCreateIndex.mockResolvedValue(indexName)

      const result = await command.run()

      expect(mockCreateIndex).toHaveBeenCalledWith([spec1], {
        name: 'custom_index_name',
        unique: true
      })

      expect(result).toEqual({
        collection: collectionName,
        indexName,
        specification: [spec1],
        status: 'created',
        namespace: rtNamespace,
        timestamp: expect.any(String),
        options: {
          name: 'custom_index_name',
          unique: true
        }
      })

      expect(stdout.output).toContain(`Creating index '${indexName}' on collection '${collectionName}'...`)
      expect(stdout.output).toContain(`Index '${indexName}' created successfully in the '${collectionName}' collection`)
      expect(stdout.output).toContain('Unique: true')
    })
  })

  describe('parameter validation', () => {
    test('fails with missing collection name', async () => {
      command.argv = ['', '-s', specString1]
      await expect(async () => {
        await command.init()
        await command.run()
      }).rejects.toThrow('Collection name: Must be a non-empty string')

      expect(mockCollection).not.toHaveBeenCalled()
      expect(mockCreateIndex).not.toHaveBeenCalled()
    })
  })

  describe('flag validation', () => {
    test('fails with invalid index name', async () => {
      command.argv = [collectionName, '-s', specString1, '--name', '']
      await expect(async () => {
        await command.init()
        await command.run()
      }).rejects.toThrow('Index name: Must be a non-empty string')
      expect(mockCollection).not.toHaveBeenCalled()
      expect(mockCreateIndex).not.toHaveBeenCalled()
    })

    test('fails if specification is malformed json', async () => {
      command.argv = [collectionName, '--spec', '{"bad object": 1']
      await expect(async () => {
        await command.init()
        await command.run()
      }).rejects.toThrow('JSON parse error:')
      expect(mockCollection).not.toHaveBeenCalled()
      expect(mockCreateIndex).not.toHaveBeenCalled()
    })

    test('fails if specification is not an object', async () => {
      command.argv = [collectionName, '--spec', '["arrays", "are", "not", "allowed"]']
      await expect(async () => {
        await command.init()
        await command.run()
      }).rejects.toThrow('is not a JSON object')
      expect(mockCollection).not.toHaveBeenCalled()
      expect(mockCreateIndex).not.toHaveBeenCalled()
    })

    test('fails if key is an empty string', async () => {
      command.argv = [collectionName, '--key', '']
      await expect(async () => {
        await command.init()
        await command.run()
      }).rejects.toThrow('Index key: Must be a non-empty string')
      expect(mockCollection).not.toHaveBeenCalled()
      expect(mockCreateIndex).not.toHaveBeenCalled()
    })

    test('fails is neither key nor spec is provided', async () => {
      command.argv = [collectionName]
      await expect(async () => {
        await command.init()
        await command.run()
      }).rejects.toThrow('At least one of the following must be provided: --key, --spec')
      expect(mockCollection).not.toHaveBeenCalled()
      expect(mockCreateIndex).not.toHaveBeenCalled()
    })
  })

  describe('error handling', () => {
    test('fails with connection error', async () => {
      command.argv = [collectionName, '-s', specString1]
      await command.init()

      global.mockDBInstance.connect.mockRejectedValue(new Error('Connection failed'))

      await expect(command.run()).rejects.toThrow("Failed to create index on collection 'students': Connection failed")

      expect(stdout.output).toContain('Failed to create index')
      expect(stdout.output).toContain(`Collection: ${collectionName}`)
      expect(stdout.output).toContain('Namespace:')
    })
  })
})
