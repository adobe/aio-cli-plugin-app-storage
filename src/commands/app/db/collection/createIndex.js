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

export class CreateIndex extends DBBaseCommand {
  async run () {
    let { collectionName, specification } = this.args

    if (typeof collectionName !== 'string' || collectionName.trim().length === 0) {
      this.error('Collection name must be a non-empty string')
    }

    if (typeof specification !== 'object' && (typeof specification !== 'string' || specification.trim().length === 0)) {
      this.error('Index specification must be a non-empty string or JSON object')
    }
    if (typeof specification === 'string' && specification.trim().startsWith('{')) {
      // If the specification starts with a bracket, assume it's a JSON object.
      try {
        specification = JSON.parse(specification)
      } catch (error) {
        this.error('Invalid JSON format for index specification')
      }
    }

    try {
      const { name, unique } = this.flags
      // Validate name if provided
      if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0)) {
        this.error('Index name must be a non-empty string')
      }

      const specString = JSON.stringify(specification)
      this.log(chalk.blue(`Creating index ${name ? `'${name}' ` : ''}on collection '${collectionName}'...`))
      this.log(chalk.dim(`   With specification: ${specString}`))
      if (unique) this.log(chalk.dim(`   Unique index: ${unique}`))

      const client = await this.db.connect()
      const collection = await client.collection(collectionName)

      // Build options
      const options = {}
      if (name) options.name = name
      if (unique) options.unique = unique

      // Create the index - only pass options if they exist
      const result = await collection.createIndex(specification, options)

      this.debugLogger?.info?.('Index created successfully:', result)

      const response = {
        collectionName,
        indexName: result,
        specification,
        status: 'created',
        namespace: this.rtNamespace,
        timestamp: new Date().toISOString()
      }

      // Only include options if they exist
      if (Object.keys(options).length > 0) response.options = options

      this.log(chalk.green(`Index '${result}' created successfully in the '${collectionName}' collection`))
      this.log(chalk.dim(`   Specification: ${specString}`))
      if (unique) this.log(chalk.dim(`   Unique: ${unique}`))
      this.log(chalk.dim(`   Namespace: ${this.rtNamespace}`))
      this.log(chalk.dim(`   Created: ${new Date().toLocaleString()}`))

      return response
    } catch (error) {
      this.debugLogger?.error?.('Error creating index:', error)

      this.log(chalk.red('Failed to create index'))
      this.log(chalk.dim(`   Collection: ${collectionName}`))
      this.log(chalk.dim(`   Namespace: ${this.rtNamespace}`))
      this.log(chalk.dim(`   Error: ${error.message}`))

      this.error(`Failed to create index on collection '${collectionName}': ${error.message}`)
    }
  }
}

CreateIndex.description = 'Create a new index on a collection in the database'

CreateIndex.examples = [
  '$ aio app db collection createIndex users \'{"name":1, "age":-1}\'',
  '$ aio app db collection createIndex users \'{"name":1, "age":-1}\' --name "name_age_index"',
  '$ aio app db collection createIndex movies \'{"director":"text", "name":"text"}\' --unique',
  '$ aio app db collection createIndex products \'{"name":"text", "category":"text", "price":-1}\' --json'
]

CreateIndex.args = {
  collectionName: Args.string({
    name: 'collectionName',
    description: 'The name of the collection to create the index on',
    required: true
  }),
  specification: Args.string({
    name: 'specification',
    description: 'Index specification as a JSON object (e.g., \'{ "name":1, "age":-1 }\') or single key',
    required: true
  })
}

CreateIndex.flags = {
  ...DBBaseCommand.flags,
  name: Flags.string({
    char: 'n',
    description: 'A name that uniquely identifies the index'
  }),
  unique: Flags.boolean({
    char: 'u',
    description: 'Creates a unique index so that the collection will not accept insertion or update of documents where the index key value matches an existing value in the index',
    default: false
  })
}
