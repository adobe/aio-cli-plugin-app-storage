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
import { Args } from '@oclif/core'
import chalk from 'chalk'
import { isNonEmptyString } from '../../../../utils/inputValidation.js'
import { prettyJson } from '../../../../utils/output.js'

export class StatsCollection extends DBBaseCommand {
  async run () {
    const { collection } = this.args

    try {
      this.log(chalk.blue(`Getting stats for collection '${collection}'...`))

      const client = await this.db.connect()

      // Get the collection object
      const coll = client.collection(collection)

      // Get collection-level statistics
      const stats = await coll.stats()

      this.debugLogger?.info?.('Collection stats retrieved successfully:', stats)

      const response = {
        collection,
        stats,
        namespace: this.rtNamespace,
        timestamp: new Date().toISOString()
      }

      this.log(chalk.green(`Stats for collection '${collection}':`))
      this.log(chalk.dim(`   Namespace: ${this.rtNamespace}`))

      // Display stats in a formatted way
      Object.entries(stats).forEach(([key, value]) => {
        if (typeof value === 'object' && value !== null) {
          this.log(chalk.dim(`   ${key}:\n${prettyJson(value)}`))
        } else {
          this.log(chalk.dim(`   ${key}: ${value}`))
        }
      })

      this.log(chalk.dim(`   Retrieved: ${new Date().toLocaleString()}`))

      return response
    } catch (error) {
      this.debugLogger?.error?.('Error getting collection stats:', error)

      const errorMessage = `Failed to get stats for collection '${collection}': ${error.message}`

      this.log(chalk.red('Failed to get collection stats'))
      this.log(chalk.dim(`   Collection: ${collection}`))
      this.log(chalk.dim(`   Namespace: ${this.rtNamespace}`))
      this.log(chalk.dim(`   Error: ${error.message}`))

      this.error(errorMessage)
    }
  }
}

StatsCollection.description = 'Get statistics for a collection in the database'

StatsCollection.examples = [
  '$ aio app db collection stats users',
  '$ aio app db collection stats products --json'
]

StatsCollection.args = {
  collection: Args.string({
    name: 'collection',
    description: 'The name of the collection to get stats for',
    required: true,
    parse: input => isNonEmptyString(input, 'Collection name')
  })
}

StatsCollection.flags = {
  ...DBBaseCommand.flags
}
