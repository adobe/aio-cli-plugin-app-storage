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
import { Args } from '@oclif/core'
import chalk from 'chalk'
import { isNonEmptyString } from '../../../../utils/inputValidation.js'
import { prettyJson } from '../../../../utils/output.js'

export class DropCollection extends DBBaseCommand {
  async run () {
    const { collection } = this.args

    try {
      this.log(chalk.blue(`Dropping collection '${collection}'...`))

      const client = await this.db.connect()

      // Get the collection object
      const coll = client.collection(collection)

      // Drop collection
      const result = await coll.drop()

      this.debugLogger?.info?.('Collection dropped successfully:', result)

      const response = {
        collection,
        status: 'dropped',
        namespace: this.rtNamespace,
        timestamp: new Date().toISOString(),
        result
      }

      this.log(chalk.green(`Collection '${collection}' dropped successfully`))
      this.log(chalk.dim(`   Namespace: ${this.rtNamespace}`))

      if (result && typeof result === 'object' && Object.keys(result).length > 0) {
        this.log(chalk.dim(`   Details:\n${prettyJson(result)}`))
      }

      this.log(chalk.dim(`   Dropped: ${new Date().toLocaleString()}`))

      return response
    } catch (error) {
      this.debugLogger?.error?.('Error dropping collection:', error)

      const errorMessage = `Failed to drop collection '${collection}': ${error.message}`

      this.log(chalk.red('Failed to drop collection'))
      this.log(chalk.dim(`   Collection: ${collection}`))
      this.log(chalk.dim(`   Namespace: ${this.rtNamespace}`))
      this.log(chalk.dim(`   Error: ${error.message}`))

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
  collection: Args.string({
    name: 'collection',
    description: 'The name of the collection to drop',
    required: true,
    parse: input => isNonEmptyString(input, 'Collection name')
  })
}

DropCollection.flags = {
  ...DBBaseCommand.flags
}
