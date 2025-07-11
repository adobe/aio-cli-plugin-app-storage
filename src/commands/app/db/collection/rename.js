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

export class RenameCollection extends DBBaseCommand {
  async run () {
    const { currentName, newName } = this.args

    this.debugLogger?.info?.('Renaming collection:', currentName, 'to', newName)

    try {
      if (!this.flags.json) {
        this.log(chalk.blue(`Renaming collection '${currentName}' to '${newName}'...`))
      }

      const client = await this.db.connect()

      // Check if current collection exists
      const existingCollections = await client.listCollections()
      const currentExists = existingCollections.some(col => col.name === currentName)

      if (!currentExists) {
        const errorMessage = `Collection '${currentName}' does not exist`

        if (!this.flags.json) {
          this.log(chalk.red(errorMessage))
          this.log(chalk.dim(`   Namespace: ${this.rtNamespace}`))
        }

        this.error(errorMessage)
      }

      // Check if new collection name already exists
      const newExists = existingCollections.some(col => col.name === newName)

      if (newExists) {
        const errorMessage = `Collection '${newName}' already exists`

        if (!this.flags.json) {
          this.log(chalk.red(errorMessage))
          this.log(chalk.dim(`   Namespace: ${this.rtNamespace}`))
        }

        this.error(errorMessage)
      }

      // Rename the collection
      const result = await client.renameCollection(currentName, newName)

      this.debugLogger?.info?.('Collection renamed successfully:', result)

      const response = {
        currentName,
        newName,
        status: 'renamed',
        namespace: this.rtNamespace,
        timestamp: new Date().toISOString(),
        result
      }

      if (!this.flags.json) {
        this.log(chalk.green(`Collection '${currentName}' renamed to '${newName}' successfully`))
        this.log(chalk.dim(`   Namespace: ${this.rtNamespace}`))

        if (result && typeof result === 'object' && Object.keys(result).length > 0) {
          this.log(chalk.dim(`   Details: ${JSON.stringify(result, null, 2)}`))
        }

        this.log(chalk.dim(`   Renamed: ${new Date().toLocaleString()}`))
      }

      return response

    } catch (error) {
      this.debugLogger?.error?.('Error renaming collection:', error)

      const errorMessage = `Failed to rename collection '${currentName}': ${error.message}`

      if (!this.flags.json) {
        this.log(chalk.red('Failed to rename collection'))
        this.log(chalk.dim(`   Current: ${currentName}`))
        this.log(chalk.dim(`   New: ${newName}`))
        this.log(chalk.dim(`   Namespace: ${this.rtNamespace}`))
        this.log(chalk.dim(`   Error: ${error.message}`))
      }

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
    required: true
  }),
  newName: Args.string({
    name: 'newName',
    description: 'The new name for the collection',
    required: true
  })
}

RenameCollection.flags = {
  ...DBBaseCommand.flags
}

RenameCollection.aliases = ['db:collection:rename']

