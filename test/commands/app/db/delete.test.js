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
import { expect, jest, test } from '@jest/globals'
import { stdout, stderr } from 'stdout-stderr'
import { DeleteDb } from '../../../../src/commands/app/db/delete.js'
import { DBBaseCommand } from '../../../../src/DBBaseCommand.js'
import { DB_STATUS } from '../../../../src/constants/db.js'

// Use the global DB mock
const mockDB = global.mockDBInstance

// Mock inquirer confirm and input
const mockConfirm = jest.fn()
const mockInput = jest.fn()
jest.unstable_mockModule('@inquirer/prompts', () => ({
  confirm: mockConfirm,
  input: mockInput
}))

describe('prototype', () => {
  test('extends DBBaseCommand', () => {
    expect(DeleteDb.prototype instanceof DBBaseCommand).toBe(true)
  })
  test('flags', () => {
    const expectedFlags = Object.keys(DBBaseCommand.flags).concat(['force']).sort()
    expect(Object.keys(DeleteDb.flags).sort()).toEqual(expectedFlags)
    expect(DeleteDb.enableJsonFlag).toEqual(true)
  })
})

describe('run', () => {
  let command
  beforeEach(async () => {
    command = new DeleteDb([])
    command.config = {
      runHook: jest.fn().mockResolvedValue({})
    }

    // Reset mocks
    mockConfirm.mockReset()
  })

  test('should delete provisioned database with confirmation', async () => {
    command.argv = []
    await command.init()

    mockConfirm.mockResolvedValue(true)
    mockInput.mockResolvedValue('test-namespace')
    mockDB.deleteDatabase.mockResolvedValue({ status: DB_STATUS.DELETED })

    const result = await command.run()
    expect(mockConfirm).toHaveBeenCalled()
    expect(mockDB.deleteDatabase).toHaveBeenCalled()
    expect(result.status).toBe('DELETED')
    expect(stdout.output).toContain('Database deleted successfully')
  })

  test.each([
    { apiStatus: DB_STATUS.NOT_PROVISIONED, expectedStatus: 'not_provisioned' },
    { apiStatus: DB_STATUS.REQUESTED, expectedStatus: 'requested' }
  ])('should warn and return if api returns status other than DELETED', async ({ apiStatus, expectedStatus }) => {
    command.argv = []
    await command.init()

    mockConfirm.mockResolvedValue(true)
    mockInput.mockResolvedValue('test-namespace')
    mockDB.deleteDatabase.mockResolvedValue({ status: apiStatus })

    const result = await command.run()
    expect(result.status).toBe(expectedStatus.toUpperCase())
    expect(stderr.output).toContain(`Delete request returned status '${apiStatus}'`)
  })

  test('should cancel deletion when user does not confirm', async () => {
    command.argv = []
    await command.init()

    mockConfirm.mockResolvedValue(false)
    mockInput.mockReset()

    const result = await command.run()
    expect(result).toEqual({ status: 'cancelled' })
    expect(mockDB.deleteDatabase).not.toHaveBeenCalled()
  })

  test('should skip confirmation when --force is provided', async () => {
    command.argv = []
    await command.init()

    command.flags.force = true

    mockDB.deleteDatabase.mockResolvedValue({ status: DB_STATUS.DELETED })

    const result = await command.run()
    expect(mockConfirm).not.toHaveBeenCalled()
    expect(mockInput).not.toHaveBeenCalled()
    expect(mockDB.deleteDatabase).toHaveBeenCalled()
    expect(result.status).toBe('DELETED')
  })

  test('should abort when typed confirmation does not match', async () => {
    command.argv = []
    await command.init()

    mockConfirm.mockResolvedValue(true)
    mockInput.mockResolvedValue('wrong-namespace')

    await expect(command.run()).rejects.toThrow('confirmation did not match, aborted')
    expect(mockDB.deleteDatabase).not.toHaveBeenCalled()
  })

  test('should block production namespace', async () => {
    command.argv = []
    // set production-like namespace
    global.fakeConfig['runtime.namespace'] = '12345-prodapp'
    await command.init()

    await expect(command.run()).rejects.toThrow('A production database may not be deleted directly')
  })

  test('should surface error from catch', async () => {
    command.argv = []
    await command.init()

    mockConfirm.mockResolvedValue(true)
    mockInput.mockResolvedValue('test-namespace')
    mockDB.deleteDatabase.mockRejectedValue(new Error('Network error'))

    await expect(command.run()).rejects.toThrow('Database deletion failed: Network error')
  })

  test('should return unknown status when deleteDatabase returns undefined', async () => {
    command.argv = []
    await command.init()

    mockConfirm.mockResolvedValue(true)
    mockInput.mockResolvedValue('test-namespace')
    // deleteDatabase returns undefined
    mockDB.deleteDatabase.mockResolvedValue(undefined)

    const result = await command.run()
    expect(result.status).toBe('UNKNOWN')
    expect(stderr.output).toContain("Delete request returned status 'UNKNOWN'")
  })
})
