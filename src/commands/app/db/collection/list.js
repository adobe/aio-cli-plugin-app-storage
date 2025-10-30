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
import chalk from 'chalk'
import { Flags } from '@oclif/core'
import { prettyJson } from '../../../../utils/output.js'
import { makeTable } from '@oclif/table'

export class List extends DBBaseCommand {
  async run () {
    const { info } = this.flags
    try {
      this.log(chalk.blue('Fetching collections...'))

      const client = await this.db.connect()
      const collectionInfo = await client.listCollections()

      this.debugLogger?.info?.(`Retrieved ${collectionInfo.length} collections:`, collectionInfo)

      this.log(chalk.green('Collection Information:'))
      this.log(chalk.dim(`   Namespace: ${this.rtNamespace}`))

      if (collectionInfo && collectionInfo.length > 0) {
        this.log(chalk.dim(`   Total Collections: ${collectionInfo.length}`))

        const formattedInfo = collectionInfo.map(col => {
          const colInfo = {
            name: col.name
          }
          if (info) {
            colInfo.idIndex = `key: ${JSON.stringify(col.idIndex.key)}\nname: ${col.idIndex.name}`
            colInfo.info = Object.entries(col.info).map(([key, value]) => {
              return `${key}: ${JSON.stringify(value)}`
            }).join('\n')

            if (col.options?.validator) {
              colInfo.validator = prettyJson(col.options.validator.$jsonSchema, 0)
            }
            if (col.options?.validationLevel) {
              colInfo.validationLevel = prettyJson(col.options.validationLevel, 0)
            }
            if (col.options?.validationAction) {
              colInfo.validationAction = prettyJson(col.options.validationAction, 0)
            }
          }

          return colInfo
        })
        const table = makeTable({ data: formattedInfo, overflow: 'wrap', trimWhitespace: false })
        this.log('   ' + table.replaceAll('\n', '\n   ').trimEnd())
      } else {
        this.log(chalk.dim('   No collections found'))
      }

      this.log(chalk.dim(`\n   Retrieved: ${new Date().toLocaleString()}`))

      return info ? collectionInfo : collectionInfo.map(col => col.name)
    } catch (error) {
      this.debugLogger?.error?.('Error fetching collections', error)

      this.log(chalk.red('Error fetching collections'))
      this.log(chalk.dim(`   Namespace: ${this.rtNamespace}`))
      this.log(chalk.dim(`   Error: ${error.message}`))

      this.error(`Failed to fetch collections: ${error.message}`)
    }
  }
}

List.description = 'Get the list of collections in your App Builder database'

List.examples = [
  '$ aio app db collection list',
  '$ aio app db collection list --info',
  '$ aio app db collection list --json',
  '$ aio app db col list --info --json'
]

List.flags = {
  ...DBBaseCommand.flags,
  info: Flags.boolean({
    char: 'i',
    description: 'Show detailed collection information instead of just names',
    default: false
  })
}

List.args = {}

List.aliases = ['app:db:col:list', 'app:db:show:collections']
