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
import { Status } from '../../../../src/commands/app/db/status.js'
import { expect, jest } from '@jest/globals'
import { stdout } from 'stdout-stderr'
import { DBBaseCommand } from '../../../../src/DBBaseCommand.js'
import { DB_STATUS } from '../../../../src/constants/db.js'

// Use the global DB mock
const mockProvisionStatus = global.mockDBInstance.provisionStatus

// Mock setTimeout for watch mode testing
const originalSetTimeout = global.setTimeout
const mockSetTimeout = jest.fn()

/**
 * Mock setTimeout to immediately call the callback a few times but not infinitely
 *
 * @param {number} times - The number of times to execute the callback
 */
function mockWatchLoop (times = 5) {
  for (let i = 0; i < times; i++) {
    mockSetTimeout.mockImplementationOnce((callback) => {
      callback()
      return 'mock-timeout-id'
    })
  }
  mockSetTimeout.mockImplementationOnce(() => 'mock-timeout-id')
}

describe('prototype', () => {
  test('extends DBBaseCommand', () => {
    expect(Status.prototype instanceof DBBaseCommand).toBe(true)
  })
  test('args', () => {
    expect(Object.keys(Status.args)).toEqual([])
  })
  test('flags', () => {
    const expectedFlags = Object.keys(DBBaseCommand.flags).concat(['watch']).sort()
    expect(Object.keys(Status.flags).sort()).toEqual(expectedFlags)
    expect(Status.flags.watch.type).toBe('boolean')
    expect(Status.flags.watch.default).toBe(false)
    expect(Status.enableJsonFlag).toEqual(true)
  })
})

describe('run', () => {
  let command
  beforeEach(async () => {
    command = new Status([])
    command.config = {
      runHook: jest.fn().mockResolvedValue({})
    }

    // Reset mocks
    mockProvisionStatus.mockReset()
    mockSetTimeout.mockReset()
  })

  describe('checkStatus', () => {
    test('database provisioned', async () => {
      command.argv = []
      await command.init()

      const statusResponse = {
        status: DB_STATUS.PROVISIONED,
        region: 'amer',
        created: '2024-01-01T00:00:00Z',
        updated: '2024-01-01T00:00:00Z'
      }
      mockProvisionStatus.mockResolvedValue(statusResponse)

      const result = await command.run()

      expect(result).toEqual({
        ...statusResponse,
        namespace: 'test-namespace',
        timestamp: expect.any(String)
      })
      expect(stdout.output).toContain('Database Status: PROVISIONED')
    })

    test('database processing', async () => {
      command.argv = []
      await command.init()

      const statusResponse = {
        status: DB_STATUS.PROCESSING,
        region: 'amer'
      }
      mockProvisionStatus.mockResolvedValue(statusResponse)

      const result = await command.run()

      expect(result.status).toBe('PROCESSING')
      expect(stdout.output).toContain('Database Status: PROCESSING')
    })

    test('database requested', async () => {
      command.argv = []
      await command.init()

      const statusResponse = {
        status: DB_STATUS.REQUESTED,
        region: 'amer'
      }
      mockProvisionStatus.mockResolvedValue(statusResponse)

      const result = await command.run()

      expect(result.status).toBe('REQUESTED')
      expect(stdout.output).toContain('Database Status: REQUESTED')
    })

    test('database failed', async () => {
      command.argv = []
      await command.init()

      const statusResponse = {
        status: DB_STATUS.FAILED,
        region: 'amer',
        message: 'Quota exceeded'
      }
      mockProvisionStatus.mockResolvedValue(statusResponse)

      const result = await command.run()

      expect(result.status).toBe('FAILED')
      expect(stdout.output).toContain('Database Status: FAILED')
      expect(stdout.output).toContain('Message: Quota exceeded')
    })

    test('database rejected', async () => {
      command.argv = []
      await command.init()

      const statusResponse = {
        status: DB_STATUS.REJECTED,
        region: 'amer',
        message: 'Policy violation'
      }
      mockProvisionStatus.mockResolvedValue(statusResponse)

      const result = await command.run()

      expect(result.status).toBe('REJECTED')
      expect(stdout.output).toContain('Database Status: REJECTED')
      expect(stdout.output).toContain('Message: Policy violation')
    })

    test('database not found (404)', async () => {
      command.argv = []
      await command.init()

      const error = new Error('404 not found')
      error.httpStatusCode = 404
      mockProvisionStatus.mockRejectedValue(error)

      const result = await command.run()

      expect(result).toEqual({
        status: DB_STATUS.NOT_PROVISIONED,
        namespace: 'test-namespace',
        timestamp: expect.any(String)
      })
      expect(stdout.output).toContain('No database has been provisioned for this workspace')
    })

    test('other error', async () => {
      command.argv = []
      await command.init()

      mockProvisionStatus.mockRejectedValue(new Error('Network error'))

      await expect(command.run()).rejects.toThrow('Failed to check database status: Network error')
    })
  })

  describe('watch mode', () => {
    beforeEach(() => {
      global.setTimeout = mockSetTimeout
    })

    afterEach(() => {
      global.setTimeout = originalSetTimeout
    })

    test('watch flag enables watch mode', async () => {
      command.argv = ['--watch']
      await command.init()

      const statusResponse = {
        status: DB_STATUS.PROVISIONED,
        region: 'amer'
      }
      mockProvisionStatus.mockResolvedValue(statusResponse)

      // Mock setTimeout to immediately call the callback
      mockSetTimeout.mockImplementation((callback) => {
        // Don't actually call callback to avoid infinite loop in test
        return 'mock-timeout-id'
      })

      const result = await command.run()

      expect(result.status).toBe('PROVISIONED')
      expect(stdout.output).toContain('Watching database provisioning status')
    })

    test('watch stops on provisioned status', async () => {
      command.argv = ['--watch']
      await command.init()

      const statusResponse = {
        status: DB_STATUS.PROVISIONED,
        region: 'amer'
      }
      mockProvisionStatus.mockResolvedValue(statusResponse)

      const result = await command.run()

      expect(result.status).toBe('PROVISIONED')
      expect(stdout.output).toContain('Stopping watch mode.')
    })

    test('watch stops on failed status', async () => {
      command.argv = ['--watch']
      await command.init()

      const statusResponse = {
        status: DB_STATUS.FAILED,
        region: 'amer'
      }
      mockProvisionStatus.mockResolvedValue(statusResponse)

      const result = await command.run()

      expect(result.status).toBe('FAILED')
      expect(stdout.output).toContain('Stopping watch mode.')
    })

    test('watch stops on rejected status', async () => {
      command.argv = ['--watch']
      await command.init()

      const statusResponse = {
        status: DB_STATUS.REJECTED,
        region: 'amer'
      }
      mockProvisionStatus.mockResolvedValue(statusResponse)

      const result = await command.run()

      expect(result.status).toBe('REJECTED')
      expect(stdout.output).toContain('Stopping watch mode.')
    })

    test('watch continues after error', async () => {
      mockWatchLoop()

      command.argv = ['--watch']
      await command.init()

      mockProvisionStatus
        .mockResolvedValueOnce({
          status: DB_STATUS.PROCESSING,
          region: 'amer'
        })
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Another error'))
        .mockResolvedValueOnce({
          status: DB_STATUS.FAILED,
          region: 'amer'
        })

      await command.run()

      expect(stdout.output).toContain('Database Status: PROCESSING')
      expect(stdout.output).toContain('Error: Network error')
      expect(stdout.output).toContain('Error: Another error')
      expect(stdout.output).toContain('Database Status: FAILED')
      expect(stdout.output).toContain('Stopping watch mode.')
    })

    test('watch only displays status changes', async () => {
      mockWatchLoop()

      command.argv = ['--watch']
      await command.init()

      const processing = {
        status: DB_STATUS.PROCESSING,
        region: 'amer'
      }
      const provisioned = {
        status: DB_STATUS.PROVISIONED,
        region: 'amer'
      }

      mockProvisionStatus
        .mockResolvedValueOnce(processing)
        .mockResolvedValueOnce(processing)
        .mockResolvedValueOnce(processing)
        .mockResolvedValueOnce(provisioned)

      await command.run()

      expect(stdout.output).toContain('Database Status: PROCESSING')
      const processingCount = (stdout.output.match(/Database Status: PROCESSING/g) || []).length
      expect(processingCount).toBe(1) // Should only show once
      expect(stdout.output).toContain('Database Status: PROVISIONED')
      expect(stdout.output).toContain('Stopping watch mode.')
    })
  })

  describe('displayStatus', () => {
    test('shows all status information', async () => {
      command.argv = []
      await command.init()

      const statusResponse = {
        status: DB_STATUS.PROVISIONED,
        message: 'Database ready',
        region: 'amer',
        submitted: '2024-01-01T00:00:00Z',
        updated: '2024-01-02T00:00:00Z'
      }
      mockProvisionStatus.mockResolvedValue(statusResponse)

      await command.run()

      expect(stdout.output).toContain('Database Status: PROVISIONED')
      expect(stdout.output).toContain('Namespace: test-namespace')
      expect(stdout.output).toContain('Message: Database ready')
      expect(stdout.output).toContain('Region: amer')
      expect(stdout.output).toContain('Submitted:')
      expect(stdout.output).toContain('Checked:')
    })

    test('hides timestamp in watch mode', async () => {
      command.argv = []
      await command.init()

      const statusResponse = {
        status: DB_STATUS.PROCESSING,
        region: 'amer'
      }

      // Test displayStatus directly with showTimestamp=false
      command.displayStatus(statusResponse, false)

      expect(stdout.output).toContain('Database Status: PROCESSING')
      expect(stdout.output).not.toContain('Checked:')
    })
  })

  describe('json output', () => {
    test('json flag works correctly', async () => {
      command.argv = ['--json']
      await command.init()

      const statusResponse = {
        status: DB_STATUS.PROVISIONED,
        region: 'amer'
      }
      mockProvisionStatus.mockResolvedValue(statusResponse)

      const result = await command.run()

      expect(result.status).toBe('PROVISIONED')
      // Should still return the data for JSON output
      expect(result.namespace).toBe('test-namespace')
    })
  })
})
