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
import { Args } from '@oclif/core'

export class Get extends StateBaseCommand {
  async run () {
    const ret = await this.state.get(this.args.key)

    if (!ret) {
      // and not value = key does not exist
      this.error('key does not exist')
    }

    const { value, expiration } = ret

    if (!this.flags.json) {
      // we write ONLY the value to stdout for pipe-ability (no new line)
      process.stdout.write(value)
      // the rest goes to stderr
      process.stderr.write(chalk.dim(`\n> expiration: ${(new Date(expiration)).toLocaleString()} (local time)\n`))
    }

    return { value, expiration } // --json { value, expiration UTC }
  }
}

Get.description = 'Get a key-value'
Get.examples = [
  '$ aio app state get key',
  '$ aio app state get key --json',
  '$ aio app state get key | wc -c'
]

Get.args = {
  key: Args.string({
    name: 'key',
    description: 'State key',
    required: true
  })
}
