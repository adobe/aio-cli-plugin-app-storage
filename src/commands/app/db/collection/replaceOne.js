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
      const result = await coll.replaceOne(filter, replacement, options)

      this.debugLogger?.info?.('Document replaced successfully:', result)

      const response = {
        collection,
        filter,
        replacement,
        namespace: this.rtNamespace,
        timestamp: new Date().toISOString(),
        result
      }

      if (result.matchedCount > 0) {
        this.log(chalk.green(`Document replaced successfully in collection '${collection}'`))
        this.log(chalk.dim(`   Namespace: ${this.rtNamespace}`))
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
      }

      this.log(chalk.dim(`   Replaced: ${new Date().toLocaleString()}`))

      return response
    } catch (error) {
      this.debugLogger?.error?.('Error replacing document:', error)

      const errorMessage = `Failed to replace document in collection '${collection}': ${error.message}`

      this.log(chalk.red('Failed to replace document'))
      this.log(chalk.dim(`   Collection: ${collection}`))
      this.log(chalk.dim(`   Namespace: ${this.rtNamespace}`))

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
  }),
  replacement: Args.string({
    name: 'replacement',
    description: 'The replacement document (JSON string)',
    required: true,
    parse: (input) => {
      try {
        const parsed = JSON.parse(input)

        // Validate that it's a valid object (not null, not an array)
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
          throw new Error('Replacement must be a valid JSON object (not null, not an array)')
        }

        return parsed
      } catch (error) {
        if (error.message.includes('Replacement must be a valid JSON object')) {
          throw error
        }
        throw new Error(`Invalid replacement JSON: ${error.message}`)
      }
    }
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
