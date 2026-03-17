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

/**
 * Prettifies json for readable log output
 *
 * @param {*} val - The value to pretty print as JSON.
 * @param {number} indent - The number of spaces to indent the entire output.
 * @returns {string} - The pretty printed JSON string.
 */
export function prettyJson (val, indent = 5) {
  let out
  if (typeof val === 'string') {
    try {
      out = JSON.stringify(JSON.parse(val), null, 2)
    } catch (e) {
      out = val // If parsing fails, return the original string
    }
  } else {
    out = JSON.stringify(val, null, 2)
  }
  if (indent) {
    out = out.replace(/^/gm, ' '.repeat(indent))
  }
  return out
}
