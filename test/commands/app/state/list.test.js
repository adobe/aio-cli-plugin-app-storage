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
import { List } from '../../../../src/commands/app/state/list.js'
import { expect, jest, test } from '@jest/globals'
import { stdout, stderr } from 'stdout-stderr'
import { StateBaseCommand } from '../../../../src/StateBaseCommand.js'

// mock state
/** @type {import('@jest/globals').jest.Mock} */
const mockStateList = global.getStateInstanceMock().list

const mockStateListKeys = (keysIter = []) => {
  mockStateList.mockImplementation(() => {
    return {
      [Symbol.asyncIterator]: () => {
        let i = 0
        return {
          next: () => {
            if (i < keysIter.length) {
              return Promise.resolve({ value: { keys: keysIter[i++] }, done: false })
            } else {
              return Promise.resolve({ value: undefined, done: true })
            }
          }
        }
      }
    }
  })
}

describe('prototype', () => {
  test('extends', () => {
    expect(List.prototype instanceof StateBaseCommand).toBe(true)
  })
  test('args', () => {
    expect(Object.keys(List.args)).toEqual([])
  })
  test('flags', () => {
    expect(Object.keys(List.flags).sort()).toEqual(['match', 'region'])
    expect(List.flags.region.options).toEqual(['amer', 'emea', 'apac', 'aus'])
    expect(List.enableJsonFlag).toEqual(true)
  })
})

describe('run', () => {
  let command
  beforeEach(async () => {
    command = new List([])
    command.config = {
      runHook: jest.fn().mockResolvedValue({})
    }
  })

  test('state.list --match no value', async () => {
    command.argv = ['--match']
    await expect(command.init()).rejects.toThrow('Flag --match expects a value')
  })

  test('state.list throws', async () => {
    command.argv = []
    await command.init()

    mockStateList.mockImplementation(() => { throw new Error('error fake') })
    await expect(command.run()).rejects.toThrow('error fake')
  })

  test('state.list throws on next', async () => {
    command.argv = []
    await command.init()

    mockStateList.mockImplementation(() => {
      return {
        [Symbol.asyncIterator]: () => {
          return {
            next: () => {
              return Promise.reject(new Error('error fake'))
            }
          }
        }
      }
    })

    await expect(command.run()).rejects.toThrow('error fake')
  })

  test('list empty', async () => {
    command.argv = []
    await command.init()

    mockStateListKeys([])
    await expect(command.run()).resolves.toEqual([])
    expect(stdout.output).toBe('')
  })

  test('list one item', async () => {
    command.argv = []
    await command.init()

    mockStateListKeys([['a']])
    await expect(command.run()).resolves.toEqual(['a'])
    expect(stdout.output).toBe('a\n')
  })

  test('list one item --json', async () => {
    command.argv = ['--json']
    await command.init()

    mockStateListKeys([['a']])
    await expect(command.run()).resolves.toEqual(['a'])
    expect(stdout.output).toBe('') // json
  })

  test('list 5 items per iteration over 5 iterations', async () => {
    command.argv = []
    await command.init()

    const keys = new Array(25).fill().map((_, i) => `key${i}`)
    mockStateListKeys([
      keys.slice(0, 5),
      keys.slice(5, 10),
      keys.slice(10, 15),
      keys.slice(15, 20),
      keys.slice(20, 25)
    ])

    await expect(command.run()).resolves.toEqual(keys)
    expect(stdout.output).toBe(keys.join('\n') + '\n')
  })

  test('list --match', async () => {
    command.argv = ['--match', 'key*']
    await command.init()

    const keys = new Array(25).fill().map((_, i) => `key${i}`)
    mockStateListKeys([
      keys.slice(0, 5),
      keys.slice(5, 10),
      keys.slice(10, 15),
      keys.slice(15, 20),
      keys.slice(20, 25)
    ])

    await expect(command.run()).resolves.toEqual(keys)
    expect(stdout.output).toBe(keys.join('\n') + '\n')
  })

  test('list returns above MAX_KEYS', async () => {
    command.argv = []
    await command.init()

    const keys = new Array(5010).fill().map((_, i) => `key${i}`)
    mockStateListKeys([
      keys.slice(0, 1000),
      keys.slice(1000, 5010)
    ])

    await expect(command.run()).resolves.toEqual(keys.slice(0, 5000)) // truncate
    expect(stdout.output).toBe(keys.slice(0, 5000).join('\n') + '\n')
    expect(stderr.output).toBe('> Warning: Too many keys found, only the first 5000 keys are displayed\n> Use --match to filter keys\n')
  })
})
