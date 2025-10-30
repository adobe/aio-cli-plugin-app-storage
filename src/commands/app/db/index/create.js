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
import { Args, Flags } from '@oclif/core'
import chalk from 'chalk'
import { asObject, isNonEmptyString } from '../../../../utils/inputValidation.js'
import { prettyJson } from '../../../../utils/output.js'

// Regular expression to match the -s/--spec or -k/--key flags in <flag>=<value> format
// if match.groups.spec is defined, it means the flag was -s or --spec
// if match.groups.key is defined, it means the flag was -k or --key
const specFlagMatch = /^((?<spec>-s|--spec)|(?<key>-k|--key))=(?<val>.+)/

export class Create extends DBBaseCommand {
  getOrderedSpecs () {
    // Key/spec order matters when creating an index and both key and spec can be specified,
    // so we need to parse argv to obtain the proper order since using this.flags loses the order between the two
    const args = this.argv.slice(1) // Ignore the first element (collection name)
    const fullSpec = []
    let specOption = false
    args.forEach((arg) => {
      if (specOption === 'key') {
        // Previous arg was -k or --key
        fullSpec.push(arg)
        specOption = false
      } else if (specOption === 'spec') {
        // Previous arg was -s or --spec
        fullSpec.push(asObject(arg))
        specOption = false
      } else if (arg === '-k' || arg === '--key') {
        // Next arg is a key
        specOption = 'key'
      } else if (arg === '-s' || arg === '--spec') {
        // Next arg is a spec
        specOption = 'spec'
      } else {
        // Check if the arg is in the form of -s=<val>/--spec=<val> or -k=<val>/--key=<val>
        const specMatch = arg.match(specFlagMatch)
        if (specMatch?.groups?.spec) {
          // Spec is a JSON object
          fullSpec.push(asObject(specMatch.groups.val))
        } else if (specMatch?.groups?.key) {
          // Key is a string
          fullSpec.push(specMatch.groups.val)
        }
        specOption = false
      }
    })

    return fullSpec
  }

  async run () {
    const { collection } = this.args
    const { name, unique } = this.flags

    try {
      const fullSpec = this.getOrderedSpecs()
      const prettySpec = prettyJson(fullSpec)

      this.log(chalk.blue(`Creating index ${name ? `'${name}' ` : ''}on collection '${collection}'...`))
      this.log(chalk.dim(`   Specification:\n${prettySpec}`))
      if (unique) this.log(chalk.dim(`   Unique index: ${unique}`))

      const client = await this.db.connect()
      const coll = await client.collection(collection)

      // Build options
      const options = {}
      if (name) options.name = name
      if (unique) options.unique = unique

      const result = await coll.createIndex(fullSpec, options)

      this.debugLogger?.info?.('Index created successfully:', result)

      const response = {
        collection,
        indexName: result,
        specification: fullSpec,
        status: 'created',
        namespace: this.rtNamespace,
        timestamp: new Date().toISOString()
      }

      if (Object.keys(options).length > 0) response.options = options

      this.log(chalk.green(`Index '${result}' created successfully in the '${collection}' collection`))
      this.log(chalk.dim(`   Specification:\n${prettySpec}`))
      if (unique) this.log(chalk.dim(`   Unique: ${unique}`))
      this.log(chalk.dim(`   Namespace: ${this.rtNamespace}`))
      this.log(chalk.dim(`   Created: ${new Date().toLocaleString()}`))

      return response
    } catch (error) {
      this.debugLogger?.error?.('Error creating index:', error)

      this.log(chalk.red('Failed to create index'))
      this.log(chalk.dim(`   Collection: ${collection}`))
      this.log(chalk.dim(`   Namespace: ${this.rtNamespace}`))

      this.error(`Failed to create index on collection '${collection}': ${error.message}`)
    }
  }
}

Create.description = 'Create a new index on a collection in the database'

Create.examples = [
  '$ aio app db index create users --spec \'{"name":1, "age":-1}\'',
  '$ aio app db index create users -s \'{"name":1, "age":-1}\' --name "name_age_index"',
  '$ aio app db index create students -s \'{"name":1}\' --key grade --unique',
  '$ aio app db index create reviews -k sku -k rating',
  '$ aio app db index create products -s \'{"name":"text", "category":"text"}\' --json',
  '$ aio app db index create books -s \'{"author":1}\' -k year',
  '$ aio app db ind create orders --spec \'{"customerId":1}\' --spec \'{"orderDate":-1}\' --name "customer_order_index" --unique'
]

Create.args = {
  collection: Args.string({
    name: 'collection',
    description: 'The name of the collection to create the index on',
    required: true,
    parse: input => isNonEmptyString(input, 'Collection name')
  })
}

Create.flags = {
  ...DBBaseCommand.flags,
  spec: Flags.string({
    char: 's',
    helpGroup: 'Requires at least one of the index definition',
    description: 'Index specification as a JSON object (e.g., \'{"name":1, "age":-1}\')',
    multiple: true,
    atLeastOne: ['key', 'spec'],
    parse: input => asObject(input, 'Index specification')
  }),
  key: Flags.string({
    char: 'k',
    helpGroup: 'Requires at least one of the index definition',
    description: 'Index key to use with default specification',
    multiple: true,
    atLeastOne: ['key', 'spec'],
    // Note: untrimmed whitespace input is allowed for index keys
    parse: input => isNonEmptyString(input, 'Index key')
  }),
  name: Flags.string({
    char: 'n',
    description: 'A name that uniquely identifies the index',
    // Note: untrimmed whitespace input is allowed for index names
    parse: input => isNonEmptyString(input, 'Index name')
  }),
  unique: Flags.boolean({
    char: 'u',
    description: 'Creates a unique index so that the collection will not accept insertion or update of documents where the index key value matches an existing value in the index',
    default: false
  })
}

Create.aliases = ['app:db:ind:create']
