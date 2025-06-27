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
import { Status } from '../../../../src/commands/app/db/status.js'
import { expect, jest } from '@jest/globals'
import { stdout } from 'stdout-stderr'
import { DBBaseCommand } from '../../../../src/DBBaseCommand.js'

// Use the global DB mock
const mockProvisionStatus = global.mockDBInstance.provisionStatus

// Mock setTimeout for watch mode testing
const originalSetTimeout = global.setTimeout
const mockSetTimeout = jest.fn()

describe('prototype', () => {
  test('extends DBBaseCommand', () => {
    expect(Status.prototype instanceof DBBaseCommand).toBe(true)
  })
  test('args', () => {
    expect(Object.keys(Status.args)).toEqual([])
  })
  test('flags', () => {
    expect(Object.keys(Status.flags).sort()).toEqual(['region', 'watch'])
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
        status: 'PROVISIONED',
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
      expect(stdout.output).toContain('A Database has been provisioned for this Workspace and is ready for use')
    })

    test('database processing', async () => {
      command.argv = []
      await command.init()

      const statusResponse = {
        status: 'PROCESSING',
        region: 'amer'
      }
      mockProvisionStatus.mockResolvedValue(statusResponse)

      const result = await command.run()

      expect(result.status).toBe('PROCESSING')
      expect(stdout.output).toContain('Database Status: PROCESSING')
      expect(stdout.output).toContain('A Database is being provisioned for this Workspace')
    })

    test('database requested', async () => {
      command.argv = []
      await command.init()

      const statusResponse = {
        status: 'REQUESTED',
        region: 'amer'
      }
      mockProvisionStatus.mockResolvedValue(statusResponse)

      const result = await command.run()

      expect(result.status).toBe('REQUESTED')
      expect(stdout.output).toContain('Database Status: REQUESTED')
      expect(stdout.output).toContain('A Database has been requested for this Workspace')
    })

    test('database failed', async () => {
      command.argv = []
      await command.init()

      const statusResponse = {
        status: 'FAILED',
        region: 'amer',
        message: 'Quota exceeded'
      }
      mockProvisionStatus.mockResolvedValue(statusResponse)

      const result = await command.run()

      expect(result.status).toBe('FAILED')
      expect(stdout.output).toContain('Database Status: FAILED')
      expect(stdout.output).toContain('Failed to provision a Database for this Workspace')
      expect(stdout.output).toContain('Message: Quota exceeded')
    })

    test('database not found (404)', async () => {
      command.argv = []
      await command.init()

      mockProvisionStatus.mockRejectedValue(new Error('404 not found'))

      const result = await command.run()

      expect(result).toEqual({
        status: 'NOT_PROVISIONED',
        namespace: 'test-namespace',
        timestamp: expect.any(String)
      })
      expect(stdout.output).toContain('No database has been provisioned for this workspace')
    })

    test('other error', async () => {
      command.argv = []
      await command.init()

      mockProvisionStatus.mockRejectedValue(new Error('Network error'))

      const result = await command.run()

      expect(result).toEqual({
        status: 'error',
        namespace: 'test-namespace',
        error: 'Network error',
        timestamp: expect.any(String)
      })
      expect(stdout.output).toContain('Failed to check database status')
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
        status: 'PROVISIONED',
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
        status: 'PROVISIONED',
        region: 'amer'
      }
      mockProvisionStatus.mockResolvedValue(statusResponse)

      const result = await command.run()

      expect(result.status).toBe('PROVISIONED')
      expect(stdout.output).toContain('Provisioning completed. Stopping watch mode.')
    })

    test('watch stops on failed status', async () => {
      command.argv = ['--watch']
      await command.init()

      const statusResponse = {
        status: 'FAILED',
        region: 'amer'
      }
      mockProvisionStatus.mockResolvedValue(statusResponse)

      const result = await command.run()

      expect(result.status).toBe('FAILED')
      expect(stdout.output).toContain('Provisioning completed. Stopping watch mode.')
    })
  })

  describe('displayStatus', () => {
    test('shows all status information', async () => {
      command.argv = []
      await command.init()

      const statusResponse = {
        status: 'PROVISIONED',
        region: 'emea',
        message: 'Database ready',
        created: '2024-01-01T00:00:00Z',
        updated: '2024-01-02T00:00:00Z'
      }
      mockProvisionStatus.mockResolvedValue(statusResponse)

      await command.run()

      expect(stdout.output).toContain('Database Status: PROVISIONED')
      expect(stdout.output).toContain('Namespace: test-namespace')
      expect(stdout.output).toContain('Region: emea')
      expect(stdout.output).toContain('Description: A Database has been provisioned for this Workspace and is ready for use')
      expect(stdout.output).toContain('Message: Database ready')
      expect(stdout.output).toContain('Created:')
      expect(stdout.output).toContain('Updated:')
      expect(stdout.output).toContain('Checked:')
    })

    test('hides timestamp in watch mode', async () => {
      command.argv = []
      await command.init()

      const statusResponse = {
        status: 'PROCESSING',
        region: 'amer'
      }

      // Test displayStatus directly with showTimestamp=false
      command.displayStatus(statusResponse, false)

      expect(stdout.output).toContain('Database Status: PROCESSING')
      expect(stdout.output).not.toContain('Checked:')
    })
  })

  describe('getStatusDescription', () => {
    test('returns correct descriptions for each status', () => {
      const command = new Status([])

      expect(command.getStatusDescription('NOT_PROVISIONED')).toBe('No Database has been provisioned for this Workspace')
      expect(command.getStatusDescription('REQUESTED')).toBe('A Database has been requested for this Workspace')
      expect(command.getStatusDescription('PROCESSING')).toBe('A Database is being provisioned for this Workspace')
      expect(command.getStatusDescription('FAILED')).toBe('Failed to provision a Database for this Workspace')
      expect(command.getStatusDescription('PROVISIONED')).toBe('A Database has been provisioned for this Workspace and is ready for use')
      expect(command.getStatusDescription('UNKNOWN')).toBe(null)
    })
  })

  describe('json output', () => {
    test('json flag works correctly', async () => {
      command.argv = ['--json']
      await command.init()

      const statusResponse = {
        status: 'PROVISIONED',
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
