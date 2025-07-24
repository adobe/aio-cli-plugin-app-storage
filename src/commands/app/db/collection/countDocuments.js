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
import { asObject, isNonEmptyString } from '../../../../utils/inputValidation.js'

export class CountDocuments extends DBBaseCommand {
  async run () {
    const { collection, query } = this.args

    try {
      this.log(chalk.blue(`Counting documents in collection '${collection}'...`))

      if (query) {
        this.log(chalk.dim(`   Using query filter: ${JSON.stringify(query)}`))
      }

      const client = await this.db.connect()
      const coll = client.collection(collection)

      // Count documents
      const count = await coll.countDocuments(query || {}, {})

      this.debugLogger?.info?.('Document count:', count)

      const response = {
        collection,
        query: query || {},
        count,
        namespace: this.rtNamespace,
        timestamp: new Date().toISOString()
      }

      this.log(chalk.green(`Found ${count} document(s) in collection '${collection}'`))
      this.log(chalk.dim(`   Namespace: ${this.rtNamespace}`))

      if (query && Object.keys(query).length > 0) {
        this.log(chalk.dim('   Query filter applied: Yes'))
      }

      this.log(chalk.dim(`   Counted: ${new Date().toLocaleString()}`))

      return response
    } catch (error) {
      this.debugLogger?.error?.('Error counting documents:', error)

      const errorMessage = `Failed to count documents in collection '${collection}': ${error.message}`

      this.log(chalk.red('Failed to count documents'))
      this.log(chalk.dim(`   Collection: ${collection}`))
      this.log(chalk.dim(`   Namespace: ${this.rtNamespace}`))
      this.error(errorMessage)
    }
  }
}

CountDocuments.description = 'Count documents in a collection'

CountDocuments.examples = [
  '$ aio app db collection countDocuments users',
  '$ aio app db collection countDocuments users \'{"age": {"$gte": 21}}\'',
  '$ aio app db collection countDocuments products \'{"category": "electronics"}\' --json'
]

CountDocuments.args = {
  collection: Args.string({
    name: 'collection',
    description: 'The name of the collection',
    required: true,
    parse: input => isNonEmptyString(input, 'Collection name')
  }),
  query: Args.string({
    name: 'query',
    description: 'The query filter document (JSON string). If not provided, counts all documents.',
    required: false,
    parse: input => asObject(input, 'Query')
  })
}

CountDocuments.flags = {
  ...DBBaseCommand.flags
}
