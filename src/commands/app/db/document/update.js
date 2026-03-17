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

export class Update extends DBBaseCommand {
  async run () {
    const { collection, filter, update } = this.args
    const { many, upsert } = this.flags
    const docPlural = many ? '(s)' : ''

    try {
      this.log(chalk.blue(`Updating document${docPlural} in collection '${collection}'...`))
      this.log(chalk.dim(`   Filter: ${JSON.stringify(filter)}`))
      this.log(chalk.dim(`   Update: ${JSON.stringify(update)}`))

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
      const result = await (many ? coll.updateMany(filter, update, options) : coll.updateOne(filter, update, options))

      this.debugLogger?.info?.(`Document${docPlural} updated successfully:`, result)

      const response = {
        collection,
        filter,
        update,
        namespace: this.rtNamespace,
        timestamp: new Date().toISOString(),
        result
      }
      const optionOutput = { ...options }
      if (many) {
        optionOutput.many = true
      }
      if (Object.keys(optionOutput).length > 0) {
        response.options = optionOutput
      }

      if (result.matchedCount > 0) {
        if (result.modifiedCount > 0) {
          this.log(chalk.green(`Document${docPlural} updated successfully in collection '${collection}'`))
          this.log(chalk.dim(`   Collection: ${collection}`))
          this.log(chalk.dim(`   Matched Count: ${result.matchedCount}`))
          this.log(chalk.dim(`   Modified Count: ${result.modifiedCount}`))
        } else {
          this.log(chalk.green(`${result.matchedCount} matching document${docPlural} found in collection '${collection}', but no update was necessary`))
        }
        this.log(chalk.dim(`   Namespace: ${this.rtNamespace}`))
      } else if (result.upsertedId) {
        this.log(chalk.green(`Document created (upserted) in collection '${collection}'`))
        this.log(chalk.dim(`   Namespace: ${this.rtNamespace}`))
        this.log(chalk.dim(`   Upserted ID: ${result.upsertedId}`))
        this.log(chalk.dim(`   Upserted count: ${result.upsertedCount}`))
      } else {
        this.log(chalk.yellow(`No document found in collection '${collection}' matching the filter`))
        this.log(chalk.dim(`   Namespace: ${this.rtNamespace}`))
      }

      this.log(chalk.dim(`   Updated: ${new Date().toLocaleString()}`))

      return response
    } catch (error) {
      this.debugLogger?.error?.(`Error updating document${docPlural}:`, error)

      const errorMessage = `Failed to update document${docPlural} in collection '${collection}': ${error.message}`

      this.log(chalk.red(`Failed to update document${docPlural}`))
      this.log(chalk.dim(`   Collection: ${collection}`))
      this.log(chalk.dim(`   Namespace: ${this.rtNamespace}`))

      this.error(errorMessage)
    }
  }
}

Update.description = 'Update document(s) in a collection'

Update.examples = [
  '$ aio app db document update users \'{"name": "John"}\' \'{"$set": {"age": 31}}\'',
  '$ aio app db document update products \'{"id": "123"}\' \'{"$inc": {"stock": -1}}\' --json',
  '$ aio app db document update posts \'{"slug": "hello-world"}\' \'{"$set": {"status": "published"}}\' --many',
  '$ aio app db doc update users \'{"email": "john@example.com"}\' \'{"$set": {"lastLogin": "2024-01-01"}}\' --upsert'
]

Update.args = {
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
  }),
  update: Args.string({
    name: 'update',
    description: 'The update document (JSON string)',
    required: true,
    parse: input => asObject(input, 'Update')
  })
}

Update.flags = {
  ...DBBaseCommand.flags,
  upsert: Flags.boolean({
    char: 'u',
    description: 'If no document is found, create a new one',
    default: false
  }),
  many: Flags.boolean({
    char: 'm',
    description: 'Update all documents matching the filter. Without this option, only the first matching document is updated.',
    default: false
  })
}

Update.aliases = ['app:db:doc:update']
