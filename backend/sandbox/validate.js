/**
 * Validates AI-generated React component code.
 * Usage: node validate.js <path-to-code-file>
 *
 * Checks:
 * 1. Code parses without syntax errors
 * 2. Code exports a default (function)
 * 3. No forbidden patterns
 */

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const filePath = process.argv[2];

if (!filePath) {
  console.error("Usage: node validate.js <code-file>");
  process.exit(1);
}

try {
  const code = fs.readFileSync(filePath, "utf-8");

  // Create a minimal sandbox environment
  const React = {
    createElement: () => null,
    useState: (init) => [init, () => {}],
    useEffect: () => {},
    useMemo: (fn) => fn(),
    useCallback: (fn) => fn,
    useRef: (init) => ({ current: init }),
    Fragment: "Fragment",
  };

  const mockModule = (name) => {
    if (name === "react") return React;
    if (name === "recharts") {
      // Return a proxy that returns dummy components for any property
      return new Proxy(
        {},
        {
          get: () => () => null,
        }
      );
    }
    throw new Error(`Module "${name}" is not allowed`);
  };

  const exports = {};
  const UIComponents = {
    Card: () => null,
    Badge: () => null,
    Button: () => null,
  };

  // Try to compile and run in a sandbox
  const wrappedCode = `
    (function(React, require, exports, UIComponents) {
      const { useState, useEffect, useMemo, useCallback, useRef, Fragment } = React;
      const { Card, Badge, Button } = UIComponents;
      ${code}
    })
  `;

  const script = new vm.Script(wrappedCode, {
    filename: "feature.js",
    timeout: 5000,
  });

  const factory = script.runInNewContext({}, { timeout: 5000 });
  factory(React, mockModule, exports, UIComponents);

  // Check that we got a default export
  if (typeof exports.default !== "function") {
    console.error(
      "Code must export a default function component (exports.default = ComponentName)"
    );
    process.exit(1);
  }

  // Try calling the component to check for immediate errors
  try {
    exports.default({});
  } catch (renderError) {
    // Some render errors are OK (missing DOM, etc.) — we just check it doesn't crash on basic execution
    // Only fail on truly bad errors
    if (
      renderError.message &&
      !renderError.message.includes("document") &&
      !renderError.message.includes("window") &&
      !renderError.message.includes("DOM")
    ) {
      console.error(`Component execution error: ${renderError.message}`);
      process.exit(1);
    }
  }

  // Success
  console.log(JSON.stringify({ success: true, error: null }));
  process.exit(0);
} catch (error) {
  console.error(error.message || "Unknown error");
  process.exit(1);
}
