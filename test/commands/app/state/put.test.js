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
import { Put } from '../../../../src/commands/app/state/put.js'
import { expect, jest } from '@jest/globals'
import { stdout, stderr } from 'stdout-stderr'
import { DEFAULT_TTL_SECONDS } from '../../../../src/constants.js'
import { BaseCommand } from '../../../../src/BaseCommand.js'

/** @type {import('@jest/globals').jest.Mock} */
const mockStatePut = global.getStateInstanceMock().put

const getDateString = (ttl) => (new Date(ttl * 1000 + Date.now())).toISOString()

describe('prototype', () => {
  test('extends', () => {
    expect(Put.prototype instanceof BaseCommand).toBe(true)
  })
  test('args', () => {
    expect(Object.keys(Put.args)).toEqual(['key', 'value'])
  })
  test('flags', () => {
    expect(Object.keys(Put.flags).sort()).toEqual(['region', 'ttl'])
    expect(Put.flags.region.options).toEqual(['amer', 'emea', 'apac', 'aus'])
    expect(Put.enableJsonFlag).toEqual(true)
  })
})

describe('run', () => {
  let command
  beforeEach(async () => {
    command = new Put([])
    command.config = {
      runHook: jest.fn().mockResolvedValue({})
    }
  })

  test('state throws', async () => {
    command.argv = ['key', 'value']
    await command.init()

    mockStatePut.mockRejectedValue('error fake')
    await expect(command.run()).rejects.toBe('error fake')
  })

  test('put key value', async () => {
    command.argv = ['key', 'value']
    await command.init()

    await expect(command.run()).resolves.toEqual({ key: 'key', bytesValue: 5, expiration: getDateString(DEFAULT_TTL_SECONDS) })
    expect(stdout.output).toBe('key')
    expect(stderr.output).toBe(`\n> expiration:   ${new Date(getDateString(DEFAULT_TTL_SECONDS)).toLocaleString()} (local time)\n> bytes value:  5\n`)
  })

  test('put key value --ttl 3600', async () => {
    command.argv = ['key2', 'valuevalue', '--ttl', '3600']
    await command.init()

    await expect(command.run()).resolves.toEqual({ key: 'key2', bytesValue: 10, expiration: getDateString(3600) })
    expect(stdout.output).toBe('key2')
  })

  test('put key value --json', async () => {
    command.argv = ['key', 'value', '--json']
    await command.init()

    await expect(command.run()).resolves.toEqual({ key: 'key', bytesValue: 5, expiration: getDateString(DEFAULT_TTL_SECONDS) })
    // oclif will output to stdout accordingly
    expect(stdout.output).toBe('')
    expect(stderr.output).toBe('')
  })
})
