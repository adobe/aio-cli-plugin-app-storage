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

import { GetCollectionInfos } from '../../../../src/commands/app/db/getCollectionInfos.js'
import { expect, jest } from '@jest/globals'
import { stdout } from 'stdout-stderr'
import { DBBaseCommand } from '../../../../src/DBBaseCommand.js'

// Use the global DB mock
const mockConnect = global.mockDBInstance.connect
const mockListCollections = jest.fn()

describe('prototype', () => {
  test('extends DBBaseCommand', () => {
    expect(GetCollectionInfos.prototype instanceof DBBaseCommand).toBe(true)
  })
  test('args', () => {
    expect(Object.keys(GetCollectionInfos.args)).toEqual([])
  })
  test('flags', () => {
    expect(Object.keys(GetCollectionInfos.flags).sort()).toEqual(['region'])
    expect(GetCollectionInfos.enableJsonFlag).toEqual(true)
  })
})

describe('run', () => {
  let command
  beforeEach(async () => {
    command = new GetCollectionInfos([])
    command.config = {
      runHook: jest.fn().mockResolvedValue({})
    }

    // Reset mocks
    mockConnect.mockReset()
    mockListCollections.mockReset()

    // Mock the db client
    mockConnect.mockResolvedValue({
      listCollections: mockListCollections
    })
  })

  describe('successful collection info retrieval', () => {
    test('returns full collection information', async () => {
      command.argv = []
      await command.init()

      const collectionInfo = [
        { name: 'users', documentCount: 100, size: 1024 },
        { name: 'products', documentCount: 50, size: 512 },
        { name: 'orders', documentCount: 200, size: 2048 }
      ]
      mockListCollections.mockResolvedValue(collectionInfo)

      await command.run()

      expect(mockConnect).toHaveBeenCalled()
      expect(mockListCollections).toHaveBeenCalled()

      expect(stdout.output).toContain('Fetching collection info...')
      expect(stdout.output).toContain('users')
      expect(stdout.output).toContain('products')
      expect(stdout.output).toContain('orders')
      expect(stdout.output).toContain('100')
      expect(stdout.output).toContain('1024')
    })

    test('handles empty collection list', async () => {
      command.argv = []
      await command.init()

      mockListCollections.mockResolvedValue([])

      await command.run()

      expect(stdout.output).toContain('Fetching collection info...')
      expect(stdout.output).toContain('[]')
    })
  })

  describe('error handling', () => {
    test('connection error', async () => {
      command.argv = []
      await command.init()

      mockConnect.mockRejectedValue(new Error('Connection failed'))

      // Mock process.exit to prevent test from actually exiting
      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {})

      await command.run()

      expect(stdout.output).toContain('Error fetching collection info')
      expect(stdout.output).toContain('Connection failed')
      expect(mockExit).toHaveBeenCalledWith(1)

      mockExit.mockRestore()
    })

    test('listCollections error', async () => {
      command.argv = []
      await command.init()

      mockConnect.mockResolvedValue({
        listCollections: mockListCollections
      })
      mockListCollections.mockRejectedValue(new Error('Query failed'))

      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {})

      await command.run()

      expect(stdout.output).toContain('Error fetching collection info')
      expect(stdout.output).toContain('Query failed')
      expect(mockExit).toHaveBeenCalledWith(1)

      mockExit.mockRestore()
    })

    test('authentication error', async () => {
      command.argv = []
      await command.init()

      mockConnect.mockRejectedValue(new Error('401 Unauthorized'))

      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {})

      await command.run()

      expect(stdout.output).toContain('Error fetching collection info')
      expect(stdout.output).toContain('401 Unauthorized')
      expect(mockExit).toHaveBeenCalledWith(1)

      mockExit.mockRestore()
    })
  })
})
