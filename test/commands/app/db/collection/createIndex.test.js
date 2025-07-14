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

import { CreateIndex } from '../../../../../src/commands/app/db/collection/createIndex.js'
import { expect, jest } from '@jest/globals'
import { stdout } from 'stdout-stderr'
import { DBBaseCommand } from '../../../../../src/DBBaseCommand.js'

// Use the global DB mock
const mockCollection = jest.fn()
const mockCreateIndex = jest.fn()

describe('prototype', () => {
  test('extends DBBaseCommand', () => {
    expect(CreateIndex.prototype instanceof DBBaseCommand).toBe(true)
  })
  test('args', () => {
    expect(Object.keys(CreateIndex.args)).toEqual(['collectionName', 'specification'])
    expect(CreateIndex.args.collectionName.required).toBe(true)
    expect(CreateIndex.args.specification.required).toBe(true)
  })
  test('flags', () => {
    expect(Object.keys(CreateIndex.flags).sort()).toEqual(['name', 'unique'])
    expect(CreateIndex.enableJsonFlag).toEqual(true)
  })
})

describe('run', () => {
  const collectionName = 'users'
  const specString = '{"name": 1}'
  const specification = { name: 1 }
  const rtNamespace = 'test-namespace'
  let command

  beforeEach(async () => {
    command = new CreateIndex([collectionName, specString])
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
    test('creates index without --json flag', async () => {
      command.argv = [collectionName, specString]
      const indexName = 'name_1'
      mockCreateIndex.mockResolvedValue(indexName)
      await command.init()

      const result = await command.run()

      expect(global.mockDBInstance.connect).toHaveBeenCalled()
      expect(mockCollection).toHaveBeenCalledWith(collectionName)
      expect(mockCreateIndex).toHaveBeenCalledWith(specification, {})

      expect(result).toEqual({
        collectionName,
        indexName,
        specification,
        status: 'created',
        namespace: rtNamespace,
        timestamp: expect.any(String)
      })

      expect(stdout.output).toContain(`Creating index on collection '${collectionName}'...`)
      expect(stdout.output).toContain(`Index '${indexName}' created successfully in the '${collectionName}' collection`)
      expect(stdout.output).toContain(`Namespace: ${rtNamespace}`)
      expect(stdout.output).toContain('Created:')
    })

    test('creates index with --json flag', async () => {
      command.argv = [collectionName, specString, '--json']
      const indexName = 'name_1'
      mockCreateIndex.mockResolvedValue(indexName)
      await command.init()

      const result = await command.run()

      // Mock no existing collections
      expect(global.mockDBInstance.connect).toHaveBeenCalled()
      expect(mockCollection).toHaveBeenCalledWith(collectionName)
      expect(mockCreateIndex).toHaveBeenCalledWith(specification, {})

      expect(result).toEqual({
        collectionName,
        indexName,
        specification,
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
      command.argv = [collectionName, specString, '--name', 'custom_index_name']
      await command.init()

      const indexName = 'custom_index_name'
      mockCreateIndex.mockResolvedValue(indexName)

      const result = await command.run()

      expect(mockCreateIndex).toHaveBeenCalledWith(specification, { name: 'custom_index_name' })

      expect(result).toEqual({
        collectionName,
        indexName,
        specification,
        status: 'created',
        namespace: rtNamespace,
        timestamp: expect.any(String),
        options: { name: 'custom_index_name' }
      })

      expect(stdout.output).toContain(`Creating index '${indexName}' on collection '${collectionName}'...`)
      expect(stdout.output).toContain(`Index '${indexName}' created successfully in the '${collectionName}' collection`)
    })

    test('creates index with unique flag', async () => {
      command.argv = [collectionName, specString, '--unique']
      await command.init()

      const indexName = 'name_1'
      mockCreateIndex.mockResolvedValue(indexName)

      const result = await command.run()

      expect(mockCreateIndex).toHaveBeenCalledWith(specification, { unique: true })

      expect(result).toEqual({
        collectionName,
        indexName,
        specification,
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
      command.argv = [collectionName, specString, '--name', 'custom_index_name', '--unique']
      await command.init()

      const indexName = 'custom_index_name'
      mockCreateIndex.mockResolvedValue(indexName)

      const result = await command.run()

      expect(mockCreateIndex).toHaveBeenCalledWith(specification, {
        name: 'custom_index_name',
        unique: true
      })

      expect(result).toEqual({
        collectionName,
        indexName,
        specification,
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
      command.argv = ['', specString]
      await command.init()

      await expect(command.run()).rejects.toThrow('Collection name must be a non-empty string')

      expect(mockCollection).not.toHaveBeenCalled()
      expect(mockCreateIndex).not.toHaveBeenCalled()
    })

    test('fails with missing specification', async () => {
      command.argv = [collectionName, '']
      await command.init()

      await expect(command.run()).rejects.toThrow('Index specification must be a non-empty string or JSON object')
      expect(mockCollection).not.toHaveBeenCalled()
      expect(mockCreateIndex).not.toHaveBeenCalled()
    })
  })

  describe('flag validation', () => {
    test('fails with invalid index name', async () => {
      command.argv = [collectionName, specString, '--name', '']
      await command.init()

      await expect(command.run()).rejects.toThrow('Index name must be a non-empty string')
      expect(mockCollection).not.toHaveBeenCalled()
      expect(mockCreateIndex).not.toHaveBeenCalled()
    })
  })

  describe('error handling', () => {
    test('fails with connection error', async () => {
      command.argv = [collectionName, specString]
      await command.init()

      global.mockDBInstance.connect.mockRejectedValue(new Error('Connection failed'))

      await expect(command.run()).rejects.toThrow("Failed to create index on collection 'users': Connection failed")

      expect(stdout.output).toContain('Failed to create index')
      expect(stdout.output).toContain(`Collection: ${collectionName}`)
      expect(stdout.output).toContain('Namespace:')
      expect(stdout.output).toContain('Error: Connection failed')
    })
  })
})
