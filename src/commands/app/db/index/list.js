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

export class List extends DBBaseCommand {
  async run () {
    const { collection } = this.args

    try {
      this.log(chalk.blue(`Getting indexes from collection '${collection}'...`))

      const client = await this.db.connect()
      const coll = await client.collection(collection)

      const result = await coll.getIndexes()

      this.debugLogger?.info?.('Indexes retrieved successfully:', result)

      const response = {
        collection,
        namespace: this.rtNamespace,
        timestamp: new Date().toISOString(),
        indexes: result
      }

      this.log(chalk.green('Indexes retrieved successfully'))
      this.log(chalk.dim(`   Namespace: ${this.rtNamespace}`))
      this.log(chalk.dim(`   Retrieved: ${new Date().toLocaleString()}`))
      if (result && Array.isArray(result) && result.length > 0) {
        this.log(chalk.dim(`   Indexes:\n${prettyJson(result)}`))
      } else {
        this.log(chalk.dim('   No indexes found for this collection'))
      }

      return response
    } catch (error) {
      this.debugLogger?.error?.('Error getting indexes:', error)

      this.log(chalk.red('Failed to retrieve indexes'))
      this.log(chalk.dim(`   Collection: ${collection}`))
      this.log(chalk.dim(`   Namespace: ${this.rtNamespace}`))
      this.log(chalk.dim(`   Error: ${error.message}`))

      this.error(`Failed to retrieve indexes from collection '${collection}': ${error.message}`)
    }
  }
}

List.description = 'Get the list of indexes from a collection in the database'

List.examples = [
  '$ aio app db index list users',
  '$ aio app db index list products --json',
  '$ aio app db idx list orders'
]

List.args = {
  collection: Args.string({
    name: 'collection',
    description: 'The name of the collection to retrieve indexes from',
    required: true,
    parse: input => isNonEmptyString(input, 'Collection name')
  })
}

List.flags = DBBaseCommand.flags

List.aliases = ['app:db:idx:list']
