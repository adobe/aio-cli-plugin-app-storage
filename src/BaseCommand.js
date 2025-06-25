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

import { Command, Flags } from '@oclif/core'
import AioLogger from '@adobe/aio-lib-core-logging'
import chalk from 'chalk'

export class BaseCommand extends Command {
  async init () {
    await super.init()
    // eslint-disable-next-line node/no-unsupported-features/es-syntax
    const { readFile } = await import('fs/promises') // dynamic import to be able to mock fs, ESM and Jest are not friends

    // setup debug logger
    const command = this.constructor.name.toLowerCase() // hacky but convenient
    this.debugLogger = AioLogger(
      `aio:app:state:${command}`,
      { provider: 'debug' }
    )
    // override warn to stderr
    this.warn = (msg) => process.stderr.write(chalk.yellow(`> Warning: ${msg.split('\n').join('\n> ')}\n`))

    // parse flags and args
    const { flags, args } = await this.parse(this.prototype)
    this.flags = flags
    this.args = args
    this.debugLogger.debug(`${command} args=${JSON.stringify(this.args)} flags=${JSON.stringify(this.flags)}`)
  }

  async catch (error) {
    this.debugLogger.error(error) // debug log with stack trace

    if (error.message.includes('User force closed the prompt')) {
      // CTRL +C on a prompt, do not log an error message
      this.exit(2)
    }

    if (this.flags?.json) {
      process.stderr.write(JSON.stringify(this.toErrorJson(error.message)) + '\n')
      this.exit(2)
    }
    this.error(error.message)
  }
}

// Set to true if you want to add the --json flag to your command.
// oclif will automatically suppress logs (if you use this.log, this.warn, or this.error) and
// display the JSON returned by the command's run method.
BaseCommand.enableJsonFlag = true

BaseCommand.flags = {
  region: Flags.string({
    description: 'State region. Defaults to \'AIO_STATE_REGION\' env or \'amer\' if neither is set.',
    required: false,
    options: ['amer', 'emea', 'apac']
  })
}

BaseCommand.args = {}
