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

import { DBBaseCommand } from '../../../DBBaseCommand.js'
import { Args } from '@oclif/core'
import chalk from 'chalk'

export class DropCollection extends DBBaseCommand {
  async run () {
    const { collectionName } = this.args

    this.debugLogger?.info?.('Dropping collection:', collectionName)

    try {
      if (!this.flags.json) {
        this.log(chalk.blue(`Dropping collection '${collectionName}'...`))
      }

      const client = await this.db.connect()

      // Check if collection exists
      const existingCollections = await client.listCollections()
      const collectionExists = existingCollections.some(col => col.name === collectionName)

      if (!collectionExists) {
        const errorMessage = `Collection '${collectionName}' does not exist`

        if (!this.flags.json) {
          this.log(chalk.red(errorMessage))
          this.log(chalk.dim(`   Namespace: ${this.rtNamespace}`))
        }

        this.error(errorMessage)
      }

      // Drop collection
      const result = await client.dropCollection(collectionName)

      this.debugLogger?.info?.('Collection dropped successfully:', result)

      const response = {
        collectionName,
        status: 'dropped',
        namespace: this.rtNamespace,
        timestamp: new Date().toISOString(),
        result
      }

      if (!this.flags.json) {
        this.log(chalk.green(`Collection '${collectionName}' dropped successfully`))
        this.log(chalk.dim(`   Namespace: ${this.rtNamespace}`))

        if (result && typeof result === 'object' && Object.keys(result).length > 0) {
          this.log(chalk.dim(`   Details: ${JSON.stringify(result, null, 2)}`))
        }

        this.log(chalk.dim(`   Dropped: ${new Date().toLocaleString()}`))
      }

      return response

    } catch (error) {
      this.debugLogger?.error?.('Error dropping collection:', error)

      const errorMessage = `Failed to drop collection '${collectionName}': ${error.message}`

      if (!this.flags.json) {
        this.log(chalk.red('Failed to drop collection'))
        this.log(chalk.dim(`   Collection: ${collectionName}`))
        this.log(chalk.dim(`   Namespace: ${this.rtNamespace}`))
        this.log(chalk.dim(`   Error: ${error.message}`))
      }

      this.error(errorMessage)
    }
  }
}

DropCollection.description = 'Drop a collection from the database'

DropCollection.examples = [
  '$ aio app db collection drop users',
  '$ aio app db collection drop products --json'
]

DropCollection.args = {
  collectionName: Args.string({
    name: 'collectionName',
    description: 'The name of the collection to drop',
    required: true
  })
}

DropCollection.flags = {
  ...DBBaseCommand.flags
}
