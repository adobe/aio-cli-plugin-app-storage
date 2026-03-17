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

import { OrgStats } from '../../../../../src/commands/app/db/org/stats.js'
import { expect, jest } from '@jest/globals'
import { stdout } from 'stdout-stderr'
import { DBBaseCommand } from '../../../../../src/DBBaseCommand.js'

const statsData = {
  databases: 2,
  storageSize: 1469,
  indexSize: 2304,
  dataSize: 1146,
  collections: 5,
  ok: 1,
  scaleFactor: 1024,
  databaseStats: [
    {
      namespace: '123456-3978goldengoose',
      storageSize: 234,
      indexSize: 256,
      dataSize: 112,
      collections: 1,
      scaleFactor: 1024,
      lastUpdated: new Date('2026-01-29T15:31:57Z')
    },
    {
      namespace: '123456-1138whitewampa',
      storageSize: 1235,
      indexSize: 2048,
      dataSize: 1034,
      collections: 4,
      scaleFactor: 1024,
      lastUpdated: new Date('2026-01-29T15:35:12Z')
    }
  ]
}

const mockOrgStats = jest.fn()

describe('prototype', () => {
  test('extends DBBaseCommand', () => {
    expect(OrgStats.prototype instanceof DBBaseCommand).toBe(true)
  })
  test('args', () => {
    expect(Object.keys(OrgStats.args)).toEqual([])
  })
  test('flags', () => {
    const expectedFlags = ['scale', ...Object.keys(DBBaseCommand.flags)].sort()
    expect(Object.keys(OrgStats.flags).sort()).toEqual(expectedFlags)
    expect(OrgStats.enableJsonFlag).toEqual(true)
  })
})

describe('run', () => {
  let command
  beforeEach(async () => {
    command = new OrgStats([])
    command.config = {
      runHook: jest.fn().mockResolvedValue({})
    }

    // Reset mocks
    mockOrgStats.mockReset()

    // Mock the db client connection
    global.mockDBInstance.connect = jest.fn().mockResolvedValue({
      orgStats: mockOrgStats
    })
  })

  describe('successful stats retrieval', () => {
    test('returns and displays organization database statistics without --json flag', async () => {
      command.argv = []
      await command.init()

      mockOrgStats.mockResolvedValue(statsData)

      const result = await command.run()

      expect(result).toMatchObject({
        ...statsData,
        timestamp: expect.any(String)
      })

      expect(stdout.output).toContain('Organization Totals:')
      expect(stdout.output).toContain(`databases: ${statsData.databases}`)
      expect(stdout.output).toContain(`storageSize: ${statsData.storageSize.toLocaleString()}`)
      expect(stdout.output).toContain(`indexSize: ${statsData.indexSize.toLocaleString()}`)
      expect(stdout.output).toContain(`dataSize: ${statsData.dataSize.toLocaleString()}`)
      expect(stdout.output).toContain(`collections: ${statsData.collections}`)
      expect(stdout.output).toContain(`scaleFactor: ${statsData.scaleFactor.toLocaleString()}`)

      statsData.databaseStats.forEach((dbStats) => {
        expect(stdout.output).toContain(`Namespace '${dbStats.namespace}':`)
        expect(stdout.output).toContain(`storageSize: ${dbStats.storageSize.toLocaleString()}`)
        expect(stdout.output).toContain(`indexSize: ${dbStats.indexSize.toLocaleString()}`)
        expect(stdout.output).toContain(`dataSize: ${dbStats.dataSize.toLocaleString()}`)
        expect(stdout.output).toContain(`collections: ${dbStats.collections}`)
        expect(stdout.output).toContain(`lastUpdated: ${dbStats.lastUpdated.toISOString()}`)
      })
    })

    test('returns database statistics with --json flag', async () => {
      command.argv = ['--json']
      await command.init()
      mockOrgStats.mockResolvedValue(statsData)

      const result = await command.run()

      expect(result).toEqual({
        ...statsData,
        timestamp: expect.any(String)
      })

      // Should not show console messages with --json
      expect(stdout.output).not.toContain('Fetching organization\'s database statistics...')
      expect(stdout.output).not.toContain('Database Statistics:')
      expect(stdout.output).not.toContain(`Namespace '${statsData.databaseStats[0].namespace}':`)
    })

    test('handles empty/null stats', async () => {
      command.argv = []
      await command.init()

      mockOrgStats.mockResolvedValue(null)

      const result = await command.run()

      expect(result).toEqual({ timestamp: expect.any(String) })

      expect(stdout.output).toContain('Raw Stats: \n     {}')
    })

    test('handles empty/null stats with --json flag', async () => {
      command.argv = ['--json']
      await command.init()

      mockOrgStats.mockResolvedValue(null)

      const result = await command.run()

      expect(result).toEqual({ timestamp: expect.any(String) })

      expect(stdout.output).not.toContain('Raw Stats: \n     {}')
    })

    test('passes scale factor to orgStats method', async () => {
      command.argv = ['--scale', '1024']
      await command.init()

      mockOrgStats.mockResolvedValue(statsData)

      await command.run()

      expect(mockOrgStats).toHaveBeenCalledWith({ scale: 1024 })
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
      expect(formatted).toMatch(/\{\n +"key": "value"\n *\}/)
    })

    test('formats dates as ISO strings', async () => {
      command.argv = []
      await command.init()

      const date = new Date('2025-01-01T00:00:00Z')
      const formatted = command.formatValue(date)
      expect(formatted).toBe('2025-01-01T00:00:00.000Z')
    })

    test('formats other types as strings', async () => {
      command.argv = []
      await command.init()

      expect(command.formatValue('test')).toBe('test')
      expect(command.formatValue(true)).toBe('true')
    })
  })

  describe('error handling', () => {
    test('connection error without --json flag', async () => {
      command.argv = []
      await command.init()

      global.mockDBInstance.connect.mockRejectedValue(new Error('Connection failed'))

      await expect(command.run()).rejects.toThrow('Failed to fetch organization database statistics: Connection failed')

      expect(stdout.output).toContain('Failed to retrieve organization database statistics')
      expect(stdout.output).toContain('Namespace: test-namespace')
      expect(stdout.output).toContain('Error: Connection failed')
    })

    test('connection error with --json flag', async () => {
      command.argv = ['--json']
      await command.init()

      global.mockDBInstance.connect.mockRejectedValue(new Error('Connection failed'))

      await expect(command.run()).rejects.toThrow('Failed to fetch organization database statistics: Connection failed')

      // Should not show console messages with --json
      expect(stdout.output).not.toContain('Failed to retrieve organization database statistics')
      expect(stdout.output).not.toContain('Namespace:')
    })

    test('orgStats error', async () => {
      command.argv = []
      await command.init()

      mockOrgStats.mockRejectedValue(new Error('Query failed'))

      await expect(command.run()).rejects.toThrow('Failed to fetch organization database statistics: Query failed')

      expect(stdout.output).toContain('Failed to retrieve organization database statistics')
      expect(stdout.output).toContain('Error: Query failed')
    })

    test('authentication error', async () => {
      command.argv = []
      await command.init()

      global.mockDBInstance.connect.mockRejectedValue(new Error('401 Unauthorized'))

      await expect(command.run()).rejects.toThrow('Failed to fetch organization database statistics: 401 Unauthorized')

      expect(stdout.output).toContain('Failed to retrieve organization database statistics')
      expect(stdout.output).toContain('401 Unauthorized')
    })
  })
})
