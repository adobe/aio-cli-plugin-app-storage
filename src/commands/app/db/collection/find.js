/*
Copyright 2025 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License")
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

import { DBBaseCommand } from '../../../../DBBaseCommand.js'
import { Args, Flags } from '@oclif/core'
import { asObject, isNonEmptyString } from '../../../../utils/inputValidation.js'
import chalk from 'chalk'
import { prettyJson } from '../../../../utils/output.js'

export class Find extends DBBaseCommand {
  async run () {
    const { collection, filter } = this.args
    const { limit, skip, sort, projection } = this.flags

    try {
      this.log(chalk.blue(`Finding documents in collection '${collection}'...`))
      this.log(chalk.dim(`   Filter:\n${prettyJson(filter)}`))

      // Prepare options for find
      const options = {}
      if (limit !== undefined) {
        this.log(chalk.dim(`   Limit: ${limit}`))
        options.limit = limit
      }
      if (skip !== undefined) {
        this.log(chalk.dim(`   Skip: ${skip}`))
        options.skip = skip
      }
      if (sort !== undefined) {
        this.log(chalk.dim(`   Sort:\n${prettyJson(sort)}`))
        options.sort = sort
      }
      if (projection !== undefined) {
        this.log(chalk.dim(`   Projection:\n${prettyJson(projection)}`))
        options.projection = projection
      }

      this.log(chalk.dim(`   Namespace: ${this.rtNamespace}\n`))

      const client = await this.db.connect()
      const coll = client.collection(collection)
      const results = await coll.findArray(filter, options)
      const timestamp = new Date().toISOString()
      const response = {
        collection,
        filter,
        options,
        results,
        namespace: this.rtNamespace,
        timestamp
      }

      this.debugLogger?.info?.('Find results:', results)
      if (results?.length > 0) {
        this.log(chalk.green(`Retrieved ${results.length} document(s) from collection '${collection}'`))
        this.log(chalk.dim(`   Searched: ${timestamp}`))
        this.log(chalk.dim(`   Results:\n${prettyJson(results)}`))
      } else {
        this.log(chalk.green(`No documents matching the filter criteria found in collection '${collection}'.`))
        this.log(chalk.dim(`   Searched: ${timestamp}`))
      }

      return response
    } catch (error) {
      this.debugLogger?.error?.('Error finding documents:', error)

      const errorMessage = `Failed to find documents in collection '${collection}': ${error.message}`

      this.log(chalk.red('Failed to find documents'))
      this.log(chalk.dim(`   Collection: ${collection}`))
      this.log(chalk.dim(`   Namespace: ${this.rtNamespace}`))
      this.error(errorMessage)
    }
  }
}

Find.description = 'Find documents in a collection based on filter criteria.'

Find.examples = [
  '$ aio app db collection find users \'{}\'',
  '$ aio app db collection find products \'{"category": "Computer Accessories"}\' --json',
  '$ aio app db collection find products \'{"name": {"$regex": "Speakers$"}}\' --sort \'{"price": -1}\' --limit 10 --skip 5 --projection \'{"name": 1, "price": 1}\''
]

Find.args = {
  collection: Args.string({
    name: 'collection',
    description: 'The name of the collection',
    required: true,
    parse: input => isNonEmptyString(input, 'Collection name')
  }),
  filter: Args.string({
    name: 'filter',
    description: 'Filter criteria for the documents to find (JSON string, e.g. \'{"status": "active"}\')',
    required: true,
    parse: input => asObject(input, 'Filter')
  })
}

Find.flags = {
  ...DBBaseCommand.flags,
  limit: Flags.integer({
    char: 'l',
    description: 'Limit the number of documents returned, max: 100',
    default: 20,
    max: 100,
    min: 0
  }),
  skip: Flags.integer({
    char: 's',
    description: 'Skip the first N documents',
    min: 0
  }),
  sort: Flags.string({
    char: 'o',
    description: 'Sort specification as a JSON object (e.g. \'{"field": 1}\')',
    parse: input => asObject(input, 'Sort')
  }),
  projection: Flags.string({
    char: 'p',
    description: 'Projection specification as a JSON object (e.g. \'{"field1": 1, "field2": 0}\')',
    parse: input => asObject(input, 'Projection')
  })
}
