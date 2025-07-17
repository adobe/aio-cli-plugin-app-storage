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

export class CreateCollection extends DBBaseCommand {
  async run () {
    const { collectionName } = this.args
    const { collation, validator } = this.flags

    try {
      this.log(chalk.blue(`Creating collection '${collectionName}'...`))

      // Log flag values if set
      if (collation) {
        this.log(chalk.dim(`   Using collation: ${collation}`))
      }

      if (validator) {
        this.log(chalk.dim(`   Using validator: ${validator}`))
      }

      const client = await this.db.connect()

      // Check if collection already exists
      const existingCollections = await client.listCollections()
      const collectionExists = existingCollections && existingCollections.some(col => col.name === collectionName)

      if (collectionExists) {
        const errorMessage = `Collection '${collectionName}' already exists`

        this.log(chalk.red(errorMessage))
        this.log(chalk.dim(`   Namespace: ${this.rtNamespace}`))

        this.error(errorMessage)
      }

      // Build collection options
      const options = {}
      if (collation) {
        options.collation = collation
      }
      if (validator) {
        options.validator = validator
      }

      // Create the collection
      const result = await client.createCollection(collectionName, options)

      this.debugLogger?.info?.('Collection created successfully:', result)

      const response = {
        collectionName,
        status: 'created',
        namespace: this.rtNamespace,
        timestamp: new Date().toISOString(),
        result,
        options
      }

      this.log(chalk.green(`Collection '${collectionName}' created successfully`))
      this.log(chalk.dim(`   Namespace: ${this.rtNamespace}`))

      if (collation) {
        // Display the final collation object (after parsing) in compact JSON format
        const collationDisplay = typeof options.collation === 'object' ? JSON.stringify(options.collation) : options.collation
        this.log(chalk.dim(`   Collation: ${collationDisplay}`))
      }

      if (validator) {
        // Display the final validator object (after parsing) in compact JSON format
        const validatorDisplay = typeof options.validator === 'object' ? JSON.stringify(options.validator) : options.validator
        this.log(chalk.dim(`   Validator: ${validatorDisplay}`))
      }

      if (result && typeof result === 'object' && Object.keys(result).length > 0) {
        this.log(chalk.dim(`   Details:\n${JSON.stringify(result, null, 2).replace(/^/gm, '     ')}`))
      }

      this.log(chalk.dim(`   Created: ${new Date().toLocaleString()}`))

      return response
    } catch (error) {
      this.debugLogger?.error?.('Error creating collection:', error)

      const errorMessage = `Failed to create collection '${collectionName}': ${error.message}`

      this.log(chalk.red('Failed to create collection'))
      this.log(chalk.dim(`   Collection: ${collectionName}`))
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
  '$ aio app db collection create users --collation \'{"locale": "en_US", "strength": 1}\'',
  '$ aio app db collection create products --validator \'{"$schema": "http://json-schema.org/draft-04/schema#", "type": "object", "properties": {"name": {"type": "string"}, "price": {"type": "number", "minimum": 0}}, "required": ["name", "price"]}\'',
  '$ aio app db collection create inventory --collation \'{"locale": "simple"}\' --validator \'{"type": "object", "required": ["id", "quantity"]}\' --json'
]

CreateCollection.args = {
  collectionName: Args.string({
    name: 'collectionName',
    description: 'The name of the collection to create',
    required: true,
    parse: input => isNonEmptyString(input, 'Collection name')
  })
}

CreateCollection.flags = {
  ...DBBaseCommand.flags,
  collation: Flags.string({
    char: 'c',
    description: 'Collation document for text comparison and sorting (JSON string, e.g., \'{"locale": "en_US", "strength": 1}\')',
    parse: input => asObject(input, 'Collation')
  }),
  validator: Flags.string({
    char: 'v',
    description: 'JSON schema validator for document validation (JSON string)',
    parse: input => asObject(input, 'Validator')
  })
}
