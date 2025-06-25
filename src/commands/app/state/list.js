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
import { StateBaseCommand } from '../../../StateBaseCommand.js'
import { Flags } from '@oclif/core'
import chalk from 'chalk'

const MAX_KEYS = 5000
const COUNT_HINT = 500 // per iteration

export class List extends StateBaseCommand {
  async run () {
    const allKeys = []

    const { match } = this.flags

    let truncatedKeys = null
    for await (const { keys } of this.state.list({ match, countHint: COUNT_HINT })) {
      if (keys.length + allKeys.length > MAX_KEYS) {
        truncatedKeys = keys.slice(0, MAX_KEYS - allKeys.length)
        break
      }
      allKeys.push(...keys)
      this.logKeys(keys)
    }
    if (truncatedKeys) {
      allKeys.push(...truncatedKeys)
      this.logKeys(truncatedKeys)
      this.warn(chalk.yellow(`Too many keys found, only the first ${MAX_KEYS} keys are displayed\nUse --match to filter keys`))
    }
    return allKeys // --json
  }

  logKeys (keys) {
    // do not log unnecessary new lines
    keys.length && this.log(keys.join('\n'))
  }
}

List.description = 'List key-values'
List.examples = [
  '$ aio app state list',
  '$ aio app state list --match \'gl*b\'',
  '$ aio app state list --json',
  '$ aio app state list | less',
  '$ aio app state list | wc -l'
]

List.flags = {
  ...StateBaseCommand.flags,
  match: Flags.string({
    name: 'match',
    char: 'm',
    description: 'Glob-like pattern to filter keys',
    required: false,
    default: '*'
  })
}

List.aliases = [
  'app:state:ls'
]
