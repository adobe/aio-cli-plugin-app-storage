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

import { ShowCollections } from '../../../../src/commands/app/db/showCollections.js'
import { expect, jest } from '@jest/globals'
import { stdout } from 'stdout-stderr'
import { DBBaseCommand } from '../../../../src/DBBaseCommand.js'

describe('prototype', () => {
  test('extends DBBaseCommand', () => {
    expect(ShowCollections.prototype instanceof DBBaseCommand).toBe(true)
  })
})

describe('run', () => {
  let command
  beforeEach(async () => {
    command = new ShowCollections([])
    command.config = {
      runHook: jest.fn().mockResolvedValue({})
    }
  })

  describe('current implementation', () => {
    test('shows not implemented message', async () => {
      command.argv = []
      await command.init()

      await command.run()

      expect(stdout.output).toContain('ShowCollections command not implemented yet')
    })
  })
})
