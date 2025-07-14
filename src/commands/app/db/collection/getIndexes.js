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

export class GetIndexes extends DBBaseCommand {
  async run () {
    const { collectionName } = this.args

    if (typeof collectionName !== 'string' || collectionName.trim().length === 0) {
      this.error('Collection name must be a non-empty string')
    }

    try {
      // Validate flags
      this.log(chalk.blue(`Getting indexes from collection '${collectionName}'...`))

      const client = await this.db.connect()
      const collection = await client.collection(collectionName)

      const result = await collection.getIndexes()

      this.debugLogger?.info?.('Indexes retrieved successfully:', result)

      const response = {
        collectionName,
        namespace: this.rtNamespace,
        timestamp: new Date().toISOString(),
        indexes: result
      }

      this.log(chalk.green('Indexes retrieved successfully'))
      this.log(chalk.dim(`   Namespace: ${this.rtNamespace}`))
      this.log(chalk.dim(`   Retrieved: ${new Date().toLocaleString()}`))
      if (result && Array.isArray(result) && result.length > 0) {
        this.log(chalk.dim(`   Indexes:\n${JSON.stringify(result, null, 2).replace(/^/gm, '     ')}`))
      } else {
        this.log(chalk.dim('   No indexes found for this collection'))
      }

      return response
    } catch (error) {
      this.debugLogger?.error?.('Error getting indexes:', error)

      this.log(chalk.red('Failed to retrieve indexes'))
      this.log(chalk.dim(`   Collection: ${collectionName}`))
      this.log(chalk.dim(`   Namespace: ${this.rtNamespace}`))
      this.log(chalk.dim(`   Error: ${error.message}`))

      this.error(`Failed to retrieve indexes from collection '${collectionName}': ${error.message}`)
    }
  }
}

GetIndexes.description = 'Get the list of indexes from a collection in the database'

GetIndexes.examples = [
  '$ aio app db collection getIndexes users',
  '$ aio app db collection getIndexes products --json'
]

GetIndexes.args = {
  collectionName: Args.string({
    name: 'collectionName',
    description: 'The name of the collection to retrieve indexes from',
    required: true
  })
}

GetIndexes.flags = DBBaseCommand.flags
