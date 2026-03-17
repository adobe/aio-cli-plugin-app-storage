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
import { asObject, isNonEmptyString, isProductionNamespace } from '../../src/utils/inputValidation.js'

describe('asObject()', () => {
  test('successfully parses string as object', () => {
    const input = '{"key1": "value", "key2": [123, 456], "key3": {"nestedKey": "nestedValue"}}'
    const result = asObject(input)
    expect(result).toEqual({
      key1: 'value',
      key2: [123, 456],
      key3: { nestedKey: 'nestedValue' }
    })
  })

  test('returns object directly', () => {
    const input = { key1: 'value', key2: [123, 456] }
    const result = asObject(input)
    expect(result).toBe(input)
  })

  test('throws error for invalid JSON string', () => {
    const input = '{"key1": "value", "key2": [123, 456], "key3": {"nestedKey": "nestedValue"'
    expect(() => asObject(input)).toThrow('JSON parse error:')
  })

  test('throws error for empty input', () => {
    const input = ''
    expect(() => asObject(input)).toThrow("Value '' is not a JSON object")
  })

  test('throws error for non-object input', () => {
    const input = ['not', 'an', 'object']
    expect(() => asObject(input)).toThrow("Value 'not,an,object' is not a JSON object")
  })

  test('uses custom label in error messages', () => {
    expect(() => asObject(null, 'Test Label')).toThrow("Test Label: Value 'null' is not a JSON object")
  })
})

describe('isNonEmptyString()', () => {
  test('validates non-empty string', () => {
    const input = 'valid string'
    const result = isNonEmptyString(input)
    expect(result).toBe(input)
  })

  test('throws error for empty string', () => {
    const input = ''
    expect(() => isNonEmptyString(input)).toThrow('Must be a non-empty string')
  })

  test('throws error for non-string input', () => {
    const input = 12345
    expect(() => isNonEmptyString(input)).toThrow('Must be a non-empty string')
  })

  test('uses custom label in error messages', () => {
    expect(() => isNonEmptyString('', 'Test Label')).toThrow('Test Label: Must be a non-empty string')
  })
})

describe('isProductionNamespace()', () => {
  test('validates production namespace without prefix or suffix', () => {
    expect(() => isProductionNamespace('123456-testNamespace123')).not.toThrow()
    expect(isProductionNamespace('123456-testNamespace123')).toBe(true)
  })

  test('validates production namespace with development prefix', () => {
    expect(() => isProductionNamespace('development-123456-testNamespace123')).not.toThrow()
    expect(isProductionNamespace('development-123456-testNamespace123')).toBe(true)
  })

  test('invalidates namespace with workspace suffix', () => {
    expect(() => isProductionNamespace('123456-testNamespace123-dev')).not.toThrow()
    expect(isProductionNamespace('123456-testNamespace123-dev')).toBe(false)
  })

  test('invalidates namespace with improper format', () => {
    expect(() => isProductionNamespace('invalidNamespace')).not.toThrow()
    expect(isProductionNamespace('invalidNamespace')).toBe(false)
  })

  test('throws error for non-string or empty input', () => {
    expect(() => isProductionNamespace('')).toThrow('Invalid runtime namespace')
    expect(() => isProductionNamespace(null)).toThrow('Invalid runtime namespace')
    expect(() => isProductionNamespace(12345)).toThrow('Invalid runtime namespace')
  })
})
