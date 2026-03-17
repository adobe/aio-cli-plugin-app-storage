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

import { AddDb } from '../../../../src/commands/app/add/db.js'
import { Provision } from '../../../../src/commands/app/db/provision.js'
import { expect } from '@jest/globals'

describe('prototype', () => {
  test('extends Provision class', () => {
    expect(AddDb.prototype instanceof Provision).toBe(true)
  })

  test('examples have updated syntax', () => {
    const expected = Provision.examples.map(example => example.replace('$ aio app db provision', '$ aio app add db'))
    expect(AddDb.examples).toEqual(expected)
  })
})
