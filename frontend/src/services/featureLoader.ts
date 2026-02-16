import React from 'react'
import * as Recharts from 'recharts'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'

// Registry of pre-approved modules that AI-generated code can import
const moduleRegistry: Record<string, unknown> = {
  react: React,
  recharts: Recharts,
}

// UI components available to generated features
const uiComponents = { Card, Badge, Button, Input, Modal }

/**
 * Load an AI-generated component from source code.
 * Code is fetched from the gateway API (real files on disk)
 * and executed in a sandboxed Function constructor.
 */
export async function loadFeatureComponent(code: string): Promise<React.ComponentType> {
  try {
    const wrappedCode = `
      (function(React, require, exports, UIComponents) {
        var Card = UIComponents.Card;
        var Badge = UIComponents.Badge;
        var Button = UIComponents.Button;
        var Input = UIComponents.Input;
        var Modal = UIComponents.Modal;
        ${code}
        return exports.default || exports;
      })
    `

    const requireShim = (moduleName: string) => {
      const mod = moduleRegistry[moduleName]
      if (!mod) {
        throw new Error(`Module "${moduleName}" is not available. Allowed: ${Object.keys(moduleRegistry).join(', ')}`)
      }
      return mod
    }

    const exports: Record<string, unknown> = {}

    // eslint-disable-next-line no-new-func
    const factory = new Function('return ' + wrappedCode)
    const module = factory()
    const result = module(React, requireShim, exports, uiComponents)

    if (typeof result === 'function') {
      return result as React.ComponentType
    }

    if (result && typeof result === 'object' && 'default' in result && typeof result.default === 'function') {
      return result.default as React.ComponentType
    }

    throw new Error('Generated code did not export a valid React component')
  } catch (err) {
    console.error('Feature loading error:', err)
    throw err
  }
}
