/*
Copyright 2024 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/
import chalk from 'chalk'
import { StateBaseCommand } from '../../../StateBaseCommand.js'
import { Args, Flags } from '@oclif/core'

const MAX_ARGV_NO_CONFIRM = 5

export class Delete extends StateBaseCommand {
  async run () {
    const { match, force } = this.flags
    const { argv: keysToDelete } = await this.parse(Delete)

    // eslint-disable-next-line node/no-unsupported-features/es-syntax
    const { input } = await import('@inquirer/prompts')

    if (match && keysToDelete.length) {
      return this.error('cannot use --match with args')
    }

    if (!(match || keysToDelete.length)) {
      return this.error('please provide either keys args or --match')
    }

    const containerExists = await this.state.any()
    if (!containerExists) {
      this.error(`there are no keys stored in '${this.rtNamespace}'!`)
    }

    if (!force) {
      // safeguards
      let warning = null

      if (keysToDelete.length > MAX_ARGV_NO_CONFIRM) {
        warning = `❌ CAUTION, you specified ${keysToDelete.length} key-values to delete`
      } else if (match) {
        warning = ([...match].every(c => c === '*'))
          ? '❌ CAUTION, this will delete ALL key-values!'
          : `❌ CAUTION, this will delete key-values matching the pattern '${match}'`
      }

      if (warning) {
        process.stderr.write(chalk.red(warning) + '\n') // console.error doesn't behave nicely with jest

        const res = await input(
          { message: `confirm deletion by typing: '${this.rtNamespace}'` },
          // write prompt to stderr for clean --json output
          { output: process.stderr }
        )

        if (res !== this.rtNamespace) {
          return this.error('confirmation did not match, aborted')
        }
      }
    }

    let deletedKeys
    if (keysToDelete.length) {
      const ret = await Promise.all(keysToDelete.map(async key => {
        const res = await this.state.delete(key)
        return res ? 1 : 0
      }))
      deletedKeys = ret.reduce((sum, val) => sum + val, 0)
    } else {
      // ! here we go, deleting all the user's keys
      const ret = await this.state.deleteAll({ match })
      deletedKeys = ret.keys
    }

    this.log(`keys deleted: ${deletedKeys}`)
    return { keys: deletedKeys } // --json
  }
}

Delete.description = 'Delete key-values'
Delete.examples = [
  '$ aio app state delete key',
  '$ aio app state delete key1 key2 key3',
  '$ aio app state delete --match \'gl*b\'',
  '$ aio app state delete --match \'gl*b\' --json',
  '$ aio app state delete --match \'be-carreful*\' --force'
]

Delete.strict = false // allow for multiple args
Delete.args = {
  keys: Args.string({
    name: 'keys',
    description: `keys to delete. Above ${MAX_ARGV_NO_CONFIRM} keys, you will be prompted for confirmation`,
    required: false
  })
}

Delete.flags = {
  ...BaseCommand.flags,
  match: Flags.string({
    description: '[use with caution!] deletes ALL key-values matching the provided glob-like pattern',
    required: false
  }),
  force: Flags.boolean({
    description: '[use with caution!] force delete, no safety prompt',
    default: false
  })
}

Delete.aliases = [
  'app:state:del',
  'app:state:remove',
  'app:state:rm'
]
