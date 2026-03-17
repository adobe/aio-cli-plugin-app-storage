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

import { DBBaseCommand } from '../../../DBBaseCommand.js'
import chalk from 'chalk'
import { prettyJson } from '../../../utils/output.js'
import { Flags } from '@oclif/core'

export class Stats extends DBBaseCommand {
  async run () {
    const { scale } = this.flags
    try {
      this.log(chalk.blue('Fetching database statistics...'))

      const client = await this.db.connect()
      const stats = await client.dbStats({ scale })

      this.debugLogger?.info?.('Database statistics retrieved:', stats)

      const result = {
        ...stats,
        namespace: this.rtNamespace,
        timestamp: new Date().toISOString()
      }

      this.displayStats(stats)

      return result
    } catch (error) {
      this.debugLogger?.error?.('Stats command error:', error)

      this.log(chalk.red('Failed to retrieve database statistics'))
      this.log(chalk.dim(`   Namespace: ${this.rtNamespace}`))
      this.log(chalk.dim(`   Error: ${error.message}`))

      this.error(`Failed to fetch database statistics: ${error.message}`)
    }
  }

  displayStats (stats) {
    this.log(chalk.green('Database Statistics:'))
    this.log(chalk.dim(`   Namespace: ${this.rtNamespace}`))

    if (stats && typeof stats === 'object') {
      const { ok, ...statsWithoutOk } = stats
      // Format and display stats in a readable way
      Object.entries(statsWithoutOk).forEach(([key, value]) => {
        this.log(chalk.dim(`   ${key}: ${this.formatValue(value)}`))
      })
    } else {
      this.log(chalk.dim(`   Raw Stats: ${this.formatValue(stats)}`))
    }

    this.log('')
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

Stats.description = 'Get statistics about your App Builder database'

Stats.examples = [
  '$ aio app db stats',
  '$ aio app db stats --scale 1024',
  '$ aio app db stats --json'
]

Stats.flags = {
  ...DBBaseCommand.flags,
  scale: Flags.integer({
    char: 's',
    description: 'Scale factor for size-related statistics (e.g. 1024 for KB, 1048576 for MB).',
    required: false,
    default: 1,
    min: 1
  })
}

Stats.args = {}
