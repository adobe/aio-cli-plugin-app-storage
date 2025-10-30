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

export class Delete extends DBBaseCommand {
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
        filter,
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

Delete.description = 'Delete a single document from a collection'

Delete.examples = [
  '$ aio app db document delete users \'{"name": "John"}\'',
  '$ aio app db document delete products \'{"id": "123"}\' --json',
  '$ aio app db doc delete posts \'{"status": "draft"}\''
]

Delete.args = {
  collection: Args.string({
    name: 'collection',
    description: 'The name of the collection',
    required: true,
    parse: input => isNonEmptyString(input, 'Collection name')
  }),
  filter: Args.string({
    name: 'filter',
    description: 'The filter document (JSON string)',
    required: true,
    parse: input => asObject(input, 'Filter')
  })
}

Delete.flags = {
  ...DBBaseCommand.flags
}

Delete.aliases = ['app:db:doc:delete']
