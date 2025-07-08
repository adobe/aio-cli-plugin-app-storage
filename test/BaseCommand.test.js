/*
Copyright 2024 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/
import { expect, jest } from '@jest/globals'
import { BaseCommand } from '../src/BaseCommand.js'
import { Command } from '@oclif/core'
import { stderr } from 'stdout-stderr'
import { AVAILABLE_REGIONS } from '../src/constants/db.js'

describe('prototype', () => {
  test('extends Command', () => {
    expect(BaseCommand.prototype instanceof Command).toBe(true)
  })
  test('args', () => {
    expect(Object.keys(BaseCommand.args)).toEqual([])
  })
  test('flags', () => {
    expect(Object.keys(BaseCommand.flags).sort()).toEqual(['region'])
    expect(BaseCommand.flags.region.options).toEqual(AVAILABLE_REGIONS)
    expect(BaseCommand.enableJsonFlag).toEqual(true)
  })
  test('getServiceName', () => {
    const command = new BaseCommand([])
    expect(command.getServiceName()).toBe('app')
  })
})

describe('init', () => {
  let command
  beforeEach(async () => {
    command = new BaseCommand([])
    command.config = {
      runHook: jest.fn().mockResolvedValue({})
    }
  })

  test('basic initialization', async () => {
    command.argv = []
    await expect(command.init()).resolves.toBeUndefined()
    expect(command.debugLogger).toBeDefined()
    expect(command.flags).toBeDefined()
    expect(command.args).toBeDefined()
  })

  test('debug logger namespace', async () => {
    command.argv = []
    await command.init()
    // BaseCommand should use 'app' service name
    expect(command.debugLogger).toBeDefined()
  })

  test('catch error', async () => {
    await command.init()
    await expect(command.catch(new Error('fake error'))).rejects.toThrow('fake error')
  })

  test('catch prompt interrupt', async () => {
    await command.init()
    await expect(command.catch(new Error('jfdsl User force closed the prompt fadsdljf'))).rejects.toThrow('EEXIT: 2')
  })

  test('catch error --json', async () => {
    command.argv = ['--json']
    await command.init()
    await expect(command.catch(new Error('fake error'))).rejects.toThrow('EEXIT: 2')
    expect(stderr.output).toBe('{"error":"fake error"}\n')
  })
})
