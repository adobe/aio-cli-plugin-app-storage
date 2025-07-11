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

export class GetCollectionNames extends DBBaseCommand {
  async run () {
    try {
      this.log(chalk.blue('Fetching collection names...'))

      const client = await this.db.connect()
      const collectionInfo = await client.listCollections()

      this.debugLogger?.info?.(`Retrieved ${collectionInfo.length} collections from database`)

      // Extract only the names from the collection info
      const collectionNames = collectionInfo.map(collection => collection.name)

      if (this.flags.json) {
        return collectionNames
      }

      this.log(chalk.green('Collection names:'))
      this.log(JSON.stringify(collectionNames, null, 2))

      return collectionNames
    } catch (error) {
      this.debugLogger?.error?.('Error fetching collection names', error)

      this.log(chalk.red('Error fetching collection names'))
      this.log(chalk.dim(`   Namespace: ${this.rtNamespace}`))
      this.log(chalk.dim(`   Error: ${error.message}`))

      this.error(`Failed to fetch collection names: ${error.message}`)
    }
  }
}

GetCollectionNames.description = 'Get collection names of your App Builder database'

GetCollectionNames.examples = [
  '$ aio app db GetCollectionNames',
  '$ aio app db GetCollectionNames --json'
]

GetCollectionNames.flags = {
  ...DBBaseCommand.flags
}

GetCollectionNames.args = {}
