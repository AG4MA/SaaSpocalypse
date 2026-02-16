import React from 'react'
import * as Recharts from 'recharts'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'

// Registry of pre-approved modules that AI-generated code can import
const moduleRegistry: Record<string, unknown> = {
  react: React,
  recharts: Recharts,
}

// Also expose our UI components
const uiComponents = { Card, Badge, Button }

export async function loadFeatureComponent(code: string): Promise<React.ComponentType> {
  try {
    // Wrap the code to create a module-like environment
    // The AI-generated code should export default a React component
    const wrappedCode = `
      (function(React, require, exports, UIComponents) {
        const { useState, useEffect, useMemo, useCallback, useRef, Fragment } = React;
        const { Card, Badge, Button } = UIComponents;
        ${code}
        return exports.default || exports;
      })
    `

    // Create a require shim that resolves from our module registry
    const requireShim = (moduleName: string) => {
      const mod = moduleRegistry[moduleName]
      if (!mod) {
        throw new Error(`Module "${moduleName}" is not available. Allowed: ${Object.keys(moduleRegistry).join(', ')}`)
      }
      return mod
    }

    const exports: Record<string, unknown> = {}

    // Create a Blob URL and evaluate
    const blob = new Blob([wrappedCode], { type: 'application/javascript' })
    const url = URL.createObjectURL(blob)

    try {
      // Use Function constructor to evaluate the code safely
      // eslint-disable-next-line no-new-func
      const factory = new Function(
        'return ' + wrappedCode
      )
      const module = factory()
      const result = module(React, requireShim, exports, uiComponents)

      // The result should be a React component (function)
      if (typeof result === 'function') {
        return result as React.ComponentType
      }

      // Check if it's an object with a default export
      if (result && typeof result === 'object' && 'default' in result && typeof result.default === 'function') {
        return result.default as React.ComponentType
      }

      throw new Error('Generated code did not export a valid React component')
    } finally {
      URL.revokeObjectURL(url)
    }
  } catch (err) {
    console.error('Feature loading error:', err)
    throw err
  }
}
