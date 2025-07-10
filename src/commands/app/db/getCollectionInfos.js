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
import chalk from 'chalk'

export class GetCollectionInfos extends DBBaseCommand {
  async run () {
    this.debugLogger?.info?.('Fetching collection info')

    try {
      this.log(chalk.blue('Fetching collection info...'))

      const client = await this.db.connect()
      const collectionInfo = await client.listCollections()

      this.debugLogger?.info?.('Collection info retrieved:', collectionInfo)

      if (this.flags.json) {
        return collectionInfo
      }

      this.log(chalk.green('Collection Information:'))
      this.log(chalk.dim(`   Namespace: ${this.rtNamespace}`))

      if (collectionInfo && collectionInfo.length > 0) {
        this.log(chalk.dim(`   Total Collections: ${collectionInfo.length}`))
        this.log('')

        collectionInfo.forEach((collection, index) => {
          this.log(chalk.cyan(`   Collection ${index + 1}:`))
          Object.entries(collection).forEach(([key, value]) => {
            this.log(chalk.dim(`     ${key}: ${this.formatValue(value)}`))
          })
          if (index < collectionInfo.length - 1) {
            this.log('')
          }
        })
      } else {
        this.log(chalk.dim('   No collections found'))
      }

      this.log('')
      this.log(chalk.dim(`   Retrieved: ${new Date().toLocaleString()}`))

      return collectionInfo
    } catch (error) {
      this.debugLogger?.error?.('Error fetching collection info', error)

      this.log(chalk.red('Failed to retrieve collection information'))
      this.log(chalk.dim(`   Namespace: ${this.rtNamespace}`))
      this.log(chalk.dim(`   Error: ${error.message}`))

      this.error(`Failed to fetch collection information: ${error.message}`)
    }
  }

  formatValue (value) {
    if (typeof value === 'number') {
      // Format large numbers with commas
      return value.toLocaleString()
    }
    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value, null, 2)
    }
    return String(value)
  }
}

GetCollectionInfos.description = 'Get details of your App Builder database collections'

GetCollectionInfos.examples = [
  '$ aio app db getCollectionInfos',
  '$ aio app db getCollectionInfos --json'
]

GetCollectionInfos.flags = {
  ...DBBaseCommand.flags
}

GetCollectionInfos.args = {}
