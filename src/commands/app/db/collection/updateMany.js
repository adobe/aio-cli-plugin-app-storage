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

export class UpdateMany extends DBBaseCommand {
  async run () {
    const { collectionName, filter, update } = this.args
    const { upsert } = this.flags

    try {
      this.log(chalk.blue(`Updating documents in collection '${collectionName}'...`))

      // Log filter and update if provided
      this.log(chalk.dim(`   Filter: ${JSON.stringify(filter)}`))
      this.log(chalk.dim(`   Update: ${JSON.stringify(update)}`))

      if (upsert) {
        this.log(chalk.dim('   Upsert enabled: Will create document if not found'))
      }

      const client = await this.db.connect()
      const collection = await client.collection(collectionName)

      // Build options object
      const updateOptions = {}
      if (upsert) {
        updateOptions.upsert = true
      }

      // Perform the updateMany operation
      const result = await collection.updateMany(filter, update, updateOptions)

      this.debugLogger?.info?.('Documents updated successfully:', result)

      const response = {
        collectionName,
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
        upsertedCount: result.upsertedCount,
        upsertedId: result.upsertedId,
        status: 'updated',
        namespace: this.rtNamespace,
        timestamp: new Date().toISOString(),
        result
      }

      if (upsert) {
        response.options = updateOptions
      }

      if (result.upsertedCount) {
        this.log(chalk.green(`No documents in collection '${collectionName}' were found matching the filter, performed an upsert instead`))
        this.log(chalk.dim(`   Collection: ${collectionName}`))
        this.log(chalk.dim(`   Upserted ID: ${result.upsertedId}`))
        this.log(chalk.dim(`   Namespace: ${this.rtNamespace}`))
      } else {
        this.log(chalk.green(`Successfully updated documents in collection '${collectionName}'`))
        this.log(chalk.dim(`   Collection: ${collectionName}`))
        this.log(chalk.dim(`   Matched Count: ${result.matchedCount}`))
        this.log(chalk.dim(`   Modified Count: ${result.modifiedCount}`))
        this.log(chalk.dim(`   Namespace: ${this.rtNamespace}`))
      }

      this.log(chalk.dim(`   Details:\n${JSON.stringify(result, null, 2).replace(/^/gm, '     ')}`))
      this.log(chalk.dim(`   Updated: ${new Date().toLocaleString()}`))

      return response
    } catch (error) {
      this.debugLogger?.error?.('Error updating documents:', error)

      const errorMessage = `Failed to update documents in collection '${collectionName}': ${error.message}`

      this.log(chalk.red('Failed to update documents'))
      this.log(chalk.dim(`   Collection: ${collectionName}`))
      this.log(chalk.dim(`   Namespace: ${this.rtNamespace}`))
      this.log(chalk.dim(`   Error: ${error.message}`))

      this.error(errorMessage)
    }
  }
}

UpdateMany.description = 'Update multiple documents in a collection'

UpdateMany.examples = [
  '$ aio app db collection updateMany users \'{"age": {"$lt": 30}}\' \'{"$set": {"status": "young"}}\'',
  '$ aio app db collection updateMany products \'{"category": "electronics"}\' \'{"$inc": {"price": 10}}\' --json',
  '$ aio app db collection updateMany inventory \'{"quantity": {"$lt": 5}}\' \'{"$set": {"lowStock": true}}\' --upsert',
  '$ aio app db collection updateMany logs \'{"level": "error"}\' \'{"$set": {"processed": true}}\' --upsert --json'
]

UpdateMany.args = {
  collectionName: Args.string({
    name: 'collectionName',
    description: 'The name of the collection to update documents in',
    required: true,
    parse: input => isNonEmptyString(input, 'Collection name')
  }),
  filter: Args.string({
    name: 'filter',
    description: 'Filter document to select documents to update (JSON string)',
    required: true,
    parse: input => asObject(input, 'Filter')
  }),
  update: Args.string({
    name: 'update',
    description: 'Update document with update operators (JSON string)',
    required: true,
    parse: input => asObject(input, 'Update')
  })
}

UpdateMany.flags = {
  ...DBBaseCommand.flags,
  upsert: Flags.boolean({
    char: 'u',
    description: 'If no document is found, create a new one',
    default: false
  })
}
