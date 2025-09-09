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

/**
 * Helper to verify the argument/option input is a javascript or json object
 * Returns the object if valid, or throws an error if invalid
 *
 * @param {object|string} input - The input to validate
 * @param {string=} label - Optional label for an error message, such as the argument/option name
 * @returns {object} - The validated object
 */
export function asObject (input, label = undefined) {
  label = label ? `${label}: ` : ''
  if (typeof input === 'object' && input !== null && !Array.isArray(input)) {
    return input
  }
  if (typeof input !== 'string' || input.trim().length === 0) {
    throw new Error(`${label}Value '${input}' is not a JSON object`)
  }

  let result
  try {
    result = JSON.parse(input)
  } catch (e) {
    e.message = `${label}JSON parse error: ${e.message}`
    throw e
  }
  if (typeof result !== 'object' || result === null || Array.isArray(result)) {
    throw new Error(`${label}Value '${input}' is not a JSON object`)
  }

  return result
}

/**
 * Helper to verify the argument/option input is a non-empty string
 * Throws an error if the input is not a string with length > 0
 * Does not check for whitespace-only strings, call `trim()` when passing the input if needed
 *
 * @param {string} input - The input to validate
 * @param {string=} label - Optional label for an error message, such as the argument/option name
 * @returns {string} - The validated non-empty string
 */
export function isNonEmptyString (input, label = undefined) {
  label = label ? `${label}: ` : ''
  if (typeof input !== 'string' || input.length === 0) {
    throw new Error(`${label}Must be a non-empty string`)
  }
  return input
}

/**
 * Determine if a runtime namespace corresponds to a production workspace.
 * production if optional prefix<development-> + orgId + projectName with no trailing workspace suffix.
 *
 * @param {string} namespace - The runtime namespace to check
 * @returns {boolean} - True if the namespace is a production workspace, false otherwise
 */
export function isProductionNamespace (namespace) {
  if (typeof namespace !== 'string' || !namespace.trim()) {
    throw new Error('Invalid runtime namespace')
  }
  const PROD_NS_REGEX = /^(?:development-)?\d+-[a-z0-9]+$/i
  return PROD_NS_REGEX.test(namespace)
}
