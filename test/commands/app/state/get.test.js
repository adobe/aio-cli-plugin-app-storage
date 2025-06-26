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
import { Get } from '../../../../src/commands/app/state/get.js'
import { expect, jest } from '@jest/globals'
import { stdout, stderr } from 'stdout-stderr'
import { StateBaseCommand } from '../../../../src/StateBaseCommand.js'

// mock state
/** @type {import('@jest/globals').jest.Mock} */
const mockStateGet = global.getStateInstanceMock().get

describe('prototype', () => {
  test('extends', () => {
    expect(Get.prototype instanceof StateBaseCommand).toBe(true)
  })
  test('args', () => {
    expect(Object.keys(Get.args)).toEqual(['key'])
  })
  test('flags', () => {
    expect(Object.keys(Get.flags).sort()).toEqual(['region'])
    expect(Get.flags.region.options).toEqual(['amer', 'emea', 'apac'])
    expect(Get.enableJsonFlag).toEqual(true)
  })
})

describe('run', () => {
  let command
  beforeEach(async () => {
    command = new Get([])
    command.config = {
      runHook: jest.fn().mockResolvedValue({})
    }
  })

  test('state throws', async () => {
    command.argv = ['key']
    await command.init()

    mockStateGet.mockRejectedValue('error fake')
    await expect(command.run()).rejects.toBe('error fake')
  })

  test('state throws --json', async () => {
    command.argv = ['key', '--json']
    await command.init()

    mockStateGet.mockRejectedValue('error fake')
    await expect(command.run()).rejects.toBe('error fake')
  })

  test('key does not exist', async () => {
    command.argv = ['key']
    await command.init()

    mockStateGet.mockResolvedValue(null)
    await expect(command.run()).rejects.toThrow('key does not exist')
  })

  test('key exists', async () => {
    command.argv = ['key']
    await command.init()

    const fakeDate = (new Date()).toISOString()
    mockStateGet.mockResolvedValue({ value: 'value', expiration: fakeDate })
    await expect(command.run()).resolves.toEqual({ value: 'value', expiration: fakeDate })
    expect(stdout.output).toBe('value')
    expect(stderr.output).toBe(`\n> expiration: ${new Date(fakeDate).toLocaleString()} (local time)\n`)
  })

  test('key exists --json', async () => {
    command.argv = ['key', '--json']
    await command.init()

    const fakeDate = (new Date()).toISOString()
    mockStateGet.mockResolvedValue({ value: 'value', expiration: fakeDate })
    await expect(command.run()).resolves.toEqual({ value: 'value', expiration: fakeDate }) // --json return value

    // we just want to check that both outputs are empty, oclif will then output the json
    expect(stdout.output).toBe('')
    expect(stderr.output).toBe('')
  })
})
