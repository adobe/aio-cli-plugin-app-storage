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
import { Flags } from '@oclif/core'
import chalk from 'chalk'
import { DB_STATUS } from '../../../constants/db.js'

export class Status extends DBBaseCommand {
  async run () {
    const { watch } = this.flags

    this.debugLogger?.info?.('Checking database provisioning status')

    if (watch) {
      return this.watchStatus()
    } else {
      return this.checkStatus()
    }
  }

  async checkStatus () {
    try {
      this.log(chalk.blue('Checking database provisioning status...'))

      const provisionStatusResponse = await this.db.provisionStatus()
      this.debugLogger?.info?.('Status result:', provisionStatusResponse)

      this.displayStatus(provisionStatusResponse)

      return {
        ...provisionStatusResponse,
        namespace: this.rtNamespace,
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      this.debugLogger?.error?.('Status command error:', error)

      if (error.httpStatusCode === 404) {
        this.log(chalk.yellow('No database has been provisioned for this workspace'))
        this.log(chalk.dim(`   Namespace: ${this.rtNamespace}`))
        this.log(chalk.dim(`   Status: ${DB_STATUS.NOT_PROVISIONED}`))

        return {
          status: DB_STATUS.NOT_PROVISIONED,
          namespace: this.rtNamespace,
          timestamp: new Date().toISOString()
        }
      }

      this.error(`Failed to check database status: ${error.message}`)
    }
  }

  async watchStatus () {
    this.log(chalk.blue('Watching database provisioning status (press Ctrl+C to stop)...'))

    let previousStatus = null
    const checkInterval = 3000 // 3 seconds

    const watchLoop = async () => {
      try {
        const provisionStatusResponse = await this.db.provisionStatus()

        // Only display if status changed
        if (previousStatus?.status !== provisionStatusResponse?.status) {
          this.log(chalk.dim(`\n[${new Date().toLocaleTimeString()}]`))
          this.displayStatus(provisionStatusResponse, false) // Don't show timestamp in watch mode
          previousStatus = provisionStatusResponse

          // Stop watching if provisioning is complete or failed
          const currentStatus = provisionStatusResponse.status?.toUpperCase()
          if (currentStatus !== DB_STATUS.REQUESTED && currentStatus !== DB_STATUS.PROCESSING) {
            this.log(chalk.dim('\nStopping watch mode.'))
            return provisionStatusResponse
          }
        }

        // Schedule next check
        setTimeout(watchLoop, checkInterval)
      } catch (error) {
        this.debugLogger?.error?.('Watch status error:', error)
        this.log(chalk.red(`\n[${new Date().toLocaleTimeString()}] Error: ${error.message}`))

        // Continue watching despite errors
        setTimeout(watchLoop, checkInterval)
      }
    }

    // Start watching
    return watchLoop()
  }

  displayStatus (provisionStatusResponse, showTimestamp = true) {
    const currentStatus = provisionStatusResponse.status.toUpperCase()
    const statusColor = this.getStatusColor(currentStatus)

    this.log(statusColor(`Database Status: ${currentStatus}`))
    this.log(chalk.dim(`   Namespace: ${this.rtNamespace}`))

    if (provisionStatusResponse.message) {
      this.log(chalk.dim(`   Message: ${provisionStatusResponse.message}`))
    }

    if (provisionStatusResponse.submitted) {
      this.log(chalk.dim(`   Submitted: ${new Date(provisionStatusResponse.submitted).toLocaleString()}`))
    }

    if (showTimestamp) {
      this.log(chalk.dim(`   Checked: ${new Date().toLocaleString()}`))
    }
  }

  /* istanbul ignore next */
  getStatusColor (statusValue) {
    const status = statusValue.toUpperCase()
    switch (status) {
      case DB_STATUS.PROVISIONED:
        return chalk.green
      case DB_STATUS.REQUESTED:
      case DB_STATUS.PROCESSING:
        return chalk.yellow
      case DB_STATUS.FAILED:
      case DB_STATUS.REJECTED:
        return chalk.red
      case DB_STATUS.NOT_PROVISIONED:
        return chalk.blue
      default:
        return chalk.gray
    }
  }
}

Status.description = 'Check the provisioning status of your App Builder database'

Status.examples = [
  '$ aio app db status',
  '$ aio app db status --watch',
  '$ aio app db status --json'
]

Status.flags = {
  ...DBBaseCommand.flags,
  watch: Flags.boolean({
    description: 'Watch for status changes (press Ctrl+C to stop)',
    default: false
  })
}

Status.args = {}
