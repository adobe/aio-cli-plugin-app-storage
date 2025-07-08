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

import { Collections } from '../../../../../src/commands/app/db/show/collections.js'
import { GetCollectionNames } from '../../../../../src/commands/app/db/getCollectionNames.js'
import { expect, jest } from '@jest/globals'
import { stdout } from 'stdout-stderr'
import { DBBaseCommand } from '../../../../../src/DBBaseCommand.js'

describe('prototype', () => {
  test('extends GetCollectionNames', () => {
    expect(Collections.prototype instanceof GetCollectionNames).toBe(true)
  })

  test('extends DBBaseCommand', () => {
    expect(Collections.prototype instanceof DBBaseCommand).toBe(true)
  })
})

describe('run', () => {
  let command
  beforeEach(async () => {
    command = new Collections([])
    command.config = {
      runHook: jest.fn().mockResolvedValue({})
    }
  })

  describe('alias behavior', () => {
    test('delegates to GetCollectionNames implementation', async () => {
      // Mock the database connection and collection info
      const mockClient = {
        listCollections: jest.fn().mockResolvedValue([
          { name: 'collection1' },
          { name: 'collection2' }
        ])
      }

      command.db = {
        connect: jest.fn().mockResolvedValue(mockClient)
      }

      command.argv = []
      await command.init()

      const result = await command.run()

      expect(result).toEqual(['collection1', 'collection2'])
      expect(stdout.output).toContain('Fetching collection names...')
      expect(stdout.output).toContain('Collection names:')
      expect(stdout.output).toContain('collection1')
      expect(stdout.output).toContain('collection2')
    })
  })
})
