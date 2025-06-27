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
import { Delete } from '../../../../src/commands/app/state/delete.js'
import { expect, jest } from '@jest/globals'
import { stdout, stderr } from 'stdout-stderr'
import { StateBaseCommand } from '../../../../src/StateBaseCommand.js'

// mock state
const mockStateInstance = global.getStateInstanceMock()
/** @type {import('@jest/globals').jest.Mock} */
const mockStateDelete = mockStateInstance.delete
/** @type {import('@jest/globals').jest.Mock} */
const mockStateDeleteAll = mockStateInstance.deleteAll
/** @type {import('@jest/globals').jest.Mock} */
const mockStateAny = mockStateInstance.any

/** @type {import('@jest/globals').jest.Mock} */
const mockPromptInput = global.getPromptInstanceMock().input

describe('prototype', () => {
  test('extends', () => {
    expect(Delete.prototype instanceof StateBaseCommand).toBe(true)
  })
  test('args', () => {
    expect(Object.keys(Delete.args)).toEqual(['keys'])
  })
  test('flags', () => {
    expect(Object.keys(Delete.flags).sort()).toEqual(['force', 'match', 'region'])
    expect(Delete.flags.region.options).toEqual(['amer', 'emea', 'apac'])
    expect(Delete.enableJsonFlag).toEqual(true)
  })
})

describe('run', () => {
  let command
  beforeEach(async () => {
    command = new Delete([])
    command.config = {
      runHook: jest.fn().mockResolvedValue({})
    }
    mockStateAny.mockResolvedValue(true)
  })

  test('state.any throws', async () => {
    command.argv = ['key']
    await command.init()

    mockStateAny.mockRejectedValue('error fake')
    await expect(command.run()).rejects.toBe('error fake')
  })

  test('state.delete throws', async () => {
    command.argv = ['key']
    await command.init()

    mockStateDelete.mockRejectedValue('error fake')
    await expect(command.run()).rejects.toBe('error fake')
  })

  test('state.delete --match no value', async () => {
    command.argv = ['--match']
    await expect(command.init()).rejects.toThrow('Flag --match expects a value')
  })

  test('no keys in container', async () => {
    command.argv = ['key']
    await command.init()
    mockStateAny.mockResolvedValue(false)
    await expect(command.run()).rejects.toThrow('there are no keys stored in \'test-namespace\'!')
  })

  test('--match and args', async () => {
    command.argv = ['key', '--match', 'glob']
    await command.init()
    await expect(command.run()).rejects.toThrow('cannot use --match with args')
  })

  test('--match nor args', async () => {
    command.argv = []
    await command.init()
    await expect(command.run()).rejects.toThrow('please provide either keys args or --match')
  })

  test('delete key exists', async () => {
    command.argv = ['key']
    await command.init()

    mockStateDelete.mockResolvedValue('key')
    await expect(command.run()).resolves.toEqual({ keys: 1 })
    expect(mockPromptInput).toHaveBeenCalledTimes(0)
    expect(stdout.output).toBe('keys deleted: 1\n')

    expect(mockStateDeleteAll).not.toHaveBeenCalled()
    expect(mockStateDelete).toHaveBeenCalledTimes(1)
    expect(mockStateDelete).toHaveBeenCalledWith('key')
  })

  test('delete key exists --json', async () => {
    command.argv = ['key', '--json']
    await command.init()

    mockStateDelete.mockResolvedValue('key')
    await expect(command.run()).resolves.toEqual({ keys: 1 })
    expect(mockPromptInput).toHaveBeenCalledTimes(0)
    expect(stdout.output).toBe('') // --json will go to stdout

    expect(mockStateDeleteAll).not.toHaveBeenCalled()
    expect(mockStateDelete).toHaveBeenCalledTimes(1)
    expect(mockStateDelete).toHaveBeenCalledWith('key')
  })

  test('delete key not exist', async () => {
    command.argv = ['key']
    await command.init()

    mockStateDelete.mockResolvedValue(null)
    await expect(command.run()).resolves.toEqual({ keys: 0 })
    expect(mockPromptInput).toHaveBeenCalledTimes(0)
    expect(stdout.output).toBe('keys deleted: 0\n')

    expect(mockStateDeleteAll).not.toHaveBeenCalled()
    expect(mockStateDelete).toHaveBeenCalledTimes(1)
    expect(mockStateDelete).toHaveBeenCalledWith('key')
  })

  test('delete <5 keys> => no prompt', async () => {
    command.argv = ['key', 'key1', 'key2', 'key3', 'key4']
    await command.init()

    mockStateDelete.mockResolvedValueOnce('key')
    mockStateDelete.mockResolvedValueOnce(null) // one key does not exist
    mockStateDelete.mockResolvedValueOnce('key2')
    mockStateDelete.mockResolvedValueOnce('key3')
    mockStateDelete.mockResolvedValueOnce('key4')

    await expect(command.run()).resolves.toEqual({ keys: 4 })

    expect(mockPromptInput).toHaveBeenCalledTimes(0)
    expect(stdout.output).toBe('keys deleted: 4\n')

    expect(mockStateDeleteAll).not.toHaveBeenCalled()

    expect(mockStateDelete).toHaveBeenCalledTimes(5)
    expect(mockStateDelete).toHaveBeenCalledWith('key')
    expect(mockStateDelete).toHaveBeenCalledWith('key1')
    expect(mockStateDelete).toHaveBeenCalledWith('key2')
    expect(mockStateDelete).toHaveBeenCalledWith('key3')
    expect(mockStateDelete).toHaveBeenCalledWith('key4')
  })

  test('delete <6 keys> => prompt confirm', async () => {
    command.argv = ['key', 'key1', 'key2', 'key3', 'key4', 'key5']
    await command.init()

    mockStateDelete.mockResolvedValue('fakestring')
    mockPromptInput.mockResolvedValueOnce(global.fakeConfig['runtime.namespace'])

    await expect(command.run()).resolves.toEqual({ keys: 6 })

    expect(stderr.output).toBe('❌ CAUTION, you specified 6 key-values to delete\n')

    expect(mockPromptInput).toHaveBeenCalledTimes(1)
    expect(mockPromptInput).toHaveBeenCalledWith(
      { message: `confirm deletion by typing: '${global.fakeConfig['runtime.namespace']}'` },
      { output: process.stderr }
    )
    expect(stdout.output).toBe('keys deleted: 6\n')
    expect(mockStateDelete).toHaveBeenCalledTimes(6)

    expect(mockStateDelete).toHaveBeenCalledWith('key')
    expect(mockStateDelete).toHaveBeenCalledWith('key1')
    expect(mockStateDelete).toHaveBeenCalledWith('key2')
    expect(mockStateDelete).toHaveBeenCalledWith('key3')
    expect(mockStateDelete).toHaveBeenCalledWith('key4')
    expect(mockStateDelete).toHaveBeenCalledWith('key5')
  })

  test('delete <6 keys> --force', async () => {
    command.argv = ['key', 'key1', 'key2', 'key3', 'key4', 'key5', '--force']
    await command.init()

    mockStateDelete.mockResolvedValue('fakestring')
    mockPromptInput.mockResolvedValueOnce(global.fakeConfig['runtime.namespace'])

    await expect(command.run()).resolves.toEqual({ keys: 6 })

    expect(stderr.output).toBe('')

    expect(mockPromptInput).toHaveBeenCalledTimes(0)
    expect(stdout.output).toBe('keys deleted: 6\n')
    expect(mockStateDelete).toHaveBeenCalledTimes(6)

    expect(mockStateDelete).toHaveBeenCalledWith('key')
    expect(mockStateDelete).toHaveBeenCalledWith('key1')
    expect(mockStateDelete).toHaveBeenCalledWith('key2')
    expect(mockStateDelete).toHaveBeenCalledWith('key3')
    expect(mockStateDelete).toHaveBeenCalledWith('key4')
    expect(mockStateDelete).toHaveBeenCalledWith('key5')
  })

  test('delete <6 keys> => prompt fail confirm', async () => {
    command.argv = ['key', 'key1', 'key2', 'key3', 'key4', 'key5']
    await command.init()

    mockStateDelete.mockResolvedValue('fakestring')
    mockPromptInput.mockResolvedValueOnce('no')

    await expect(command.run()).rejects.toThrow('confirmation did not match, aborted')

    expect(stderr.output).toBe('❌ CAUTION, you specified 6 key-values to delete\n')
    expect(mockPromptInput).toHaveBeenCalledTimes(1)
    expect(mockPromptInput).toHaveBeenCalledWith(
      { message: `confirm deletion by typing: '${global.fakeConfig['runtime.namespace']}'` },
      { output: process.stderr }
    )
    expect(mockStateDelete).not.toHaveBeenCalled()
    expect(mockStateDeleteAll).not.toHaveBeenCalled()
  })

  test('delete --match gl*b', async () => {
    command.argv = ['--match', 'gl*b']
    await command.init()

    mockStateDeleteAll.mockResolvedValue({ keys: 6 })
    mockPromptInput.mockResolvedValueOnce(global.fakeConfig['runtime.namespace'])

    await expect(command.run()).resolves.toEqual({ keys: 6 })

    expect(stderr.output).toBe('❌ CAUTION, this will delete key-values matching the pattern \'gl*b\'\n')

    expect(mockPromptInput).toHaveBeenCalledTimes(1)
    expect(mockPromptInput).toHaveBeenCalledWith(
      { message: `confirm deletion by typing: '${global.fakeConfig['runtime.namespace']}'` },
      { output: process.stderr }
    )
    expect(stdout.output).toBe('keys deleted: 6\n')
    expect(mockStateDelete).not.toHaveBeenCalled()
    expect(mockStateDeleteAll).toHaveBeenCalledWith({ match: 'gl*b' })
  })

  test('delete --match gl*b --force', async () => {
    command.argv = ['--match', 'gl*b', '--force']
    await command.init()

    mockStateDeleteAll.mockResolvedValue({ keys: 6 })
    mockPromptInput.mockResolvedValueOnce(global.fakeConfig['runtime.namespace'])

    await expect(command.run()).resolves.toEqual({ keys: 6 })

    expect(stderr.output).toBe('')

    expect(mockPromptInput).toHaveBeenCalledTimes(0)
    expect(stdout.output).toBe('keys deleted: 6\n')
    expect(mockStateDelete).not.toHaveBeenCalled()
    expect(mockStateDeleteAll).toHaveBeenCalledWith({ match: 'gl*b' })
  })

  test('delete --match gl*b --force <nokeys>', async () => {
    command.argv = ['--match', 'gl*b', '--force']
    await command.init()

    mockStateDeleteAll.mockResolvedValue({ keys: 0 })
    mockPromptInput.mockResolvedValueOnce(global.fakeConfig['runtime.namespace'])

    await expect(command.run()).resolves.toEqual({ keys: 0 })

    expect(stderr.output).toBe('')

    expect(mockPromptInput).toHaveBeenCalledTimes(0)
    expect(stdout.output).toBe('keys deleted: 0\n')
    expect(mockStateDelete).not.toHaveBeenCalled()
    expect(mockStateDeleteAll).toHaveBeenCalledWith({ match: 'gl*b' })
  })

  test('delete --match gl*b => prompt fail confirm', async () => {
    command.argv = ['--match', 'gl*b']
    await command.init()

    mockPromptInput.mockResolvedValueOnce('no')

    await expect(command.run()).rejects.toThrow('confirmation did not match, aborted')

    expect(stderr.output).toBe('❌ CAUTION, this will delete key-values matching the pattern \'gl*b\'\n')
    expect(mockPromptInput).toHaveBeenCalledTimes(1)
    expect(mockPromptInput).toHaveBeenCalledWith(
      { message: `confirm deletion by typing: '${global.fakeConfig['runtime.namespace']}'` },
      { output: process.stderr }
    )
    expect(mockStateDelete).not.toHaveBeenCalled()
    expect(mockStateDeleteAll).not.toHaveBeenCalled()
  })

  test('delete --match *', async () => {
    command.argv = ['--match', '*']
    await command.init()

    mockStateDeleteAll.mockResolvedValue({ keys: 6 })
    mockPromptInput.mockResolvedValueOnce(global.fakeConfig['runtime.namespace'])

    await expect(command.run()).resolves.toEqual({ keys: 6 })

    expect(stderr.output).toBe('❌ CAUTION, this will delete ALL key-values!\n')

    expect(mockPromptInput).toHaveBeenCalledTimes(1)
    expect(mockPromptInput).toHaveBeenCalledWith(
      { message: `confirm deletion by typing: '${global.fakeConfig['runtime.namespace']}'` },
      { output: process.stderr }
    )
    expect(stdout.output).toBe('keys deleted: 6\n')
    expect(mockStateDelete).not.toHaveBeenCalled()
    expect(mockStateDeleteAll).toHaveBeenCalledWith({ match: '*' })
  })

  test('delete --match * --force', async () => {
    command.argv = ['--match', '*', '--force']
    await command.init()

    mockStateDeleteAll.mockResolvedValue({ keys: 6 })
    mockPromptInput.mockResolvedValueOnce(global.fakeConfig['runtime.namespace'])

    await expect(command.run()).resolves.toEqual({ keys: 6 })

    expect(stderr.output).toBe('')

    expect(mockPromptInput).toHaveBeenCalledTimes(0)
    expect(stdout.output).toBe('keys deleted: 6\n')
    expect(mockStateDelete).not.toHaveBeenCalled()
    expect(mockStateDeleteAll).toHaveBeenCalledWith({ match: '*' })
  })

  test('delete --match * => prompt fail confirm', async () => {
    command.argv = ['--match', '*']
    await command.init()

    mockPromptInput.mockResolvedValueOnce('no')

    await expect(command.run()).rejects.toThrow('confirmation did not match, aborted')

    expect(stderr.output).toBe('❌ CAUTION, this will delete ALL key-values!\n')
    expect(mockPromptInput).toHaveBeenCalledTimes(1)
    expect(mockPromptInput).toHaveBeenCalledWith(
      { message: `confirm deletion by typing: '${global.fakeConfig['runtime.namespace']}'` },
      { output: process.stderr }
    )
    expect(mockStateDelete).not.toHaveBeenCalled()
    expect(mockStateDeleteAll).not.toHaveBeenCalled()
  })
})
