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
import { DB_STATUS } from '../../../constants/db.js'
import { Flags } from '@oclif/core'

export class Provision extends DBBaseCommand {
  async run () {
    const region = this.db.region

    try {
      // First check if database is already provisioned
      this.log(chalk.blue('Checking current provisioning status...'))

      let provisionStatusResponse
      try {
        provisionStatusResponse = await this.db.provisionStatus()
        this.debugLogger?.info?.('Provision status:', provisionStatusResponse)
      } catch (error) {
        this.debugLogger?.info?.('No existing provisioning status found:', error.message)
        provisionStatusResponse = null
      }

      if (provisionStatusResponse) {
        const currentStatus = provisionStatusResponse.status.toUpperCase()
        const statusRegion = provisionStatusResponse.region

        if (currentStatus === DB_STATUS.PROVISIONED) {
          this.log(chalk.green('Database is already provisioned and ready for use'))
          this.log(chalk.dim(`   Namespace: ${this.rtNamespace}`))
          this.log(chalk.dim(`   Region: ${statusRegion}`))
          this.log(chalk.dim(`   Status: ${currentStatus}`))

          return {
            status: 'already_provisioned',
            namespace: this.rtNamespace,
            details: provisionStatusResponse
          }
        } else if (currentStatus === DB_STATUS.REQUESTED) {
          this.log(chalk.yellow('Database provisioning request has been submitted and is pending'))
          this.log(chalk.dim(`   Namespace: ${this.rtNamespace}`))
          this.log(chalk.dim(`   Region: ${statusRegion}`))
          this.log(chalk.dim(`   Status: ${currentStatus}`))
          this.log(chalk.dim('\nUse "aio app db status --watch" to monitor progress'))

          return {
            status: 'in_progress',
            namespace: this.rtNamespace,
            details: provisionStatusResponse
          }
        } else if (currentStatus === DB_STATUS.PROCESSING) {
          this.log(chalk.yellow('Database is currently being provisioned'))
          this.log(chalk.dim(`   Namespace: ${this.rtNamespace}`))
          this.log(chalk.dim(`   Region: ${statusRegion}`))
          this.log(chalk.dim(`   Status: ${currentStatus}`))
          this.log(chalk.dim('\nUse "aio app db status --watch" to monitor progress'))
          this.log(chalk.red('If provisioning takes unusually long, please contact the App Builder team'))

          return {
            status: 'in_progress',
            namespace: this.rtNamespace,
            details: provisionStatusResponse
          }
        } else if (currentStatus === DB_STATUS.FAILED) {
          this.log(chalk.red('Previous database provisioning failed'))
          this.log(chalk.dim(`   Namespace: ${this.rtNamespace}`))
          this.log(chalk.dim(`   Status: ${currentStatus}`))
          this.log(chalk.yellow('\nAttempting to provision again...'))
          this.log(chalk.red('If the problem persists, please contact the App Builder team'))
        } else if (currentStatus === DB_STATUS.REJECTED) {
          this.log(chalk.red('Previous database provisioning request was rejected'))
          this.log(chalk.dim(`   Namespace: ${this.rtNamespace}`))
          this.log(chalk.dim(`   Status: ${currentStatus}`))
          this.log(chalk.yellow('\nAttempting to provision again...'))
          this.log(chalk.red('If the problem persists, please contact the App Builder team for assistance'))
        } else if (currentStatus !== DB_STATUS.NOT_PROVISIONED) {
          this.log(chalk.yellow(`Database status is '${currentStatus}' - attempting to provision...`))
          this.log(chalk.dim(`   Namespace: ${this.rtNamespace}`))
          this.log(chalk.dim(`   Status: ${currentStatus}`))
          this.log(chalk.red('If you encounter issues, please contact the App Builder team'))
        }
      }

      // Create a new database if not yet provisioned
      this.warn('Database provisioning will create new database resources')

      // Skip confirmation prompt if --yes flag is used
      if (!this.flags.yes) {
        // eslint-disable-next-line node/no-unsupported-features/es-syntax
        const { confirm } = await import('@inquirer/prompts')

        const confirmed = await confirm({
          message: `Provision database for namespace '${this.rtNamespace}'?`,
          default: false
        })

        if (!confirmed) {
          this.log('Database provisioning cancelled')
          return { status: 'cancelled' }
        }
      }

      // Start provisioning
      this.log(chalk.blue(`Submitting a request for a database to be provisioned for the '${this.rtNamespace}' namespace...`))
      this.log(chalk.dim(`   Namespace: ${this.rtNamespace}`))
      this.log(chalk.dim(`   Region: ${region}`))

      const provisionResult = await this.db.provisionRequest()
      this.debugLogger?.info?.('Provision request result:', provisionResult)

      // Handle different provision result statuses
      const resultStatus = provisionResult?.status?.toUpperCase() || DB_STATUS.UNKNOWN

      if (resultStatus === DB_STATUS.PROVISIONED) {
        this.log(chalk.green('Database provisioned successfully and ready for use!'))
      } else if (resultStatus === DB_STATUS.REQUESTED) {
        this.log(chalk.blue('Database provisioning request submitted successfully'))
        this.log(chalk.dim('Provisioning is now pending...'))
      } else if (resultStatus === DB_STATUS.PROCESSING) {
        this.log(chalk.yellow('Database is being provisioned...'))
      } else if (resultStatus === DB_STATUS.FAILED) {
        this.error(`Database provisioning failed: ${provisionResult.message || 'Unknown error'}`)
      } else if (resultStatus === DB_STATUS.REJECTED) {
        this.error(`Database provisioning request was rejected: ${provisionResult.message || 'Unknown reason'}`)
      } else if (resultStatus === DB_STATUS.UNKNOWN) {
        this.warn(`Database provisioning request returned unrecognized status '${provisionResult.status || 'undefined'}', an update to the aio cli tool may be necessary.`)
        this.warn('If the issue persists, please contact the App Builder team.')
      } else {
        this.warn(`Database provisioning request returned unexpected status '${resultStatus}', an update to the aio cli tool may be necessary.`)
        this.warn('If the issue persists, please contact the App Builder team.')
      }

      const result = {
        status: resultStatus.toLowerCase(),
        namespace: this.rtNamespace,
        timestamp: new Date().toISOString(),
        details: provisionResult
      }

      // If region was specified as a CLI flag, include it in the output for next steps
      const { region: regionFlag } = this.flags
      const regionFlagString = regionFlag ? ` --region ${regionFlag}` : ''

      if (resultStatus !== DB_STATUS.PROVISIONED) {
        this.log(chalk.dim('\nNext steps:'))
        this.log(chalk.dim(`   - Monitor progress: aio app db status${regionFlagString} --watch`))
        this.log(chalk.dim(`   - Check status: aio app db status${regionFlagString}`))
      } else {
        this.log(chalk.dim('\nNext steps:'))
        this.log(chalk.dim(`   - Test connection: aio app db ping${regionFlagString}`))
      }

      return result
    } catch (error) {
      this.debugLogger?.error?.('Provision command error:', error)
      this.error(`Database provisioning failed: ${error.message}`)
    }
  }
}

Provision.description = 'Provision a new database for your App Builder application'

Provision.examples = [
  '$ aio app db provision',
  '$ aio app db provision --region amer',
  '$ aio app db provision --json',
  '$ aio app db provision --yes'
]

Provision.flags = {
  ...DBBaseCommand.flags,
  yes: Flags.boolean({
    char: 'y',
    description: 'Skip confirmation prompt and provision automatically',
    default: false
  })
}

Provision.args = {}
