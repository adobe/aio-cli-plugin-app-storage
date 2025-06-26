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

import { DBBaseCommand } from '../../../DBBaseCommand.js'
import { Flags } from '@oclif/core'
import chalk from 'chalk'

export class Provision extends DBBaseCommand {
  async run () {
    const { region } = this.flags

    this.debugLogger?.info?.('Starting database provisioning process')

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

        if (currentStatus === 'PROVISIONED') {
          this.log(chalk.green('Database is already provisioned and ready for use'))
          this.log(chalk.dim(`   Namespace: ${this.rtNamespace}`))
          this.log(chalk.dim(`   Region: ${provisionStatusResponse.region || 'amer'}`))
          this.log(chalk.dim(`   Status: ${currentStatus}`))

          return {
            status: 'already_provisioned',
            namespace: this.rtNamespace,
            region: provisionStatusResponse.region || 'amer',
            details: provisionStatusResponse
          }
        } else if (currentStatus === 'REQUESTED' || currentStatus === 'PROCESSING') {
          this.log(chalk.yellow('Database provisioning is already in progress'))
          this.log(chalk.dim(`   Namespace: ${this.rtNamespace}`))
          this.log(chalk.dim(`   Region: ${provisionStatusResponse.region || 'amer'}`))
          this.log(chalk.dim(`   Status: ${currentStatus}`))
          this.log(chalk.dim('\nUse "aio app db status --watch" to monitor progress'))

          return {
            status: 'in_progress',
            namespace: this.rtNamespace,
            region: provisionStatusResponse.region || 'amer',
            details: provisionStatusResponse
          }
        } else if (currentStatus === 'FAILED') {
          this.log(chalk.red('Previous database provisioning failed'))
          this.log(chalk.dim(`   Namespace: ${this.rtNamespace}`))
          this.log(chalk.dim(`   Status: ${currentStatus}`))
          this.log(chalk.yellow('\nAttempting to provision again...'))
        }
      }

      // Create a new database if not yet provisioned
      this.warn('Database provisioning will create new database resources')

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

      // Start provisioning
      this.log(chalk.blue('Starting database provisioning...'))
      this.log(chalk.dim(`   Namespace: ${this.rtNamespace}`))
      this.log(chalk.dim(`   Region: ${region || 'amer'}`))

      const provisionResult = await this.db.provisionRequest({ region })
      this.debugLogger?.info?.('Provision request result:', provisionResult)

      // Handle different provision result statuses
      const resultStatus = provisionResult?.status?.toUpperCase() || 'UNKNOWN'

      if (resultStatus === 'PROVISIONED') {
        this.log(chalk.green('Database provisioned successfully and ready for use!'))
      } else if (resultStatus === 'REQUESTED') {
        this.log(chalk.blue('Database provisioning request submitted successfully'))
        this.log(chalk.dim('Provisioning is now in progress...'))
      } else if (resultStatus === 'PROCESSING') {
        this.log(chalk.yellow('Database is being provisioned...'))
      } else if (resultStatus === 'FAILED') {
        this.error(`Database provisioning failed: ${provisionResult.message || 'Unknown error'}`)
      } else {
        this.log(chalk.blue('Database provisioning request submitted'))
      }

      const result = {
        status: resultStatus.toLowerCase(),
        namespace: this.rtNamespace,
        region: region || 'amer',
        timestamp: new Date().toISOString(),
        details: provisionResult
      }

      if (!this.flags.json && resultStatus !== 'PROVISIONED') {
        this.log(chalk.dim('\nNext steps:'))
        this.log(chalk.dim('   - Monitor progress: aio app db status --watch'))
        this.log(chalk.dim('   - Check status: aio app db status'))
      } else if (!this.flags.json && resultStatus === 'PROVISIONED') {
        this.log(chalk.dim('\nNext steps:'))
        this.log(chalk.dim('   - Test connection: aio app db ping'))
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
  '$ aio app db provision --json'
]

Provision.flags = {
  ...DBBaseCommand.flags,
  region: Flags.string({
    description: 'Region in which database is to be provisioned',
    required: false,
    options: ['amer', 'emea', 'apac'],
    default: 'amer'
  })
}

Provision.args = {}
