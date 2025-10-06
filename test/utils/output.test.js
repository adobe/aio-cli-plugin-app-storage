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

import { prettyJson } from '../../src/utils/output.js'

describe('prettyJson', () => {
  test('pretty prints JSON with default indent', () => {
    const input = { key1: 'value1', key2: 'value2' }
    const expectedOutput = `     {
       "key1": "value1",
       "key2": "value2"
     }`
    expect(prettyJson(input)).toBe(expectedOutput)
  })

  test('pretty prints JSON with no indent', () => {
    const input = { key1: 'value1', key2: 'value2' }
    const expectedOutput = `{
  "key1": "value1",
  "key2": "value2"
}`
    expect(prettyJson(input, 0)).toBe(expectedOutput)
  })

  test('returns indented original string if JSON parsing fails', () => {
    const input = 'Invalid JSON string'
    expect(prettyJson(input)).toBe('     Invalid JSON string')
  })
})
