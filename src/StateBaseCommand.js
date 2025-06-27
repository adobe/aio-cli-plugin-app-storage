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

import { BaseCommand } from './BaseCommand.js'
import config from '@adobe/aio-lib-core-config'
import { CONFIG_STATE_REGION } from './constants/state.js'
import semver from 'semver'

export class StateBaseCommand extends BaseCommand {
  async init () {
    await super.init()
    // check application dependencies
    let packageJson
    try {
      // eslint-disable-next-line node/no-unsupported-features/es-syntax
      const { readFile } = await import('fs/promises')
      const file = await readFile('package.json')
      packageJson = JSON.parse(file.toString())
    } catch (e) {
      this.debugLogger?.debug?.('package.json not found, skipping dependency check')
    }
    if (packageJson) {
      const aioLibStateVersion = packageJson.dependencies?.['@adobe/aio-lib-state']
      const aioSdkVersion = packageJson.dependencies?.['@adobe/aio-sdk']
      if ((aioLibStateVersion && semver.lt(semver.coerce(aioLibStateVersion), '4.0.0')) ||
        (aioSdkVersion && semver.lt(semver.coerce(aioSdkVersion), '6.0.0'))) {
        this.error('State commands are not available for legacy State, please migrate to the latest "@adobe/aio-lib-state" (or "@adobe/aio-sdk" >= 6.0.0).')
      }
    }

    // init state client
    const owOptions = {
      namespace: config.get('runtime.namespace'),
      auth: config.get('runtime.auth')
    }
    if (!(owOptions.namespace && owOptions.auth)) {
      this.error(
`This command is expected to be run in the root of a App Builder app project.
  Please make sure the 'AIO_RUNTIME_NAMESPACE' and 'AIO_RUNTIME_AUTH' environment variables are configured.`
      )
    }
    const region = this.flags.region || config.get(CONFIG_STATE_REGION) || 'amer'
    this.debugLogger?.info?.('using state region: %s', region)

    if (config.get('state.endpoint')) {
      process.env.AIO_STATE_ENDPOINT = config.get('state.endpoint')
      this.debugLogger?.info?.('using custom endpoint: %s', process.env.AIO_STATE_ENDPOINT)
    }
    // dynamic import to be able to reload the AIO_STATE_ENDPOINT var
    // eslint-disable-next-line node/no-unsupported-features/es-syntax
    const aioLibState = await import('@adobe/aio-lib-state')

    /** @type {import('@adobe/aio-lib-state').AdobeState} */
    this.state = await aioLibState.init({ region, ow: owOptions })

    this.rtNamespace = owOptions.namespace
  }

  /**
   * Get the service name for logging
   * @returns {string} The service name
   */
  getServiceName () {
    return 'state'
  }
}
