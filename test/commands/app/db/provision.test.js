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
import { Provision } from '../../../../src/commands/app/db/provision.js'
import { expect, jest } from '@jest/globals'
import { stdout, stderr } from 'stdout-stderr'
import { DBBaseCommand } from '../../../../src/DBBaseCommand.js'
import { DB_STATUS } from '../../../../src/constants/db.js'

// Use the global DB mock
const mockProvisionStatus = global.mockDBInstance.provisionStatus
const mockProvisionRequest = global.mockDBInstance.provisionRequest

// Mock inquirer prompts
const mockConfirm = jest.fn()
jest.unstable_mockModule('@inquirer/prompts', () => ({
  confirm: mockConfirm
}))

// Mock writeRegionToAppConfig function
const mockWriteRegionToAppConfig = jest.fn()
jest.unstable_mockModule('@adobe/aio-lib-db', () => ({
  init: global.mockDBInit,
  writeRegionToAppConfig: mockWriteRegionToAppConfig
}))

describe('prototype', () => {
  test('extends DBBaseCommand', () => {
    expect(Provision.prototype instanceof DBBaseCommand).toBe(true)
  })
  test('args', () => {
    expect(Object.keys(Provision.args)).toEqual([])
  })
  test('flags', () => {
    const expectedFlags = Object.keys(DBBaseCommand.flags).concat(['yes']).sort()
    expect(Object.keys(Provision.flags).sort()).toEqual(expectedFlags)
    expect(Provision.flags.yes.type).toBe('boolean')
    expect(Provision.flags.yes.default).toBe(false)
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
    mockWriteRegionToAppConfig.mockClear()
  })

  describe('existing database status', () => {
    test('database not yet provisioned', async () => {
      command.argv = []
      await command.init()

      const unprovisionedStatus = {
        status: DB_STATUS.NOT_PROVISIONED,
        region: 'amer'
      }
      mockProvisionStatus.mockResolvedValue(unprovisionedStatus)
      mockConfirm.mockResolvedValue(true)
      mockProvisionRequest.mockResolvedValue({
        status: DB_STATUS.REQUESTED,
        region: 'amer'
      })

      const result = await command.run()

      expect(result.status).toBe('requested')
      expect(mockProvisionRequest).toHaveBeenCalled()
    })

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
        details: inProgressStatus
      })
      expect(mockProvisionRequest).not.toHaveBeenCalled()
    })

    test('provision request already pending', async () => {
      command.argv = []
      await command.init()

      const pendingStatus = {
        status: DB_STATUS.REQUESTED,
        region: 'amer'
      }
      mockProvisionStatus.mockResolvedValue(pendingStatus)

      const result = await command.run()

      expect(result).toEqual({
        status: 'in_progress',
        namespace: 'test-namespace',
        details: pendingStatus
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
      expect(mockProvisionRequest).toHaveBeenCalled()
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
      expect(mockProvisionRequest).toHaveBeenCalled()
      expect(stdout.output).toContain('Previous database provisioning request was rejected')
      expect(stdout.output).toContain('If the problem persists, please contact the App Builder team')
    })

    test('unknown current status, continues with new attempt', async () => {
      command.argv = []
      await command.init()

      const unknownStatus = {
        status: 'UNKNOWN_STATUS',
        region: 'amer'
      }
      mockProvisionStatus.mockResolvedValue(unknownStatus)
      mockConfirm.mockResolvedValue(true)
      mockProvisionRequest.mockResolvedValue({
        status: DB_STATUS.REQUESTED,
        region: 'amer'
      })

      const result = await command.run()

      expect(result.status).toBe('requested')
      expect(mockProvisionRequest).toHaveBeenCalled()
      expect(stdout.output).toContain('Database status is \'UNKNOWN_STATUS\' - attempting to provision...')
      expect(stdout.output).toContain('If you encounter issues, please contact the App Builder team')
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
      expect(mockProvisionRequest).toHaveBeenCalled()
      expect(result).toEqual({
        status: 'requested',
        namespace: 'test-namespace',
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

    test('provision with --yes flag skips confirmation', async () => {
      command.argv = ['--yes']
      await command.init()

      mockProvisionStatus.mockRejectedValue(new Error('not found'))
      mockProvisionRequest.mockResolvedValue({
        status: DB_STATUS.REQUESTED,
        region: 'amer'
      })

      const result = await command.run()

      expect(mockConfirm).not.toHaveBeenCalled()
      expect(mockProvisionRequest).toHaveBeenCalled()
      expect(result).toEqual({
        status: 'requested',
        namespace: 'test-namespace',
        timestamp: expect.any(String),
        details: {
          status: DB_STATUS.REQUESTED,
          region: 'amer'
        }
      })
    })

    test('provision with custom region', async () => {
      command.argv = ['--region', 'emea']
      await command.init()
      expect(global.mockDBInit).toHaveBeenCalledWith({ ow: expect.any(Object), region: 'emea' })

      mockProvisionStatus.mockRejectedValue(new Error('not found'))
      mockConfirm.mockResolvedValue(true)
      mockProvisionRequest.mockResolvedValue({
        status: DB_STATUS.PROVISIONED,
        region: 'emea'
      })

      const result = await command.run()

      expect(mockProvisionRequest).toHaveBeenCalled()
      expect(result.details.region).toBe('emea')
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

      // Test fallback output if error message is missing
      mockProvisionRequest.mockResolvedValue({ status: DB_STATUS.FAILED })
      await expect(command.run()).rejects.toThrow('Database provisioning failed: Unknown error')
    })

    test('provision rejected', async () => {
      command.argv = []
      await command.init()

      mockProvisionRequest.mockResolvedValue({
        status: DB_STATUS.REJECTED,
        message: 'Request rejected due to policy violation'
      })

      await expect(command.run()).rejects.toThrow('Database provisioning request was rejected: Request rejected due to policy violation')

      // Test fallback output if error message is missing
      mockProvisionRequest.mockResolvedValue({ status: DB_STATUS.REJECTED })
      await expect(command.run()).rejects.toThrow('Database provisioning request was rejected: Unknown reason')
    })

    test('provision missing status', async () => {
      command.argv = []
      await command.init()

      mockProvisionRequest.mockResolvedValue({ region: 'amer' })

      const result = await command.run()

      expect(result.status).toBe('unknown')
      expect(stderr.output).toContain('Database provisioning request returned unrecognized status \'undefined\'')
      expect(stderr.output).toContain('If the issue persists, please contact the App Builder team.')
    })

    test('provision unexpected status', async () => {
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

  describe('update app.config.yaml', () => {
    // mock updateAppConfig
    let mockUpdateAppConfig

    beforeEach(() => {
      mockUpdateAppConfig = jest.fn()
    })

    test('updates app.config.yaml when region available and status is REQUESTED', async () => {
      command.argv = ['--region', 'emea']
      await command.init()

      mockProvisionStatus.mockRejectedValue(new Error('not found'))
      mockConfirm.mockResolvedValue(true)
      mockProvisionRequest.mockResolvedValue({
        status: DB_STATUS.REQUESTED,
        region: 'emea'
      })
      mockWriteRegionToAppConfig.mockReturnValue(true)

      command.updateAppConfig = mockUpdateAppConfig
      await command.run()

      expect(mockUpdateAppConfig).toHaveBeenCalledWith('emea')
    })

    test('does not update app.config.yaml when no region flag provided and status is PROCESSING', async () => {
      command.argv = []
      await command.init()

      mockProvisionStatus.mockRejectedValue(new Error('not found'))
      mockConfirm.mockResolvedValue(true)
      mockProvisionRequest.mockResolvedValue({
        status: DB_STATUS.PROCESSING,
        region: 'amer'
      })
      mockWriteRegionToAppConfig.mockClear()
      mockWriteRegionToAppConfig.mockReturnValue(true)

      command.updateAppConfig = mockUpdateAppConfig
      await command.run()

      expect(mockUpdateAppConfig).toHaveBeenCalledWith(undefined)
      expect(mockWriteRegionToAppConfig).not.toHaveBeenCalled()
      expect(stdout.output).not.toContain('Updated app.config.yaml')
    })

    test('does not update app.config.yaml when no region flag provided and status is REQUESTED', async () => {
      command.argv = []
      await command.init()

      mockProvisionStatus.mockRejectedValue(new Error('not found'))
      mockConfirm.mockResolvedValue(true)
      mockProvisionRequest.mockResolvedValue({
        status: DB_STATUS.REQUESTED,
        region: 'amer'
      })
      mockWriteRegionToAppConfig.mockClear()
      mockWriteRegionToAppConfig.mockReturnValue(true)

      command.updateAppConfig = mockUpdateAppConfig
      await command.run()

      expect(mockUpdateAppConfig).toHaveBeenCalledWith(undefined)
      expect(mockWriteRegionToAppConfig).not.toHaveBeenCalled()
      expect(stdout.output).not.toContain('Updated app.config.yaml')
    })

    test('skips app.config.yaml update when status is PROVISIONED', async () => {
      command.argv = ['--region', 'emea']
      await command.init()

      mockProvisionStatus.mockRejectedValue(new Error('not found'))
      mockConfirm.mockResolvedValue(true)
      mockProvisionRequest.mockResolvedValue({
        status: DB_STATUS.PROVISIONED,
        region: 'emea'
      })

      command.updateAppConfig = mockUpdateAppConfig
      await command.run()

      // Should NOT call writeRegionToAppConfig for PROVISIONED status
      expect(mockWriteRegionToAppConfig).not.toHaveBeenCalled()
      expect(stdout.output).not.toContain('Updated app.config.yaml')
    })

    test('skips app.config.yaml update when status is FAILED', async () => {
      command.argv = ['--region', 'emea']
      await command.init()

      mockProvisionStatus.mockRejectedValue(new Error('not found'))
      mockConfirm.mockResolvedValue(true)
      mockProvisionRequest.mockResolvedValue({
        status: DB_STATUS.FAILED,
        message: 'Test failure'
      })

      await expect(command.run()).rejects.toThrow('Database provisioning failed: Test failure')

      // Should NOT call writeRegionToAppConfig for FAILED status
      expect(mockWriteRegionToAppConfig).not.toHaveBeenCalled()
    })

    test('silently handles when app.config.yaml not found', async () => {
      command.argv = ['--region', 'emea']
      await command.init()

      mockProvisionStatus.mockRejectedValue(new Error('not found'))
      mockConfirm.mockResolvedValue(true)
      mockProvisionRequest.mockResolvedValue({
        status: DB_STATUS.REQUESTED,
        region: 'emea'
      })
      mockWriteRegionToAppConfig.mockReturnValue(false)

      command.updateAppConfig = mockUpdateAppConfig
      await command.run()

      expect(mockUpdateAppConfig).toHaveBeenCalledWith('emea')
      expect(stdout.output).not.toContain('Updated app.config.yaml')
    })

    test('includes region in next steps when region is available', async () => {
      command.argv = ['--region', 'emea']
      await command.init()

      mockProvisionStatus.mockRejectedValue(new Error('not found'))
      mockConfirm.mockResolvedValue(true)
      mockProvisionRequest.mockResolvedValue({
        status: DB_STATUS.REQUESTED,
        region: 'emea'
      })
      mockWriteRegionToAppConfig.mockReturnValue(true)

      await command.run()

      expect(stdout.output).toContain('aio app db status --region emea --watch')
      expect(stdout.output).toContain('aio app db status --region emea')
    })
  })

  describe('updateAppConfig method', () => {
    test('handles writeRegionToAppConfig errors', async () => {
      command.argv = []
      await command.init()

      mockWriteRegionToAppConfig.mockImplementation(() => { throw new Error('Permission denied') })

      // Call the real updateAppConfig method directly to test error handling
      await command.updateAppConfig('test-region')

      expect(mockWriteRegionToAppConfig).toHaveBeenCalledWith(process.cwd(), 'test-region')
      expect(stdout.output).toContain('Warning: Failed to update app.config.yaml: Permission denied')
    })

    test('should not log any output or warnings if writeRegionToAppConfig returns false', async () => {
      command.argv = []
      await command.init()

      mockWriteRegionToAppConfig.mockReturnValue(false)

      await command.updateAppConfig('test-region')

      expect(mockWriteRegionToAppConfig).toHaveBeenCalledWith(process.cwd(), 'test-region')
      expect(stdout.output).not.toContain('Updated app.config.yaml')
      expect(stdout.output).not.toContain('Warning')
    })

    test('logs success message when writeRegionToAppConfig returns true', async () => {
      command.argv = []
      await command.init()

      mockWriteRegionToAppConfig.mockReturnValue(true)

      // Call the real updateAppConfig method to test the success path
      await command.updateAppConfig('test-region')

      expect(mockWriteRegionToAppConfig).toHaveBeenCalledWith(process.cwd(), 'test-region')
      expect(stdout.output).toContain('Updated app.config.yaml with database region: test-region')
    })
  })
})
