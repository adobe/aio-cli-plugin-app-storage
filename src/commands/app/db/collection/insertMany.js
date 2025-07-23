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

export class InsertMany extends DBBaseCommand {
  async run () {
    const { collectionName, documents } = this.args
    const { bypassDocumentValidation } = this.flags

    try {
      this.log(chalk.blue(`Inserting ${documents.length} documents into collection '${collectionName}'...`))

      // Build options object
      const insertOptions = {}
      if (bypassDocumentValidation) {
        insertOptions.bypassDocumentValidation = true
        this.log(chalk.dim('   Bypassing document validation'))
      }

      const client = await this.db.connect()
      const collection = await client.collection(collectionName)

      // Perform the insertMany operation
      const result = await collection.insertMany(documents, insertOptions)

      this.debugLogger?.info?.('Documents inserted successfully:', result)

      const response = {
        collectionName,
        status: 'inserted',
        namespace: this.rtNamespace,
        timestamp: new Date().toISOString(),
        result
      }

      if (bypassDocumentValidation) {
        response.options = insertOptions
      }

      this.log(chalk.green(`Successfully inserted ${result.insertedCount} documents into collection '${collectionName}'`))
      this.log(chalk.dim(`   Collection: ${collectionName}`))
      this.log(chalk.dim(`   Namespace: ${this.rtNamespace}`))

      if (result.insertedIds && Object.keys(result.insertedIds).length > 0) {
        this.log(chalk.dim(`   Inserted IDs: ${JSON.stringify(result.insertedIds)}`))
      }

      this.log(chalk.dim(`   Details:\n${prettyJson(result)}`))

      this.log(chalk.dim(`   Inserted: ${new Date().toLocaleString()}`))

      return response
    } catch (error) {
      this.debugLogger?.error?.('Error inserting documents:', error)

      const errorMessage = `Failed to insert documents into collection '${collectionName}': ${error.message}`

      this.log(chalk.red('Failed to insert documents'))
      this.log(chalk.dim(`   Collection: ${collectionName}`))
      this.log(chalk.dim(`   Namespace: ${this.rtNamespace}`))
      this.log(chalk.dim(`   Error: ${error.message}`))

      this.error(errorMessage)
    }
  }
}

InsertMany.description = 'Insert multiple documents into a collection'

InsertMany.examples = [
  '$ aio app db collection insertMany users \'[{"name": "John", "age": 30}, {"name": "Jane", "age": 25}]\'',
  '$ aio app db collection insertMany products \'[{"id": 1, "name": "Product A"}, {"id": 2, "name": "Product B"}]\' --json',
  '$ aio app db collection insertMany temp \'[{"data": "test"}]\' --bypassDocumentValidation',
  '$ aio app db collection insertMany bulk \'[{"field": "value"}]\' --bypassDocumentValidation --json'
]

InsertMany.args = {
  collectionName: Args.string({
    name: 'collectionName',
    description: 'The name of the collection to insert documents into',
    required: true,
    parse: input => isNonEmptyString(input, 'Collection name')
  }),
  documents: Args.string({
    name: 'documents',
    description: 'JSON array of documents to insert',
    required: true,
    parse: input => {
      if (typeof input !== 'string' || input.trim().length === 0) {
        throw new Error('Documents: Must be a non-empty JSON array string')
      }

      let result
      try {
        result = JSON.parse(input)
      } catch (e) {
        throw new Error(`Documents: JSON parse error: ${e.message}`)
      }

      if (!Array.isArray(result)) {
        throw new Error('Documents: Must be a JSON array')
      }

      if (result.length === 0) {
        throw new Error('Documents: Array cannot be empty')
      }

      // Validate each document is an object
      for (let i = 0; i < result.length; i++) {
        if (typeof result[i] !== 'object' || result[i] === null || Array.isArray(result[i])) {
          throw new Error(`Documents: Element at index ${i} must be an object`)
        }
      }

      return result
    }
  })
}

InsertMany.flags = {
  ...DBBaseCommand.flags,
  bypassDocumentValidation: Flags.boolean({
    char: 'b',
    description: 'Bypass schema validation if present',
    default: false
  })
}
