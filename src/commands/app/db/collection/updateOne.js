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

export class UpdateOne extends DBBaseCommand {
  async run () {
    const { collection, filter, update } = this.args
    const { upsert } = this.flags

    try {
      // Parse filter JSON
      let filterObj
      try {
        filterObj = JSON.parse(filter)
      } catch (error) {
        this.error(`Invalid filter JSON: ${error.message}`)
      }

      // Parse update JSON
      let updateObj
      try {
        updateObj = JSON.parse(update)
      } catch (error) {
        this.error(`Invalid update JSON: ${error.message}`)
      }

      this.log(chalk.blue(`Updating document in collection '${collection}'...`))

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

      // Update the document
      const result = await coll.updateOne(filterObj, updateObj, options)

      this.debugLogger?.info?.('Document updated successfully:', result)

      const response = {
        collection,
        filter: filterObj,
        update: updateObj,
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
        this.log(chalk.green(`Document updated successfully in collection '${collection}'`))
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

      this.log(chalk.dim(`   Updated: ${new Date().toLocaleString()}`))

      return response
    } catch (error) {
      this.debugLogger?.error?.('Error updating document:', error)

      const errorMessage = `Failed to update document in collection '${collection}': ${error.message}`

      this.log(chalk.red('Failed to update document'))
      this.log(chalk.dim(`   Collection: ${collection}`))
      this.log(chalk.dim(`   Namespace: ${this.rtNamespace}`))
      this.log(chalk.dim(`   Error: ${error.message}`))

      this.error(errorMessage)
    }
  }
}

UpdateOne.description = 'Update a single document in a collection'

UpdateOne.examples = [
  '$ aio app db collection updateOne users \'{"name": "John"}\' \'{"$set": {"age": 31}}\'',
  '$ aio app db collection updateOne products \'{"id": "123"}\' \'{"$inc": {"stock": -1}}\' --json',
  '$ aio app db collection updateOne posts \'{"slug": "hello-world"}\' \'{"$set": {"status": "published"}}\' --upsert',
  '$ aio app db collection updateOne users \'{"email": "john@example.com"}\' \'{"$set": {"lastLogin": "2024-01-01"}}\' --upsert'
]

UpdateOne.args = {
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
  update: Args.string({
    name: 'update',
    description: 'The update document (JSON string)',
    required: true
  })
}

UpdateOne.flags = {
  ...DBBaseCommand.flags,
  upsert: Flags.boolean({
    char: 'u',
    description: 'If no document is found, create a new one',
    default: false
  })
}
