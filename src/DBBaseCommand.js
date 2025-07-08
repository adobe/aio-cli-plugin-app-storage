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
import { DEFAULT_REGION } from './constants/db.js'

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
      // Dynamic import of aio-lib-db (CommonJS module)
      // eslint-disable-next-line node/no-unsupported-features/es-syntax
      const aioLibDb = await import('@adobe/aio-lib-db')
      const { init } = aioLibDb.default || aioLibDb

      // Get database configuration
      const dbConfig = {
        namespace: config.get('runtime.namespace'),
        auth: config.get('runtime.auth'),
        region: this.flags?.region || config.get('db.region') || DEFAULT_REGION,
        endpoint: config.get('db.endpoint') || process.env.AIO_DB_ENDPOINT
      }

      // Validate required configuration
      if (!(dbConfig.namespace && dbConfig.auth)) {
        this.error(
          `Database commands require App Builder project configuration.
Please make sure the 'AIO_RUNTIME_NAMESPACE' and 'AIO_RUNTIME_AUTH' environment variables are configured.`
        )
      }

      this.debugLogger?.info?.('Initializing DB client with config:', {
        namespace: dbConfig.namespace,
        region: dbConfig.region,
        hasAuth: !!dbConfig.auth,
        endpoint: dbConfig.endpoint || 'default'
      })

      // Initialize the database client
      this.db = await init(dbConfig.namespace, dbConfig.auth)
      this.dbConfig = dbConfig
      this.rtNamespace = dbConfig.namespace

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
