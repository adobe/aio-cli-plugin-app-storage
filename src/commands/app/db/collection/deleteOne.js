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

export class DeleteOne extends DBBaseCommand {
  async run () {
    const { collection, filter } = this.args

    try {
      this.log(chalk.blue(`Deleting document from collection '${collection}'...`))

      const client = await this.db.connect()
      const coll = client.collection(collection)

      // Delete the document
      const result = await coll.deleteOne(filter)

      this.debugLogger?.info?.('Document deleted successfully:', result)

      const response = {
        collection,
        filter: filter,
        deletedCount: result.deletedCount,
        acknowledged: result.acknowledged,
        namespace: this.rtNamespace,
        timestamp: new Date().toISOString(),
        result
      }

      if (result.deletedCount > 0) {
        this.log(chalk.green(`Document deleted successfully from collection '${collection}'`))
        this.log(chalk.dim(`   Namespace: ${this.rtNamespace}`))
      } else {
        this.log(chalk.yellow(`No document found in collection '${collection}' matching the filter`))
        this.log(chalk.dim(`   Namespace: ${this.rtNamespace}`))
      }

      this.log(chalk.dim(`   Deleted: ${new Date().toLocaleString()}`))

      return response
    } catch (error) {
      this.debugLogger?.error?.('Error deleting document:', error)

      const errorMessage = `Failed to delete document from collection '${collection}': ${error.message}`

      this.log(chalk.red('Failed to delete document'))
      this.log(chalk.dim(`   Collection: ${collection}`))
      this.log(chalk.dim(`   Namespace: ${this.rtNamespace}`))

      this.error(errorMessage)
    }
  }
}

DeleteOne.description = 'Delete a single document from a collection'

DeleteOne.examples = [
  '$ aio app db collection deleteOne users \'{"name": "John"}\'',
  '$ aio app db collection deleteOne products \'{"id": "123"}\' --json',
  '$ aio app db collection deleteOne posts \'{"status": "draft"}\'',
  '$ aio app db collection deleteOne users \'{"email": "john@example.com"}\''
]

DeleteOne.args = {
  collection: Args.string({
    name: 'collection',
    description: 'The name of the collection',
    required: true
  }),
  filter: Args.string({
    name: 'filter',
    description: 'The filter document (JSON string)',
    required: true,
    parse: (input) => {
      try {
        const parsed = JSON.parse(input)

        // Validate that it's a valid object (not null, not an array)
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
          throw new Error('Filter must be a valid JSON object (not null, not an array)')
        }

        return parsed
      } catch (error) {
        if (error.message.includes('Filter must be a valid JSON object')) {
          throw error
        }
        throw new Error(`Invalid filter JSON: ${error.message}`)
      }
    }
  })
}

DeleteOne.flags = {
  ...DBBaseCommand.flags
}
