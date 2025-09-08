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
import { Flags } from '@oclif/core'
import { DB_STATUS } from '../../../constants/db.js'
import { isProductionNamespace } from '../../../utils/inputValidation.js'

export class DeleteDb extends DBBaseCommand {
  async run () {
    const region = this.db.region
    const namespace = this.rtNamespace

    try {
      // Check if the namespace is a production namespace
      if (isProductionNamespace(namespace)) {
        this.error('A production database may not be deleted directly. Please contact the App Builder team to have this database deleted.')
      }

      // eslint-disable-next-line node/no-unsupported-features/es-syntax
      const { confirm, input } = await import('@inquirer/prompts')

      if (!this.flags.force) {
        process.stderr.write(chalk.red('❌ CAUTION, This action cannot be reverted and all stored data will be lost.') + '\n')
        const confirmed = await confirm({
          message: `Are you sure you want to delete the database for the '${namespace}' namespace in the ${region} region?`,
          default: false
        })
        if (!confirmed) {
          this.log('Database deletion cancelled')
          return { status: 'cancelled' }
        }
        const res = await input({
          message: chalk.yellow(`confirm deletion by typing: '${namespace}'`)
        })
        if (res !== namespace) {
          return this.error('confirmation did not match, aborted')
        }
      }

      this.log(chalk.blue(`Proceeding to delete the database for the namespace: '${namespace}'...`))

      const deleteResult = await this.db.deleteDatabase()
      this.debugLogger?.info?.('Delete request result:', deleteResult)

      const deleteStatus = deleteResult?.status?.toUpperCase() || DB_STATUS.UNKNOWN

      if (deleteStatus === DB_STATUS.DELETED) {
        this.log(chalk.green('Database deleted successfully'))
        this.log(chalk.dim('Check database status: aio app db status'))
      } else {
        this.warn(`Delete request returned status '${deleteStatus}'`)
        this.warn('If the issue persists, please contact the App Builder team.')
      }

      const result = {
        status: deleteStatus,
        namespace,
        timestamp: new Date().toISOString(),
        details: deleteResult
      }

      return result
    } catch (error) {
      this.debugLogger?.error?.('Delete command error:', error)
      this.error(`Database deletion failed: ${error.message}`)
    }
  }
}

DeleteDb.description = 'Delete the database for your App Builder application (non-production only)'

DeleteDb.examples = [
  '$ aio app db delete',
  '$ aio app db delete --force',
  '$ aio app db delete --json'
]

DeleteDb.flags = {
  ...DBBaseCommand.flags,
  force: Flags.boolean({
    description: '[use with caution!] force delete, skips confirmation safety prompt',
    default: false
  })
}

DeleteDb.args = {}
