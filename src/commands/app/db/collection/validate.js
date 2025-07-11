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

export class ValidateCollection extends DBBaseCommand {
  async run () {
    const { collectionName } = this.args

    try {
      this.log(chalk.blue(`Validating collection '${collectionName}'...`))

      const client = await this.db.connect()

      // Check if collection exists
      const existingCollections = await client.listCollections()
      const collectionExists = existingCollections.some(col => col.name === collectionName)

      if (!collectionExists) {
        const errorMessage = `Collection '${collectionName}' does not exist`

        this.log(chalk.red(errorMessage))
        this.log(chalk.dim(`   Namespace: ${this.rtNamespace}`))

        this.error(errorMessage)
      }

      // Validate collection structure and integrity
      const validationResult = await client.validateCollection(collectionName)

      this.debugLogger?.info?.('Collection validation completed:', validationResult)

      const response = {
        collectionName,
        validation: validationResult,
        namespace: this.rtNamespace,
        timestamp: new Date().toISOString()
      }

      const isValid = validationResult.isValid !== false

      if (isValid) {
        this.log(chalk.green(`Collection '${collectionName}' is valid`))
      } else {
        this.log(chalk.yellow(`Collection '${collectionName}' has validation issues`))
      }

      this.log(chalk.dim(`   Namespace: ${this.rtNamespace}`))

      if (validationResult && typeof validationResult === 'object') {
        // Display validation details
        if (validationResult.errors && validationResult.errors.length > 0) {
          this.log(chalk.dim('   Errors:'))
          validationResult.errors.forEach(error => {
            this.log(chalk.red(`     - ${error}`))
          })
        }

        if (validationResult.warnings && validationResult.warnings.length > 0) {
          this.log(chalk.dim('   Warnings:'))
          validationResult.warnings.forEach(warning => {
            this.log(chalk.yellow(`     - ${warning}`))
          })
        }

        if (validationResult.info && typeof validationResult.info === 'object') {
          this.log(chalk.dim('   Info:'))
          Object.entries(validationResult.info).forEach(([key, value]) => {
            this.log(chalk.dim(`     ${key}: ${value}`))
          })
        }
      }

      this.log(chalk.dim(`   Validated: ${new Date().toLocaleString()}`))

      return response
    } catch (error) {
      this.debugLogger?.error?.('Error validating collection:', error)

      const errorMessage = `Failed to validate collection '${collectionName}': ${error.message}`

      this.log(chalk.red('Failed to validate collection'))
      this.log(chalk.dim(`   Collection: ${collectionName}`))
      this.log(chalk.dim(`   Namespace: ${this.rtNamespace}`))
      this.log(chalk.dim(`   Error: ${error.message}`))

      this.error(errorMessage)
    }
  }
}

ValidateCollection.description = 'Validate a collection in the database'

ValidateCollection.examples = [
  '$ aio app db collection validate users',
  '$ aio app db collection validate products --json'
]

ValidateCollection.args = {
  collectionName: Args.string({
    name: 'collectionName',
    description: 'The name of the collection to validate',
    required: true
  })
}

ValidateCollection.flags = {
  ...DBBaseCommand.flags
}

ValidateCollection.aliases = ['db:collection:validate']
