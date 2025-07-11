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

export class Ping extends DBBaseCommand {
  async run () {
    try {
      this.log(chalk.blue('Testing database connectivity...'))

      const startTime = Date.now()
      const pingResult = await this.db.ping()
      const endTime = Date.now()
      const responseTime = endTime - startTime

      this.debugLogger?.info?.(`Database ping completed in ${responseTime}ms:`, pingResult)

      this.log(chalk.green('Database connection successful'))
      this.log(chalk.dim(`   Namespace: ${this.rtNamespace}`))
      this.log(chalk.dim(`   Response time: ${responseTime}ms`))

      if (typeof pingResult === 'string') {
        this.log(chalk.dim(`   Response: ${pingResult}`))
      }

      const result = {
        status: 'success',
        namespace: this.rtNamespace,
        responseTime,
        response: pingResult,
        timestamp: new Date().toISOString()
      }

      this.log(chalk.dim('Database is ready for operations'))

      return result
    } catch (error) {
      this.debugLogger?.error?.('Ping command error:', error)

      this.log(chalk.red('Database connection failed'))
      this.log(chalk.dim(`   Namespace: ${this.rtNamespace}`))
      this.log(chalk.dim(`   Error: ${error.message}`))

      const result = {
        status: 'failed',
        namespace: this.rtNamespace,
        error: error.message,
        timestamp: new Date().toISOString()
      }

      return result
    }
  }
}

Ping.description = 'Test connectivity to your App Builder database'

Ping.examples = [
  '$ aio app db ping',
  '$ aio app db ping --json'
]

Ping.flags = {
  ...DBBaseCommand.flags
}

Ping.args = {}
