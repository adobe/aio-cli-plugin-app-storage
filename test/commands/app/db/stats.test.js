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

import { Stats } from '../../../../src/commands/app/db/stats.js'
import { expect, jest } from '@jest/globals'
import { stdout } from 'stdout-stderr'
import { DBBaseCommand } from '../../../../src/DBBaseCommand.js'

// Use the global DB mock
const mockConnect = global.mockDBInstance.connect
const mockDbStats = jest.fn()

describe('prototype', () => {
  test('extends DBBaseCommand', () => {
    expect(Stats.prototype instanceof DBBaseCommand).toBe(true)
  })
  test('args', () => {
    expect(Object.keys(Stats.args)).toEqual([])
  })
  test('flags', () => {
    expect(Object.keys(Stats.flags).sort()).toEqual(['region'])
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

    // Reset mocks
    mockConnect.mockReset()
    mockDbStats.mockReset()

    // Mock the db client
    mockConnect.mockResolvedValue({
      dbStats: mockDbStats
    })
  })

  describe('successful stats retrieval', () => {
    test('returns and displays database statistics', async () => {
      command.argv = []
      await command.init()

      const statsData = {
        totalCollections: 5,
        totalDocuments: 1000,
        totalSize: 2048,
        avgDocumentSize: 2.048,
        lastUpdated: '2025-01-01T00:00:00Z'
      }
      mockDbStats.mockResolvedValue(statsData)

      const result = await command.run()

      expect(mockConnect).toHaveBeenCalled()
      expect(mockDbStats).toHaveBeenCalled()
      expect(result).toEqual({
        ...statsData,
        namespace: 'test-namespace',
        timestamp: expect.any(String)
      })

      expect(stdout.output).toContain('Fetching database statistics...')
      expect(stdout.output).toContain('Database Statistics:')
      expect(stdout.output).toContain('Namespace: test-namespace')
      expect(stdout.output).toContain('Total Collections: 5')
      expect(stdout.output).toContain('Total Documents: 1,000')
      expect(stdout.output).toContain('Total Size: 2,048')
      expect(stdout.output).toContain('Avg Document Size: 2.048')
      expect(stdout.output).toContain('Retrieved:')
    })

    test('handles empty/null stats', async () => {
      command.argv = []
      await command.init()

      mockDbStats.mockResolvedValue(null)

      const result = await command.run()

      expect(result).toEqual({
        namespace: 'test-namespace',
        timestamp: expect.any(String)
      })

      expect(stdout.output).toContain('Raw Stats: null')
    })

    test('handles object stats', async () => {
      command.argv = []
      await command.init()

      const complexStats = {
        collections: {
          users: { count: 100 },
          products: { count: 50 }
        },
        metadata: {
          version: '1.0.0'
        }
      }
      mockDbStats.mockResolvedValue(complexStats)

      const result = await command.run()

      expect(result.collections).toEqual(complexStats.collections)
      expect(stdout.output).toContain('Collections:')
      expect(stdout.output).toContain('Metadata:')
    })
  })

  describe('formatValue method', () => {
    test('formats numbers with commas', async () => {
      command.argv = []
      await command.init()

      const formatted = command.formatValue(1000)
      expect(formatted).toBe('1,000')
    })

    test('formats objects as JSON', async () => {
      command.argv = []
      await command.init()

      const obj = { key: 'value' }
      const formatted = command.formatValue(obj)
      expect(formatted).toContain('{\n  "key": "value"\n}')
    })

    test('formats other types as strings', async () => {
      command.argv = []
      await command.init()

      expect(command.formatValue('test')).toBe('test')
      expect(command.formatValue(true)).toBe('true')
    })
  })

  describe('error handling', () => {
    test('connection error', async () => {
      command.argv = []
      await command.init()

      mockConnect.mockRejectedValue(new Error('Connection failed'))

      await expect(command.run()).rejects.toThrow('Failed to fetch database statistics: Connection failed')

      expect(stdout.output).toContain('Failed to retrieve database statistics')
      expect(stdout.output).toContain('Namespace: test-namespace')
      expect(stdout.output).toContain('Error: Connection failed')
    })

    test('dbStats error', async () => {
      command.argv = []
      await command.init()

      mockConnect.mockResolvedValue({
        dbStats: mockDbStats
      })
      mockDbStats.mockRejectedValue(new Error('Query failed'))

      await expect(command.run()).rejects.toThrow('Failed to fetch database statistics: Query failed')

      expect(stdout.output).toContain('Failed to retrieve database statistics')
      expect(stdout.output).toContain('Error: Query failed')
    })

    test('authentication error', async () => {
      command.argv = []
      await command.init()

      mockConnect.mockRejectedValue(new Error('401 Unauthorized'))

      await expect(command.run()).rejects.toThrow('Failed to fetch database statistics: 401 Unauthorized')
    })
  })

  describe('json output', () => {
    test('json flag works correctly', async () => {
      command.argv = ['--json']
      await command.init()

      const statsData = {
        totalCollections: 3,
        totalDocuments: 300
      }
      mockDbStats.mockResolvedValue(statsData)

      const result = await command.run()

      expect(result).toEqual({
        ...statsData,
        namespace: 'test-namespace',
        timestamp: expect.any(String)
      })

      // Should still show progress messages even with --json
      expect(stdout.output).toContain('Fetching database statistics...')
    })
  })
})
