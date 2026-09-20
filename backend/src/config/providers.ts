export interface IModelInfo {
  id: string;
  displayName: string;
}

export interface IProviderInfo {
  id: string;
  displayName: string;
  enabled: boolean;
  models: IModelInfo[];
  defaultTemperature: number;
  maxTokens: number;
  supportedFeatures: string[];
}

export const PROVIDERS_REGISTRY: IProviderInfo[] = [
  {
    id: 'gemini',
    displayName: 'Google Gemini',
    enabled: true,
    models: [
      { id: 'gemini-2.5-flash', displayName: 'Gemini 2.5 Flash (Fastest, default)' },
      { id: 'gemini-2.5-pro', displayName: 'Gemini 2.5 Pro (Deeper reasoning)' }
    ],
    defaultTemperature: 0.1,
    maxTokens: 2048,
    supportedFeatures: ['security', 'logic', 'architecture', 'performance']
  },
  {
    id: 'openai',
    displayName: 'OpenAI ChatGPT',
    enabled: false,
    models: [
      { id: 'gpt-4o', displayName: 'GPT-4o' },
      { id: 'gpt-4o-mini', displayName: 'GPT-4o Mini' }
    ],
    defaultTemperature: 0.2,
    maxTokens: 4096,
    supportedFeatures: ['security', 'logic', 'performance']
  },
  {
    id: 'anthropic',
    displayName: 'Anthropic Claude',
    enabled: false,
    models: [
      { id: 'claude-3-5-sonnet', displayName: 'Claude 3.5 Sonnet' }
    ],
    defaultTemperature: 0.1,
    maxTokens: 4096,
    supportedFeatures: ['security', 'logic', 'architecture']
  },
  {
    id: 'local',
    displayName: 'Local LLM (Ollama)',
    enabled: false,
    models: [
      { id: 'llama3', displayName: 'Llama 3' }
    ],
    defaultTemperature: 0.1,
    maxTokens: 2048,
    supportedFeatures: ['logic']
  }
];
