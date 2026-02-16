import { useState } from 'react'
import { Modal } from '../ui/Modal'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { Key, AlertCircle, CheckCircle, ChevronDown } from 'lucide-react'
import { setApiKey } from '../../services/api'

type Provider = 'anthropic' | 'openai' | 'google'

interface ModelInfo {
  id: string
  name: string
  default?: boolean
}

interface ProviderInfo {
  id: Provider
  name: string
  placeholder: string
  keyPrefix: string
  consoleUrl: string
  consoleName: string
  models: ModelInfo[]
}

const PROVIDERS: ProviderInfo[] = [
  {
    id: 'anthropic',
    name: 'Anthropic',
    placeholder: 'sk-ant-api03-...',
    keyPrefix: 'sk-ant-',
    consoleUrl: 'https://console.anthropic.com/settings/keys',
    consoleName: 'console.anthropic.com',
    models: [
      { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4 (Latest)', default: true },
      { id: 'claude-opus-4-20250514', name: 'Claude Opus 4' },
      { id: 'claude-3-7-sonnet-20250219', name: 'Claude 3.7 Sonnet' },
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
      { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku (Fast)' },
      { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus' },
      { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet' },
      { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku' },
    ],
  },
  {
    id: 'openai',
    name: 'OpenAI',
    placeholder: 'sk-proj-...',
    keyPrefix: 'sk-',
    consoleUrl: 'https://platform.openai.com/api-keys',
    consoleName: 'platform.openai.com',
    models: [
      { id: 'gpt-4.1', name: 'GPT-4.1 (Latest)', default: true },
      { id: 'gpt-4.1-mini', name: 'GPT-4.1 Mini' },
      { id: 'gpt-4.1-nano', name: 'GPT-4.1 Nano (Fastest)' },
      { id: 'gpt-4o', name: 'GPT-4o' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
      { id: 'o3', name: 'o3 (Reasoning)' },
      { id: 'o3-mini', name: 'o3 Mini' },
      { id: 'o1', name: 'o1 (Reasoning)' },
      { id: 'o1-mini', name: 'o1 Mini' },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
      { id: 'gpt-4', name: 'GPT-4' },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo (Legacy)' },
    ],
  },
  {
    id: 'google',
    name: 'Google',
    placeholder: 'AIzaSy...',
    keyPrefix: 'AI',
    consoleUrl: 'https://aistudio.google.com/app/apikey',
    consoleName: 'aistudio.google.com',
    models: [
      { id: 'gemini-2.5-pro-preview-06-05', name: 'Gemini 2.5 Pro (Latest)', default: true },
      { id: 'gemini-2.5-flash-preview-05-20', name: 'Gemini 2.5 Flash' },
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
      { id: 'gemini-2.0-flash-lite', name: 'Gemini 2.0 Flash Lite (Fast)' },
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
      { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
      { id: 'gemini-1.5-flash-8b', name: 'Gemini 1.5 Flash 8B' },
    ],
  },
]

interface ApiKeyModalProps {
  isOpen: boolean
  onSuccess: () => void
}

export function ApiKeyModal({ isOpen, onSuccess }: ApiKeyModalProps) {
  const [selectedProvider, setSelectedProvider] = useState<Provider>('anthropic')
  const [selectedModel, setSelectedModel] = useState<string>('')
  const [apiKey, setApiKeyValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const currentProvider = PROVIDERS.find((p) => p.id === selectedProvider)!
  
  // Get default model for current provider if none selected
  const getDefaultModel = () => {
    const defaultModel = currentProvider.models.find((m) => m.default)
    return defaultModel?.id || currentProvider.models[0]?.id || ''
  }

  const handleProviderChange = (provider: Provider) => {
    setSelectedProvider(provider)
    setSelectedModel('') // Reset to default
    setApiKeyValue('')
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    const trimmedKey = apiKey.trim()
    
    if (!trimmedKey) {
      setError('Please enter your API key')
      setIsLoading(false)
      return
    }

    if (!trimmedKey.startsWith(currentProvider.keyPrefix)) {
      setError(`${currentProvider.name} keys should start with "${currentProvider.keyPrefix}"`)
      setIsLoading(false)
      return
    }

    const modelToUse = selectedModel || getDefaultModel()
    const result = await setApiKey(trimmedKey, selectedProvider, modelToUse)
    
    if (result.success) {
      setSuccess(true)
      // Clear the input immediately for security
      setApiKeyValue('')
      setTimeout(() => {
        onSuccess()
      }, 1000)
    } else {
      setError(result.message)
    }
    
    setIsLoading(false)
  }

  const currentModel = selectedModel || getDefaultModel()
  const currentModelName = currentProvider.models.find((m) => m.id === currentModel)?.name || currentModel

  return (
    <Modal isOpen={isOpen} onClose={() => {}} title="API Key Required" className="max-w-md">
      <div className="p-6">
        {success ? (
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-500" />
            </div>
            <p className="text-text-primary font-medium">API Key Configured!</p>
            <p className="text-text-secondary text-sm text-center">
              Using <span className="text-primary">{currentModelName}</span>
              <br />
              Key encrypted and stored only for this session.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-start gap-3 p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
              <Key className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="text-amber-400 font-medium">Session-Only Configuration</p>
                <p className="text-text-secondary mt-1">
                  Your API key will be encrypted and stored only in server memory. 
                  It will be automatically deleted when you close the app.
                </p>
              </div>
            </div>

            {/* Provider Selection */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-text-secondary">LLM Provider</label>
              <div className="grid grid-cols-3 gap-2">
                {PROVIDERS.map((provider) => (
                  <button
                    key={provider.id}
                    type="button"
                    onClick={() => handleProviderChange(provider.id)}
                    className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
                      selectedProvider === provider.id
                        ? 'bg-primary/20 border-primary text-primary'
                        : 'bg-surface border-border text-text-secondary hover:border-primary/50'
                    }`}
                  >
                    {provider.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Model Selection */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-text-secondary">Model</label>
              <div className="relative">
                <select
                  value={selectedModel || getDefaultModel()}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary appearance-none cursor-pointer focus:outline-none focus:border-primary"
                >
                  {currentProvider.models.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary pointer-events-none" />
              </div>
            </div>

            <Input
              label={`${currentProvider.name} API Key`}
              type="password"
              placeholder={currentProvider.placeholder}
              value={apiKey}
              onChange={(e) => setApiKeyValue(e.target.value)}
              autoComplete="off"
              autoFocus
            />

            {error && (
              <div className="flex items-center gap-2 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading || !apiKey.trim()}
            >
              {isLoading ? 'Configuring...' : 'Configure API Key'}
            </Button>

            <p className="text-xs text-text-secondary text-center">
              Need a key? Get one at{' '}
              <a 
                href={currentProvider.consoleUrl}
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                {currentProvider.consoleName}
              </a>
            </p>
          </form>
        )}
      </div>
    </Modal>
  )
}
