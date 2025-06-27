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
import { Ping } from '../../../../src/commands/app/db/ping.js'
import { expect, jest } from '@jest/globals'
import { stdout } from 'stdout-stderr'
import { DBBaseCommand } from '../../../../src/DBBaseCommand.js'

// Use the global DB mock
const mockPing = global.mockDBInstance.ping

// Mock Date.now for response time testing
const originalDateNow = Date.now
const mockDateNow = jest.fn()

describe('prototype', () => {
  test('extends DBBaseCommand', () => {
    expect(Ping.prototype instanceof DBBaseCommand).toBe(true)
  })
  test('args', () => {
    expect(Object.keys(Ping.args)).toEqual([])
  })
  test('flags', () => {
    expect(Object.keys(Ping.flags).sort()).toEqual(['region'])
    expect(Ping.enableJsonFlag).toEqual(true)
  })
})

describe('run', () => {
  let command
  beforeEach(async () => {
    command = new Ping([])
    command.config = {
      runHook: jest.fn().mockResolvedValue({})
    }

    // Reset mocks
    mockPing.mockReset()
    mockDateNow.mockReset()

    // Mock Date.now for consistent response time testing
    Date.now = mockDateNow
  })

  afterEach(() => {
    Date.now = originalDateNow
  })

  describe('successful ping', () => {
    test('ping returns string response', async () => {
      command.argv = []
      await command.init()

      const startTime = 1000
      const endTime = 1150
      mockDateNow
        .mockReturnValueOnce(startTime) // Start time
        .mockReturnValueOnce(endTime) // End time

      mockPing.mockResolvedValue('pong')

      const result = await command.run()

      expect(mockPing).toHaveBeenCalled()
      expect(result).toEqual({
        status: 'success',
        namespace: 'test-namespace',
        responseTime: 150,
        response: 'pong',
        timestamp: expect.any(String)
      })

      expect(stdout.output).toContain('Database connection successful')
      expect(stdout.output).toContain('Namespace: test-namespace')
      expect(stdout.output).toContain('Response time: 150ms')
      expect(stdout.output).toContain('Response: pong')
      expect(stdout.output).toContain('Database is ready for operations')
    })

    test('ping returns object response', async () => {
      command.argv = []
      await command.init()

      const startTime = 2000
      const endTime = 2050
      mockDateNow
        .mockReturnValueOnce(startTime)
        .mockReturnValueOnce(endTime)

      const pingResponse = { status: 'ok', version: '1.0.0' }
      mockPing.mockResolvedValue(pingResponse)

      const result = await command.run()

      expect(result).toEqual({
        status: 'success',
        namespace: 'test-namespace',
        responseTime: 50,
        response: pingResponse,
        timestamp: expect.any(String)
      })

      expect(stdout.output).toContain('Database connection successful')
      expect(stdout.output).toContain('Response time: 50ms')
      expect(stdout.output).not.toContain('Response:') // Object responses don't show in console
    })

    test('fast response time', async () => {
      command.argv = []
      await command.init()

      const startTime = 5000
      const endTime = 5001
      mockDateNow
        .mockReturnValueOnce(startTime)
        .mockReturnValueOnce(endTime)

      mockPing.mockResolvedValue('fast pong')

      const result = await command.run()

      expect(result.responseTime).toBe(1)
      expect(stdout.output).toContain('Response time: 1ms')
    })
  })

  describe('failed ping', () => {
    test('ping throws error', async () => {
      command.argv = []
      await command.init()

      const startTime = 3000
      const endTime = 3500
      mockDateNow
        .mockReturnValueOnce(startTime)
        .mockReturnValueOnce(endTime)

      const error = new Error('Connection timeout')
      mockPing.mockRejectedValue(error)

      const result = await command.run()

      expect(result).toEqual({
        status: 'failed',
        namespace: 'test-namespace',
        error: 'Connection timeout',
        timestamp: expect.any(String)
      })

      expect(stdout.output).toContain('Database connection failed')
      expect(stdout.output).toContain('Namespace: test-namespace')
      expect(stdout.output).toContain('Error: Connection timeout')
    })

    test('network error', async () => {
      command.argv = []
      await command.init()

      mockDateNow.mockReturnValue(4000)
      mockPing.mockRejectedValue(new Error('ECONNREFUSED'))

      const result = await command.run()

      expect(result.status).toBe('failed')
      expect(result.error).toBe('ECONNREFUSED')
      expect(stdout.output).toContain('Database connection failed')
    })

    test('authentication error', async () => {
      command.argv = []
      await command.init()

      mockDateNow.mockReturnValue(5000)
      mockPing.mockRejectedValue(new Error('401 Unauthorized'))

      const result = await command.run()

      expect(result.status).toBe('failed')
      expect(result.error).toBe('401 Unauthorized')
    })
  })

  describe('json output', () => {
    test('json flag suppresses console output on success', async () => {
      command.argv = ['--json']
      await command.init()

      mockDateNow
        .mockReturnValueOnce(6000)
        .mockReturnValueOnce(6100)

      mockPing.mockResolvedValue('pong')

      const result = await command.run()

      expect(result.status).toBe('success')
      expect(result.responseTime).toBe(100)

      // Should not show console messages with --json
      expect(stdout.output).not.toContain('Database connection successful')
      expect(stdout.output).not.toContain('Database is ready for operations')
    })

    test('json flag suppresses console output on failure', async () => {
      command.argv = ['--json']
      await command.init()

      mockDateNow.mockReturnValue(7000)
      mockPing.mockRejectedValue(new Error('Test error'))

      const result = await command.run()

      expect(result.status).toBe('failed')
      expect(result.error).toBe('Test error')

      // Should not show console messages with --json
      expect(stdout.output).not.toContain('Database connection failed')
    })
  })

  describe('response time measurement', () => {
    test('calculates response time correctly', async () => {
      command.argv = []
      await command.init()

      const scenarios = [
        { start: 1000, end: 1001, expected: 1 },
        { start: 2000, end: 2500, expected: 500 },
        { start: 3000, end: 4000, expected: 1000 },
        { start: 5000, end: 5999, expected: 999 }
      ]

      for (const scenario of scenarios) {
        mockDateNow
          .mockReturnValueOnce(scenario.start)
          .mockReturnValueOnce(scenario.end)

        mockPing.mockResolvedValue('test')

        const result = await command.run()
        expect(result.responseTime).toBe(scenario.expected)

        // Reset for next iteration
        mockPing.mockReset()
        stdout.start()
      }
    })
  })

  describe('namespace display', () => {
    test('shows correct namespace', async () => {
      command.argv = []
      await command.init()

      command.rtNamespace = 'custom-namespace-123'

      mockDateNow
        .mockReturnValueOnce(8000)
        .mockReturnValueOnce(8050)

      mockPing.mockResolvedValue('pong')

      const result = await command.run()

      expect(result.namespace).toBe('custom-namespace-123')
      expect(stdout.output).toContain('Namespace: custom-namespace-123')
    })
  })

  describe('timestamp', () => {
    test('includes ISO timestamp in result', async () => {
      command.argv = []
      await command.init()

      mockDateNow
        .mockReturnValueOnce(9000)
        .mockReturnValueOnce(9100)

      mockPing.mockResolvedValue('pong')

      const result = await command.run()

      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)

      // Verify it's a recent timestamp
      const timestamp = new Date(result.timestamp)
      const now = new Date()
      expect(Math.abs(now.getTime() - timestamp.getTime())).toBeLessThan(5000) // Within 5 seconds
    })
  })
})
