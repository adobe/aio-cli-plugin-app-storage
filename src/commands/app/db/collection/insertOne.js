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

export class InsertOne extends DBBaseCommand {
  async run () {
    const { collection, document } = this.args
    const { bypassDocumentValidation } = this.flags

    try {
      this.log(chalk.blue(`Inserting document into collection '${collection}'...`))

      if (bypassDocumentValidation) {
        this.log(chalk.dim('   Bypassing document validation'))
      }

      const client = await this.db.connect()
      const coll = client.collection(collection)

      // Build options
      const options = {}
      if (bypassDocumentValidation) {
        options.bypassDocumentValidation = true
      }

      // Insert the document
      const result = await coll.insertOne(document, options)

      this.debugLogger?.info?.('Document inserted successfully:', result)

      const response = {
        collection,
        document,
        namespace: this.rtNamespace,
        timestamp: new Date().toISOString(),
        result
      }

      this.log(chalk.green(`Document inserted successfully into collection '${collection}'`))
      this.log(chalk.dim(`   Namespace: ${this.rtNamespace}`))
      this.log(chalk.dim(`   Inserted ID: ${result.insertedId}`))
      this.log(chalk.dim(`   Acknowledged: ${result.acknowledged}`))

      if (bypassDocumentValidation) {
        this.log(chalk.dim('   Validation bypassed: Yes'))
      }

      this.log(chalk.dim(`   Inserted: ${new Date().toLocaleString()}`))

      return response
    } catch (error) {
      this.debugLogger?.error?.('Error inserting document:', error)

      const errorMessage = `Failed to insert document into collection '${collection}': ${error.message}`

      this.log(chalk.red('Failed to insert document'))
      this.log(chalk.dim(`   Collection: ${collection}`))
      this.log(chalk.dim(`   Namespace: ${this.rtNamespace}`))

      this.error(errorMessage)
    }
  }
}

InsertOne.description = 'Insert a single document into a collection'

InsertOne.examples = [
  '$ aio app db collection insertOne users \'{"name": "John", "age": 30}\'',
  '$ aio app db collection insertOne products \'{"name": "Widget", "price": 10.99}\' --json',
  '$ aio app db collection insertOne posts \'{"title": "Hello World", "content": "This is a test post"}\' --bypassDocumentValidation'
]

InsertOne.args = {
  collection: Args.string({
    name: 'collection',
    description: 'The name of the collection',
    required: true
  }),
  document: Args.string({
    name: 'document',
    description: 'The document to insert (JSON string)',
    required: true,
    parse: (input) => {
      let parsed
      try {
        parsed = JSON.parse(input)
      } catch (error) {
        throw new Error(`Invalid document JSON: ${error.message}`)
      }
      // Validate that it's a valid object (not null, not an array)
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        throw new Error('Document must be a JSON object (not null, not an array)')
      }
      return parsed
    }
  })
}

InsertOne.flags = {
  ...DBBaseCommand.flags,
  bypassDocumentValidation: Flags.boolean({
    description: 'Bypass schema validation if present',
    default: false
  })
}
