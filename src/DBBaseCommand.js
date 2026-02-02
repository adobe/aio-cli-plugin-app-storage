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

import { BaseCommand } from './BaseCommand.js'
import config from '@adobe/aio-lib-core-config'
import { CONFIG_RUNTIME_AUTH, CONFIG_RUNTIME_NAMESPACE } from './constants/global.js'
import { AVAILABLE_REGIONS, CONFIG_DB_ENDPOINT, CONFIG_DB_REGION, DEFAULT_REGION } from './constants/db.js'
import { Flags } from '@oclif/core'
import { getCliEnv } from '@adobe/aio-lib-env'

export class DBBaseCommand extends BaseCommand {
  async init () {
    await super.init()

    // Initialize database client
    await this.initializeDBClient()

    this.debugLogger?.info?.('DBBaseCommand initialized with DB client')
  }

  /**
   * Initialize the database client using aio-lib-db
   */
  async initializeDBClient () {
    try {
      const region = this.flags?.region || config.get(CONFIG_DB_REGION) || DEFAULT_REGION
      // Get database configuration
      const dbConfig = {
        ow: {
          namespace: config.get(CONFIG_RUNTIME_NAMESPACE),
          auth: config.get(CONFIG_RUNTIME_AUTH)
        },
        region
      }

      // Validate region based on environment
      const allowedRegions = AVAILABLE_REGIONS[getCliEnv()]
      if (!allowedRegions.includes(region)) {
        this.error(`Invalid region '${region}' for the ${getCliEnv()} environment, must be one of: ${allowedRegions.join(', ')}`)
      }

      // Validate required configuration
      if (!(dbConfig.ow.namespace && dbConfig.ow.auth)) {
        this.error(
          `Database commands require App Builder project configuration.
Please make sure the 'AIO_RUNTIME_NAMESPACE' and 'AIO_RUNTIME_AUTH' environment variables are configured.`
        )
      }

      const endpointOverride = config.get(CONFIG_DB_ENDPOINT)
      if (endpointOverride) {
        process.env.AIO_DB_ENDPOINT = endpointOverride
        this.debugLogger?.info?.('Using custom endpoint: %s', process.env.AIO_DB_ENDPOINT)
      }

      // Dynamic import to be able to reload the AIO_DB_ENDPOINT var
      // eslint-disable-next-line node/no-unsupported-features/es-syntax
      const aioLibDb = await import('@adobe/aio-lib-db')
      const { init } = aioLibDb.default || aioLibDb

      this.debugLogger?.info?.('Initializing DB client with config:', {
        namespace: dbConfig.ow.namespace,
        region: dbConfig.region,
        hasAuth: !!dbConfig.ow.auth
      })

      // Initialize the database client
      this.db = await init(dbConfig)
      this.dbConfig = dbConfig
      this.rtNamespace = dbConfig.ow.namespace

      this.debugLogger?.info?.('DB client initialized successfully')
    } catch (error) {
      this.debugLogger?.error?.('Failed to initialize DB client:', error.message)
      this.error(`Failed to initialize database client: ${error.message}`)
    }
  }

  /**
   * Get the service name for logging
   * @returns {string} The service name
   */
  getServiceName () {
    return 'db'
  }
}

// Add json and region flags to GLOBAL FLAGS section in --help output
DBBaseCommand.flags = {
  ...BaseCommand.flags,
  json: {
    description: 'Format output as json.',
    default: false,
    required: false,
    helpGroup: 'GLOBAL'
  },
  region: Flags.string({
    description: `Database region. Defaults to 'AIO_DB_REGION' environment variable or '${DEFAULT_REGION}' if neither is set. Any database region set in 'app.config.yaml' takes precedence over all of these.\n<options: ${AVAILABLE_REGIONS.prod.join('|')}>`,
    required: false,
    helpGroup: 'GLOBAL'
    // Don't set default here to let it load from the environment var if not passed as a flag
  })
}
