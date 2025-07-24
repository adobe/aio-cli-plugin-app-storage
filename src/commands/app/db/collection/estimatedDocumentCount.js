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

export class EstimatedDocumentCount extends DBBaseCommand {
  async run () {
    const { collection } = this.args

    try {
      this.log(chalk.blue(`Getting estimated document count for collection '${collection}'...`))

      const client = await this.db.connect()
      const coll = client.collection(collection)

      // Get estimated document count
      const count = await coll.estimatedDocumentCount({})

      this.debugLogger?.info?.('Estimated document count:', count)

      const response = {
        collection,
        estimatedCount: count,
        namespace: this.rtNamespace,
        timestamp: new Date().toISOString()
      }

      this.log(chalk.green(`Estimated ${count} document(s) in collection '${collection}'`))
      this.log(chalk.dim(`   Namespace: ${this.rtNamespace}`))
      this.log(chalk.dim('   Note: This is an estimate based on collection metadata'))

      this.log(chalk.dim(`   Estimated: ${new Date().toLocaleString()}`))

      return response
    } catch (error) {
      this.debugLogger?.error?.('Error getting estimated document count:', error)

      const errorMessage = `Failed to get estimated document count for collection '${collection}': ${error.message}`

      this.log(chalk.red('Failed to get estimated document count'))
      this.log(chalk.dim(`   Collection: ${collection}`))
      this.log(chalk.dim(`   Namespace: ${this.rtNamespace}`))
      this.error(errorMessage)
    }
  }
}

EstimatedDocumentCount.description = 'Get estimated document count for a collection based on collection metadata'

EstimatedDocumentCount.examples = [
  '$ aio app db collection estimatedDocumentCount users',
  '$ aio app db collection estimatedDocumentCount products',
  '$ aio app db collection estimatedDocumentCount posts --json'
]

EstimatedDocumentCount.args = {
  collection: Args.string({
    name: 'collection',
    description: 'The name of the collection',
    required: true,
    parse: input => isNonEmptyString(input, 'Collection name')
  })
}

EstimatedDocumentCount.flags = {
  ...DBBaseCommand.flags
}
