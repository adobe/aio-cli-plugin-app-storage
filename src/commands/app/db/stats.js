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

export class Stats extends DBBaseCommand {
  async run () {
    try {
      this.log(chalk.blue('Fetching database statistics...'))

      const client = await this.db.connect()
      const stats = await client.dbStats()

      this.debugLogger?.info?.('Database statistics retrieved:', stats)

      const result = {
        ...stats,
        namespace: this.rtNamespace,
        timestamp: new Date().toISOString()
      }

      if (this.flags.json) {
        return result
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
      // Format and display stats in a readable way
      Object.entries(stats).forEach(([key, value]) => {
        this.log(chalk.dim(`   ${key}: ${this.formatValue(value)}`))
      })
    } else {
      this.log(chalk.dim(`   Raw Stats: ${JSON.stringify(stats, null, 2)}`))
    }

    this.log('')
    this.log(chalk.dim(`   Retrieved: ${new Date().toLocaleString()}`))
  }

  formatValue (value) {
    if (typeof value === 'number') {
      // Format large numbers with commas
      return value.toLocaleString()
    }
    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value, null, 2)
    }
    return String(value)
  }
}

Stats.description = 'Get statistics of your App Builder database'

Stats.examples = [
  '$ aio app db stats',
  '$ aio app db stats --json'
]

Stats.flags = {
  ...DBBaseCommand.flags
}

Stats.args = {}
