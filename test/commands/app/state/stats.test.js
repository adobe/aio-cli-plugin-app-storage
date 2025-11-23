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
import { Stats } from '../../../../src/commands/app/state/stats.js'
import { expect, jest } from '@jest/globals'
import { stdout } from 'stdout-stderr'
import { BaseCommand } from '../../../../src/BaseCommand.js'

// mock state
/** @type {import('@jest/globals').jest.Mock} */
const mockStateStats = global.getStateInstanceMock().stats

describe('prototype', () => {
  test('extends', () => {
    expect(Stats.prototype instanceof BaseCommand).toBe(true)
  })
  test('args', () => {
    expect(Object.keys(Stats.args)).toEqual([])
  })
  test('flags', () => {
    expect(Object.keys(Stats.flags).sort()).toEqual(['region'])
    expect(Stats.flags.region.options).toEqual(['amer', 'emea', 'apac', 'aus'])
    expect(Stats.enableJsonFlag).toEqual(true)
  })
})

describe('run', () => {
  let command
  beforeEach(async () => {
    command = new Stats([])
    command.config = {
      runHook: jest.fn().mockResolvedValue({})
    }
  })

  test('state.stats throws', async () => {
    command.argv = []
    await command.init()

    mockStateStats.mockRejectedValue('error fake')
    await expect(command.run()).rejects.toBe('error fake')
  })

  test('state.stats throws --json', async () => {
    command.argv = ['--json']
    await command.init()

    mockStateStats.mockRejectedValue('error fake')
    await expect(command.run()).rejects.toBe('error fake')
  })

  test('state.stats', async () => {
    command.argv = []
    await command.init()

    mockStateStats.mockResolvedValue({ keys: 1, bytesKeys: 2, bytesValues: 3 })
    await expect(command.run()).resolves.toEqual({ keys: 1, bytesKeys: 2, bytesValues: 3 })
    expect(stdout.output).toBe(`stored in '${global.fakeConfig['runtime.namespace']}'\n  keys:          1\n  bytes keys:    2\n  bytes values:  3\n`)
  })
  test('state.stats --json', async () => {
    command.argv = ['--json']
    await command.init()

    mockStateStats.mockResolvedValue({ keys: 1, bytesKeys: 2, bytesValues: 3 })
    await expect(command.run()).resolves.toEqual({ keys: 1, bytesKeys: 2, bytesValues: 3 })
    expect(stdout.output).toBe('')
  })
})
