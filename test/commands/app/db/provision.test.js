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
import { Provision } from '../../../../src/commands/app/db/provision.js'
import { expect, jest } from '@jest/globals'
import { stdout, stderr } from 'stdout-stderr'
import { DBBaseCommand } from '../../../../src/DBBaseCommand.js'
import { DB_STATUS, DEFAULT_REGION, AVAILABLE_REGIONS } from '../../../../src/constants/db.js'

// Use the global DB mock
const mockProvisionStatus = global.mockDBInstance.provisionStatus
const mockProvisionRequest = global.mockDBInstance.provisionRequest

// Mock inquirer prompts
const mockConfirm = jest.fn()
jest.unstable_mockModule('@inquirer/prompts', () => ({
  confirm: mockConfirm
}))

describe('prototype', () => {
  test('extends DBBaseCommand', () => {
    expect(Provision.prototype instanceof DBBaseCommand).toBe(true)
  })
  test('args', () => {
    expect(Object.keys(Provision.args)).toEqual([])
  })
  test('flags', () => {
    expect(Object.keys(Provision.flags).sort()).toEqual(['region'])
    expect(Provision.flags.region.options).toEqual(AVAILABLE_REGIONS)
    expect(Provision.flags.region.default).toBe(DEFAULT_REGION)
    expect(Provision.enableJsonFlag).toEqual(true)
  })
})

describe('run', () => {
  let command
  beforeEach(async () => {
    command = new Provision([])
    command.config = {
      runHook: jest.fn().mockResolvedValue({})
    }

    // Reset mocks
    mockProvisionStatus.mockReset()
    mockProvisionRequest.mockReset()
    mockConfirm.mockReset()
  })

  describe('already provisioned', () => {
    test('database already provisioned', async () => {
      command.argv = []
      await command.init()

      const existingStatus = {
        status: DB_STATUS.PROVISIONED,
        region: 'amer',
        created: '2024-01-01T00:00:00Z'
      }
      mockProvisionStatus.mockResolvedValue(existingStatus)

      const result = await command.run()

      expect(result).toEqual({
        status: 'already_provisioned',
        namespace: 'test-namespace',
        region: 'amer',
        details: existingStatus
      })
      expect(mockProvisionRequest).not.toHaveBeenCalled()
    })

    test('database in progress', async () => {
      command.argv = []
      await command.init()

      const inProgressStatus = {
        status: DB_STATUS.PROCESSING,
        region: 'amer'
      }
      mockProvisionStatus.mockResolvedValue(inProgressStatus)

      const result = await command.run()

      expect(result).toEqual({
        status: 'in_progress',
        namespace: 'test-namespace',
        region: 'amer',
        details: inProgressStatus
      })
      expect(mockProvisionRequest).not.toHaveBeenCalled()
    })

    test('previous provision failed, continues with new attempt', async () => {
      command.argv = []
      await command.init()

      const failedStatus = {
        status: DB_STATUS.FAILED,
        region: 'amer'
      }
      mockProvisionStatus.mockResolvedValue(failedStatus)
      mockConfirm.mockResolvedValue(true)
      mockProvisionRequest.mockResolvedValue({
        status: DB_STATUS.REQUESTED,
        region: 'amer'
      })

      const result = await command.run()

      expect(result.status).toBe('requested')
      expect(mockProvisionRequest).toHaveBeenCalledWith({ region: 'amer' })
    })

    test('previous provision rejected, continues with new attempt', async () => {
      command.argv = []
      await command.init()

      const rejectedStatus = {
        status: DB_STATUS.REJECTED,
        region: 'amer'
      }
      mockProvisionStatus.mockResolvedValue(rejectedStatus)
      mockConfirm.mockResolvedValue(true)
      mockProvisionRequest.mockResolvedValue({
        status: DB_STATUS.REQUESTED,
        region: 'amer'
      })

      const result = await command.run()

      expect(result.status).toBe('requested')
      expect(mockProvisionRequest).toHaveBeenCalledWith({ region: 'amer' })
      expect(stdout.output).toContain('Previous database provisioning request was rejected')
      expect(stdout.output).toContain('If the problem persists, please contact the App Builder team')
    })
  })

  describe('new provision', () => {
    test('no existing database, user confirms', async () => {
      command.argv = []
      await command.init()

      mockProvisionStatus.mockRejectedValue(new Error('not found'))
      mockConfirm.mockResolvedValue(true)
      mockProvisionRequest.mockResolvedValue({
        status: DB_STATUS.REQUESTED,
        region: 'amer'
      })

      const result = await command.run()

      expect(mockConfirm).toHaveBeenCalledWith({
        message: "Provision database for namespace 'test-namespace'?",
        default: false
      })
      expect(mockProvisionRequest).toHaveBeenCalledWith({ region: 'amer' })
      expect(result).toEqual({
        status: 'requested',
        namespace: 'test-namespace',
        region: 'amer',
        timestamp: expect.any(String),
        details: {
          status: DB_STATUS.REQUESTED,
          region: 'amer'
        }
      })
    })

    test('user cancels provision', async () => {
      command.argv = []
      await command.init()

      mockProvisionStatus.mockRejectedValue(new Error('not found'))
      mockConfirm.mockResolvedValue(false)

      const result = await command.run()

      expect(result).toEqual({ status: 'cancelled' })
      expect(mockProvisionRequest).not.toHaveBeenCalled()
    })

    test('provision with custom region', async () => {
      command.argv = ['--region', 'emea']
      await command.init()

      mockProvisionStatus.mockRejectedValue(new Error('not found'))
      mockConfirm.mockResolvedValue(true)
      mockProvisionRequest.mockResolvedValue({
        status: DB_STATUS.PROVISIONED,
        region: 'emea'
      })

      const result = await command.run()

      expect(mockProvisionRequest).toHaveBeenCalledWith({ region: 'emea' })
      expect(result.region).toBe('emea')
    })
  })

  describe('provision results', () => {
    beforeEach(() => {
      mockProvisionStatus.mockRejectedValue(new Error('not found'))
      mockConfirm.mockResolvedValue(true)
    })

    test('instant provisioning success', async () => {
      command.argv = []
      await command.init()

      mockProvisionRequest.mockResolvedValue({
        status: DB_STATUS.PROVISIONED,
        region: 'amer'
      })

      const result = await command.run()

      expect(result.status).toBe('provisioned')
      expect(stdout.output).toContain('Database provisioned successfully and ready for use!')
    })

    test('provision request submitted', async () => {
      command.argv = []
      await command.init()

      mockProvisionRequest.mockResolvedValue({
        status: DB_STATUS.REQUESTED,
        region: 'amer'
      })

      const result = await command.run()

      expect(result.status).toBe('requested')
      expect(stdout.output).toContain('Database provisioning request submitted successfully')
    })

    test('provision processing', async () => {
      command.argv = []
      await command.init()

      mockProvisionRequest.mockResolvedValue({
        status: DB_STATUS.PROCESSING,
        region: 'amer'
      })

      const result = await command.run()

      expect(result.status).toBe('processing')
      expect(stdout.output).toContain('Database is being provisioned...')
    })

    test('provision failed', async () => {
      command.argv = []
      await command.init()

      mockProvisionRequest.mockResolvedValue({
        status: DB_STATUS.FAILED,
        message: 'Provisioning failed due to quota limits'
      })

      await expect(command.run()).rejects.toThrow('Database provisioning failed: Provisioning failed due to quota limits')
    })

    test('provision rejected', async () => {
      command.argv = []
      await command.init()

      mockProvisionRequest.mockResolvedValue({
        status: DB_STATUS.REJECTED,
        message: 'Request rejected due to policy violation'
      })

      await expect(command.run()).rejects.toThrow('Database provisioning request was rejected: Request rejected due to policy violation')
    })

    test('provision unknown status', async () => {
      command.argv = []
      await command.init()

      mockProvisionRequest.mockResolvedValue({
        status: 'NEW_UNKNOWN_STATUS',
        region: 'amer'
      })

      const result = await command.run()

      expect(result.status).toBe('new_unknown_status')
      expect(stderr.output).toContain('Database provisioning request returned unexpected status \'NEW_UNKNOWN_STATUS\'')
      expect(stderr.output).toContain('If the issue persists, please contact the App Builder team')
    })
  })

  describe('error handling', () => {
    test('db client throws error', async () => {
      command.argv = []
      await command.init()

      mockProvisionStatus.mockRejectedValue(new Error('not found'))
      mockConfirm.mockResolvedValue(true)
      mockProvisionRequest.mockRejectedValue(new Error('Network error'))

      await expect(command.run()).rejects.toThrow('Database provisioning failed: Network error')
    })
  })

  describe('json output', () => {
    test('json flag suppresses console output', async () => {
      command.argv = ['--json']
      await command.init()

      mockProvisionStatus.mockRejectedValue(new Error('not found'))
      mockConfirm.mockResolvedValue(true)
      mockProvisionRequest.mockResolvedValue({
        status: DB_STATUS.PROVISIONED,
        region: 'amer'
      })

      const result = await command.run()

      expect(result.status).toBe('provisioned')
      // Next steps should not be shown with --json
      expect(stdout.output).not.toContain('Next steps:')
    })
  })
})
