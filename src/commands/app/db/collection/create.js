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

export class CreateCollection extends DBBaseCommand {
  async run () {
    const { collection } = this.args
    const { validator } = this.flags

    try {
      this.log(chalk.blue(`Creating collection '${collection}'...`))

      // Log flag values if set
      if (validator) {
        this.log(chalk.dim(`   Using validator: ${validator}`))
      }

      const client = await this.db.connect()

      // Check if collection already exists
      const existingCollections = await client.listCollections()
      const collectionExists = existingCollections && existingCollections.some(col => col.name === collection)

      if (collectionExists) {
        const errorMessage = `Collection '${collection}' already exists`

        this.log(chalk.red(errorMessage))
        this.log(chalk.dim(`   Namespace: ${this.rtNamespace}`))

        this.error(errorMessage)
      }

      // Build collection options
      const options = {}
      if (validator) {
        options.validator = validator
      }

      // Create the collection
      const result = await client.createCollection(collection, options)

      this.debugLogger?.info?.('Collection created successfully:', result)

      const response = {
        collection,
        status: 'created',
        namespace: this.rtNamespace,
        timestamp: new Date().toISOString(),
        result,
        options
      }

      this.log(chalk.green(`Collection '${collection}' created successfully`))
      this.log(chalk.dim(`   Namespace: ${this.rtNamespace}`))

      if (validator) {
        // Display the final validator object (after parsing) in compact JSON format
        const validatorDisplay = JSON.stringify(options.validator)
        this.log(chalk.dim(`   Validator: ${validatorDisplay}`))
      }

      if (result && typeof result === 'object' && Object.keys(result).length > 0) {
        this.log(chalk.dim(`   Details:\n${prettyJson(result)}`))
      }

      this.log(chalk.dim(`   Created: ${new Date().toLocaleString()}`))

      return response
    } catch (error) {
      this.debugLogger?.error?.('Error creating collection:', error)

      const errorMessage = `Failed to create collection '${collection}': ${error.message}`

      this.log(chalk.red('Failed to create collection'))
      this.log(chalk.dim(`   Collection: ${collection}`))
      this.log(chalk.dim(`   Namespace: ${this.rtNamespace}`))
      this.log(chalk.dim(`   Error: ${error.message}`))

      this.error(errorMessage)
    }
  }
}

CreateCollection.description = 'Create a new collection in the database'

CreateCollection.examples = [
  '$ aio app db collection create users',
  '$ aio app db collection create products --json',
  '$ aio app db collection create products --validator \'{"$schema": "http://json-schema.org/draft-04/schema#", "type": "object", "properties": {"name": {"type": "string"}, "price": {"type": "number", "minimum": 0}}, "required": ["name", "price"]}\'',
  '$ aio app db collection create inventory --validator \'{"type": "object", "required": ["id", "quantity"]}\' --json'
]

CreateCollection.args = {
  collection: Args.string({
    name: 'collection',
    description: 'The name of the collection to create',
    required: true,
    parse: input => isNonEmptyString(input, 'Collection name')
  })
}

CreateCollection.flags = {
  ...DBBaseCommand.flags,
  validator: Flags.string({
    char: 'v',
    description: 'JSON schema validator for document validation (JSON string)',
    parse: input => asObject(input, 'Validator')
  })
}
