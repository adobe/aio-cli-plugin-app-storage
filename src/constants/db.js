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

export const DB_STATUS = {
  PROVISIONED: 'PROVISIONED',
  REQUESTED: 'REQUESTED',
  PROCESSING: 'PROCESSING',
  FAILED: 'FAILED',
  REJECTED: 'REJECTED',
  NOT_PROVISIONED: 'NOT_PROVISIONED',
  DELETED: 'DELETED',
  UNKNOWN: 'UNKNOWN'
}

// Region constants for db are separate from state in case they diverge in the future
export const CONFIG_DB_REGION = 'db.region'
export const DEFAULT_REGION = 'amer'
export const AVAILABLE_REGIONS = {
  prod: ['amer', 'emea', 'apac', 'aus'],
  stage: ['amer', 'amer2']
}

export const CONFIG_DB_ENDPOINT = 'db.endpoint'
