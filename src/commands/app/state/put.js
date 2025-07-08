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
import { Args, Flags } from '@oclif/core'
import { DEFAULT_TTL_SECONDS } from '../../../constants/state.js'
import chalk from 'chalk'

export class Put extends StateBaseCommand {
  async run () {
    const { key, value } = this.args
    const { json, ttl } = this.flags
    await this.state.put(key, value, { ttl })

    const bytesValue = Buffer.from(value).length
    const expirationDate = new Date(Date.now() + (ttl || DEFAULT_TTL_SECONDS) * 1000)
    if (!json) {
      process.stdout.write(key)
      // stderr, be consistent with GET
      process.stderr.write(chalk.dim(`\n> expiration:   ${new Date(expirationDate).toLocaleString()} (local time)\n`))
      process.stderr.write(chalk.dim(`> bytes value:  ${bytesValue}\n`))
    }

    return { key, bytesValue, expiration: expirationDate.toISOString() } // --json
  }
}

Put.description = 'Put a key-value'
Put.examples = [
  '$ aio app state put key value',
  '$ aio app state put key value --ttl 3600',
  '$ aio app state put key value --json',
  '$ cat value/from/file | xargs -0 ./bin/run.js app state put key'
]

Put.args = {
  key: Args.string({
    name: 'key',
    description: 'State key',
    required: true
  }),
  value: Args.string({
    name: 'value',
    description: 'State value',
    required: true
  })
}

Put.flags = {
  ...StateBaseCommand.flags,
  ttl: Flags.integer({
    char: 't',
    description: 'Time to live in seconds. Default is 86400 (24 hours), max is 31536000 (1 year).',
    required: false
  })
}
