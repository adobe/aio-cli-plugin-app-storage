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
import { Args, Flags } from '@oclif/core'
import chalk from 'chalk'
import { asObject, isNonEmptyString } from '../../../../utils/inputValidation.js'
import { prettyJson } from '../../../../utils/output.js'

export class FindOne extends DBBaseCommand {
  async run () {
    const { collection, filter } = this.args
    const { projection } = this.flags

    try {
      this.log(chalk.blue(`Finding document in collection '${collection}'...`))

      if (projection) {
        this.log(chalk.dim(`   Using projection: ${JSON.stringify(projection)}`))
      }

      const client = await this.db.connect()
      const coll = client.collection(collection)

      // Build options
      const options = {}
      if (projection) {
        options.projection = projection
      }

      // Find the document
      const result = await coll.findOne(filter, options)

      this.debugLogger?.info?.('Document found:', result)

      const response = {
        collection,
        filter,
        projection,
        document: result,
        namespace: this.rtNamespace,
        timestamp: new Date().toISOString()
      }

      if (result) {
        this.log(chalk.green(`Document found in collection '${collection}'`))
        this.log(chalk.dim(`   Namespace: ${this.rtNamespace}`))

        if (projection) {
          this.log(chalk.dim('   Projection applied: Yes'))
        }

        this.log(chalk.dim('   Document:'))
        this.log(chalk.dim(`${prettyJson(result)}`))
      } else {
        this.log(chalk.yellow(`No document found in collection '${collection}' matching the filter`))
        this.log(chalk.dim(`   Namespace: ${this.rtNamespace}`))
      }

      this.log(chalk.dim(`   Searched: ${new Date().toLocaleString()}`))

      return response
    } catch (error) {
      this.debugLogger?.error?.('Error finding document:', error)

      const errorMessage = `Failed to find document in collection '${collection}': ${error.message}`

      this.log(chalk.red('Failed to find document'))
      this.log(chalk.dim(`   Collection: ${collection}`))
      this.log(chalk.dim(`   Namespace: ${this.rtNamespace}`))
      this.error(errorMessage)
    }
  }
}

FindOne.description = 'Find a single document in a collection'

FindOne.examples = [
  '$ aio app db collection findOne users \'{"name": "John"}\'',
  '$ aio app db collection findOne products \'{"price": {"$lt": 50}}\' --json',
  '$ aio app db collection findOne posts \'{"status": "published"}\' --projection \'{"title": 1, "author": 1}\'',
  '$ aio app db collection findOne users \'{"age": {"$gte": 21}}\' --projection \'{"name": 1, "_id": 0}\''
]

FindOne.args = {
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

FindOne.flags = {
  ...DBBaseCommand.flags,
  projection: Flags.string({
    char: 'p',
    description: 'The fields to return (JSON string, e.g., \'{"name": 1, "_id": 0}\')',
    parse: input => asObject(input, 'Projection')
  })
}
