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
import { isNonEmptyString } from '../../../../utils/inputValidation.js'
import { prettyJson } from '../../../../utils/output.js'

export class Insert extends DBBaseCommand {
  async run () {
    const { collection, documents } = this.args
    const { bypassDocumentValidation } = this.flags

    try {
      this.log(chalk.blue(`Inserting ${documents.length} documents into collection '${collection}'...`))

      // Build options object
      const insertOptions = {}
      if (bypassDocumentValidation) {
        insertOptions.bypassDocumentValidation = true
        this.log(chalk.dim('   Bypassing document validation'))
      }

      const client = await this.db.connect()
      const coll = await client.collection(collection)

      // Perform the insert operation
      const result = await coll.insertMany(documents, insertOptions)

      this.debugLogger?.info?.('Documents inserted successfully:', result)

      const response = {
        collection,
        status: 'inserted',
        namespace: this.rtNamespace,
        timestamp: new Date().toISOString(),
        result
      }

      if (bypassDocumentValidation) {
        response.options = insertOptions
      }

      this.log(chalk.green(`Successfully inserted ${result.insertedCount} documents into collection '${collection}'`))
      this.log(chalk.dim(`   Collection: ${collection}`))
      this.log(chalk.dim(`   Namespace: ${this.rtNamespace}`))

      if (result.insertedIds && Object.keys(result.insertedIds).length > 0) {
        this.log(chalk.dim(`   Inserted IDs: ${JSON.stringify(result.insertedIds)}`))
      }

      this.log(chalk.dim(`   Details:\n${prettyJson(result)}`))

      this.log(chalk.dim(`   Inserted: ${new Date().toLocaleString()}`))

      return response
    } catch (error) {
      this.debugLogger?.error?.('Error inserting documents:', error)

      const errorMessage = `Failed to insert documents into collection '${collection}': ${error.message}`

      this.log(chalk.red('Failed to insert documents'))
      this.log(chalk.dim(`   Collection: ${collection}`))
      this.log(chalk.dim(`   Namespace: ${this.rtNamespace}`))
      this.log(chalk.dim(`   Error: ${error.message}`))

      this.error(errorMessage)
    }
  }
}

Insert.description = 'Insert one or more documents into a collection'

Insert.examples = [
  '$ aio app db document insert users \'{"name": "John", "age": 30}\'',
  '$ aio app db document insert products \'[{"id": 1, "name": "Product A"}, {"id": 2, "name": "Product B"}]\' --json',
  '$ aio app db document insert temp \'{"data": "test"}\' --bypassDocumentValidation',
  '$ aio app db doc insert bulk \'[{"field": "foo"}, {"field": "bar"}]\' --bypassDocumentValidation --json'
]

Insert.args = {
  collection: Args.string({
    name: 'collection',
    description: 'The name of the collection to insert documents into',
    required: true,
    parse: input => isNonEmptyString(input, 'Collection name')
  }),
  documents: Args.string({
    name: 'documents',
    description: 'JSON object or array of documents to insert',
    required: true,
    parse: input => {
      if (typeof input !== 'string' || input.trim().length === 0) {
        throw new Error('Documents: Must be a JSON string representing an object or non-empty array')
      }

      let result
      try {
        result = JSON.parse(input)
      } catch (e) {
        throw new Error(`Documents: JSON parse error: ${e.message}`)
      }

      const isSingleDoc = !Array.isArray(result)
      if (isSingleDoc) {
        result = [result]
      }

      if (result.length === 0) {
        throw new Error('Documents: Cannot be empty')
      }

      // Validate each document is an object
      for (let i = 0; i < result.length; i++) {
        if (typeof result[i] !== 'object' || result[i] === null || Array.isArray(result[i])) {
          if (isSingleDoc) {
            throw new Error('Documents: Must be a JSON string representing an object or non-empty array')
          }
          throw new Error(`Documents: Element at index ${i} must be an object`)
        }
      }

      return result
    }
  })
}

Insert.flags = {
  ...DBBaseCommand.flags,
  bypassDocumentValidation: Flags.boolean({
    char: 'b',
    description: 'Bypass schema validation if present',
    default: false
  })
}

Insert.aliases = ['app:db:doc:insert']
