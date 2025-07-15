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

export class ReplaceOne extends DBBaseCommand {
  async run () {
    const { collection, filter, replacement } = this.args
    const { upsert } = this.flags

    try {
      // Parse filter JSON
      let filterObj
      try {
        filterObj = JSON.parse(filter)
      } catch (error) {
        this.error(`Invalid filter JSON: ${error.message}`)
      }

      // Parse replacement JSON
      let replacementObj
      try {
        replacementObj = JSON.parse(replacement)
      } catch (error) {
        this.error(`Invalid replacement JSON: ${error.message}`)
      }

      this.log(chalk.blue(`Replacing document in collection '${collection}'...`))

      if (upsert) {
        this.log(chalk.dim('   Upsert enabled: Will create document if not found'))
      }

      const client = await this.db.connect()
      const coll = client.collection(collection)

      // Build options
      const options = {}
      if (upsert) {
        options.upsert = true
      }

      // Replace the document
      const result = await coll.replaceOne(filterObj, replacementObj, options)

      this.debugLogger?.info?.('Document replaced successfully:', result)

      const response = {
        collection,
        filter: filterObj,
        replacement: replacementObj,
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
        acknowledged: result.acknowledged,
        upsertedId: result.upsertedId,
        upsertedCount: result.upsertedCount,
        namespace: this.rtNamespace,
        timestamp: new Date().toISOString(),
        result
      }

      if (result.matchedCount > 0) {
        this.log(chalk.green(`Document replaced successfully in collection '${collection}'`))
        this.log(chalk.dim(`   Namespace: ${this.rtNamespace}`))
        this.log(chalk.dim(`   Matched: ${result.matchedCount}`))
        this.log(chalk.dim(`   Modified: ${result.modifiedCount}`))
        this.log(chalk.dim(`   Acknowledged: ${result.acknowledged}`))
      } else if (upsert && result.upsertedId) {
        this.log(chalk.green(`Document created (upserted) in collection '${collection}'`))
        this.log(chalk.dim(`   Namespace: ${this.rtNamespace}`))
        this.log(chalk.dim(`   Upserted ID: ${result.upsertedId}`))
        this.log(chalk.dim(`   Upserted count: ${result.upsertedCount}`))
        this.log(chalk.dim(`   Acknowledged: ${result.acknowledged}`))
      } else {
        this.log(chalk.yellow(`No document found in collection '${collection}' matching the filter`))
        this.log(chalk.dim(`   Namespace: ${this.rtNamespace}`))
        this.log(chalk.dim(`   Matched: ${result.matchedCount}`))
        this.log(chalk.dim(`   Modified: ${result.modifiedCount}`))
      }

      this.log(chalk.dim(`   Replaced: ${new Date().toLocaleString()}`))

      return response
    } catch (error) {
      this.debugLogger?.error?.('Error replacing document:', error)

      const errorMessage = `Failed to replace document in collection '${collection}': ${error.message}`

      this.log(chalk.red('Failed to replace document'))
      this.log(chalk.dim(`   Collection: ${collection}`))
      this.log(chalk.dim(`   Namespace: ${this.rtNamespace}`))
      this.log(chalk.dim(`   Error: ${error.message}`))

      this.error(errorMessage)
    }
  }
}

ReplaceOne.description = 'Replace a single document in a collection'

ReplaceOne.examples = [
  '$ aio app db collection replaceOne users \'{"name": "John"}\' \'{"name": "John Doe", "age": 30, "status": "active"}\'',
  '$ aio app db collection replaceOne products \'{"id": "123"}\' \'{"id": "123", "name": "New Product", "price": 99.99}\' --json',
  '$ aio app db collection replaceOne posts \'{"slug": "hello-world"}\' \'{"title": "Hello World", "content": "Updated content", "status": "published"}\' --upsert',
  '$ aio app db collection replaceOne users \'{"email": "john@example.com"}\' \'{"email": "john@example.com", "name": "John", "verified": true}\' --upsert'
]

ReplaceOne.args = {
  collection: Args.string({
    name: 'collection',
    description: 'The name of the collection',
    required: true
  }),
  filter: Args.string({
    name: 'filter',
    description: 'The filter document (JSON string)',
    required: true
  }),
  replacement: Args.string({
    name: 'replacement',
    description: 'The replacement document (JSON string)',
    required: true
  })
}

ReplaceOne.flags = {
  ...DBBaseCommand.flags,
  upsert: Flags.boolean({
    char: 'u',
    description: 'If no document is found, create a new one',
    default: false
  })
}
