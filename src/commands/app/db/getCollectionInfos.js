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
import { prettyJson } from '../../../utils/output.js'
import { makeTable } from '@oclif/table'

export class GetCollectionInfos extends DBBaseCommand {
  async run () {
    try {
      this.log(chalk.blue('Fetching collection info...'))

      const client = await this.db.connect()
      const collectionInfo = await client.listCollections()

      this.debugLogger?.info?.(`Retrieved ${collectionInfo.length} collections with full details:`, collectionInfo)

      this.log(chalk.green('Collection Information:'))
      this.log(chalk.dim(`   Namespace: ${this.rtNamespace}`))

      if (collectionInfo && collectionInfo.length > 0) {
        this.log(chalk.dim(`   Total Collections: ${collectionInfo.length}`))
        this.log('')

        const formattedInfo = collectionInfo.map(col => {
          const info = {
            name: col.name,
            idIndex: `key: ${JSON.stringify(col.idIndex.key)}\nname: ${col.idIndex.name}`,
            info: Object.entries(col.info).map(([key, value]) => {
              return `${key}: ${JSON.stringify(value)}`
            }).join('\n')
          }
          if (col.options?.validator) {
            info.validator = prettyJson(col.options.validator.$jsonSchema, 0)
          }
          if (col.options?.validationLevel) {
            info.validationLevel = prettyJson(col.options.validationLevel, 0)
          }
          if (col.options?.validationAction) {
            info.validationAction = prettyJson(col.options.validationAction, 0)
          }
          return info
        })
        this.log(makeTable({ data: formattedInfo, overflow: 'wrap', trimWhitespace: false }))
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
      return `\n${prettyJson(value)}`
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
