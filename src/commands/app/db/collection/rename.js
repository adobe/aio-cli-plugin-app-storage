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

export class RenameCollection extends DBBaseCommand {
  async run () {
    const { currentName, newName } = this.args

    try {
      this.log(chalk.blue(`Renaming collection '${currentName}' to '${newName}'...`))

      const client = await this.db.connect()

      // Get the collection object
      const collection = client.collection(currentName)

      // Rename the collection
      const result = await collection.renameCollection(newName)

      this.debugLogger?.info?.('Collection renamed successfully:', result)

      const response = {
        currentName,
        newName,
        status: 'renamed',
        namespace: this.rtNamespace,
        timestamp: new Date().toISOString(),
        result
      }

      this.log(chalk.green(`Collection '${currentName}' renamed to '${newName}' successfully`))
      this.log(chalk.dim(`   Namespace: ${this.rtNamespace}`))

      if (result && typeof result === 'object' && Object.keys(result).length > 0) {
        this.log(chalk.dim(`   Details:\n${prettyJson(result)}`))
      }

      this.log(chalk.dim(`   Renamed: ${new Date().toLocaleString()}`))

      return response
    } catch (error) {
      this.debugLogger?.error?.('Error renaming collection:', error)

      const errorMessage = `Failed to rename collection '${currentName}': ${error.message}`

      this.log(chalk.red('Failed to rename collection'))
      this.log(chalk.dim(`   Current: ${currentName}`))
      this.log(chalk.dim(`   New: ${newName}`))
      this.log(chalk.dim(`   Namespace: ${this.rtNamespace}`))
      this.log(chalk.dim(`   Error: ${error.message}`))

      this.error(errorMessage)
    }
  }
}

RenameCollection.description = 'Rename a collection in the database'

RenameCollection.examples = [
  '$ aio app db collection rename users customers',
  '$ aio app db collection rename old_products new_products --json'
]

RenameCollection.args = {
  currentName: Args.string({
    name: 'currentName',
    description: 'The current name of the collection to rename',
    required: true,
    parse: input => isNonEmptyString(input, 'Current collection name')
  }),
  newName: Args.string({
    name: 'newName',
    description: 'The new name for the collection',
    required: true,
    parse: input => isNonEmptyString(input, 'New collection name')
  })
}

RenameCollection.flags = {
  ...DBBaseCommand.flags
}
