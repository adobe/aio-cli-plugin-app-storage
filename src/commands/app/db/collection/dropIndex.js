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

export class DropIndex extends DBBaseCommand {
  async run () {
    const { collectionName, indexName } = this.args

    try {
      this.log(chalk.blue(`Dropping index '${indexName}' from collection '${collectionName}'...`))

      const client = await this.db.connect()
      const collection = await client.collection(collectionName)

      const result = await collection.dropIndex(indexName)

      this.debugLogger?.info?.('Index dropped successfully:', result)

      const response = {
        collectionName,
        indexName,
        status: 'dropped',
        namespace: this.rtNamespace,
        timestamp: new Date().toISOString(),
        result
      }

      this.log(chalk.green(`Index '${indexName}' dropped successfully`))
      if (result && typeof result === 'object' && Object.keys(result).length > 0) {
        this.log(chalk.dim(`   Details:\n${JSON.stringify(result, null, 2).replace(/^/gm, '     ')}`))
      }
      this.log(chalk.dim(`   Namespace: ${this.rtNamespace}`))
      this.log(chalk.dim(`   Dropped: ${new Date().toLocaleString()}`))

      return response
    } catch (error) {
      this.debugLogger?.error?.('Error dropping index:', error)

      this.log(chalk.red('Failed to drop index'))
      this.log(chalk.dim(`   Collection: ${collectionName}`))
      this.log(chalk.dim(`   Index: ${indexName}`))
      this.log(chalk.dim(`   Namespace: ${this.rtNamespace}`))
      this.log(chalk.dim(`   Error: ${error.message}`))

      this.error(`Failed to drop index '${indexName}' from collection '${collectionName}': ${error.message}`)
    }
  }
}

DropIndex.description = 'Drop an index from a collection in the database'

DropIndex.examples = [
  '$ aio app db collection dropIndex users name_age_index',
  '$ aio app db collection dropIndex products category_1 --json'
]

DropIndex.args = {
  collectionName: Args.string({
    name: 'collectionName',
    description: 'The name of the collection to drop the index from',
    required: true,
    parse: input => isNonEmptyString(input, 'Collection name')
  }),
  indexName: Args.string({
    name: 'indexName',
    description: 'The name of the index to drop',
    required: true,
    parse: input => isNonEmptyString(input, 'Index name')
  })
}

DropIndex.flags = DBBaseCommand.flags
