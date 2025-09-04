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
import { describe, expect, test } from '@jest/globals'
import { isProductionNamespace } from '../../src/utils/inputValidation.js'

describe('utils/inputValidation isProductionNamespace', () => {
  test('treats production namespaces with no suffix as prod', () => {
    expect(isProductionNamespace('284026-myproject')).toBe(true)
    expect(isProductionNamespace('development-284026-myproject')).toBe(true)
  })

  test('treats non-production namespaces with suffix as non-prod', () => {
    expect(isProductionNamespace('284026-myproject-stage')).toBe(false)
    expect(isProductionNamespace('development-284026-myproject-test')).toBe(false)
    expect(isProductionNamespace('development-284026-myproject-dev')).toBe(false)
  })

  test('rejects invalid input', () => {
    expect(() => isProductionNamespace('')).toThrow('Invalid runtime namespace')

    expect(() => isProductionNamespace(null)).toThrow('Invalid runtime namespace')
  })
})
