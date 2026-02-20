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

import { DBBaseCommand } from '../../../../DBBaseCommand.js'
import chalk from 'chalk'
import { prettyJson } from '../../../../utils/output.js'
import { Flags } from '@oclif/core'

export class OrgStats extends DBBaseCommand {
  async run () {
    const { scale } = this.flags
    try {
      this.log(chalk.blue('Fetching organization\'s database statistics...'))

      const client = await this.db.connect()
      const stats = await client.orgStats({ scale })

      this.debugLogger?.info?.('Organization database statistics retrieved:', stats)

      const result = {
        ...stats,
        timestamp: new Date().toISOString()
      }

      this.displayStats(stats)

      return result
    } catch (error) {
      this.debugLogger?.error?.('OrgStats command error:', error)

      this.log(chalk.red('Failed to retrieve organization database statistics'))
      this.log(chalk.dim(`   Namespace: ${this.rtNamespace}`))
      this.log(chalk.dim(`   Error: ${error.message}`))

      this.error(`Failed to fetch organization database statistics: ${error.message}`)
    }
  }

  displayStats (stats) {
    const { ok, databaseStats, ...orgStats } = stats || {}

    // Display combined stats first
    this.log(chalk.green('Organization Totals:'))
    if (orgStats && typeof orgStats === 'object' && Object.keys(orgStats).length > 0) {
      Object.entries(orgStats).forEach(([key, value]) => {
        this.log(chalk.dim(`   ${key}: ${this.formatValue(value)}`))
      })
    } else {
      this.log(chalk.dim(`   Raw Stats: ${this.formatValue(orgStats)}`))
    }

    this.log('')
    if (databaseStats && Array.isArray(databaseStats) && databaseStats.length > 0) {
      this.log(chalk.green('Database Statistics:'))
      databaseStats.forEach((dbStats) => {
        const { namespace, ...otherStats } = dbStats
        this.log(chalk.dim(`   Namespace '${namespace}':`))
        Object.entries(otherStats).forEach(([key, value]) => {
          this.log(chalk.dim(`      ${key}: ${this.formatValue(value, 3)}`))
        })
        this.log('')
      })
    }

    this.log(chalk.dim(`   Retrieved: ${new Date().toISOString()}`))
  }

  formatValue (value) {
    if (typeof value === 'number') {
      // Format large numbers with commas
      return value.toLocaleString()
    }
    if (value instanceof Date) {
      return value.toISOString()
    }
    if (typeof value === 'object' && value !== null) {
      return `\n${prettyJson(value)}`
    }
    return String(value)
  }
}

OrgStats.description = 'Get combined statistics about the App Builder databases in your organization'

OrgStats.examples = [
  '$ aio app db org stats',
  '$ aio app db org stats --scale 1024',
  '$ aio app db org stats --json'
]

OrgStats.flags = {
  ...DBBaseCommand.flags,
  scale: Flags.integer({
    char: 's',
    description: 'Scale factor for size-related statistics (e.g. 1024 for KB, 1048576 for MB).',
    required: false,
    default: 1,
    min: 1
  })
}

OrgStats.args = {}
