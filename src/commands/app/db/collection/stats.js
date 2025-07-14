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

export class StatsCollection extends DBBaseCommand {
  async run () {
    const { collectionName } = this.args

    try {
      this.log(chalk.blue(`Getting stats for collection '${collectionName}'...`))

      const client = await this.db.connect()

      // Get the collection object
      const collection = client.collection(collectionName)

      // Get collection-level statistics
      const stats = await collection.stats()

      this.debugLogger?.info?.('Collection stats retrieved successfully:', stats)

      const response = {
        collectionName,
        stats,
        namespace: this.rtNamespace,
        timestamp: new Date().toISOString()
      }

      this.log(chalk.green(`Stats for collection '${collectionName}':`))
      this.log(chalk.dim(`   Namespace: ${this.rtNamespace}`))

      if (stats && typeof stats === 'object') {
        // Display stats in a formatted way
        Object.entries(stats).forEach(([key, value]) => {
          this.log(chalk.dim(`   ${key}: ${value}`))
        })
      }

      this.log(chalk.dim(`   Retrieved: ${new Date().toLocaleString()}`))

      return response
    } catch (error) {
      this.debugLogger?.error?.('Error getting collection stats:', error)

      const errorMessage = `Failed to get stats for collection '${collectionName}': ${error.message}`

      this.log(chalk.red('Failed to get collection stats'))
      this.log(chalk.dim(`   Collection: ${collectionName}`))
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
  collectionName: Args.string({
    name: 'collectionName',
    description: 'The name of the collection to get stats for',
    required: true
  })
}

StatsCollection.flags = {
  ...DBBaseCommand.flags
}
