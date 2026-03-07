import React, { useState, useEffect, useRef } from 'react'
import { Copy, Play, ChevronDown } from 'lucide-react'
import Prism from 'prismjs'
import 'prismjs/themes/prism-tomorrow.min.css'
import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-python'
import 'prismjs/components/prism-bash'
import 'prismjs/components/prism-dockerfile'
import 'prismjs/components/prism-json'

const CodeBox = ({
  code,
  language = 'javascript',
  title = 'Code Example',
  os = null,
  executable = false,
  description = null,
  codesandboxId = null,
  tabs = null,
  onExecute = null,
}) => {
  const [copied, setCopied] = useState(false)
  const [selectedTab, setSelectedTab] = useState(0)
  const [output, setOutput] = useState('')
  const [isExecuting, setIsExecuting] = useState(false)
  const codeRef = useRef(null)
  const outputRef = useRef(null)

  const codeToDisplay = tabs ? tabs[selectedTab].code : code
  const langToUse = tabs ? tabs[selectedTab].language : language

  useEffect(() => {
    if (codeRef.current) {
      codeRef.current.innerHTML = Prism.highlight(
        codeToDisplay,
        Prism.languages[langToUse] || Prism.languages.javascript,
        langToUse
      )
    }
  }, [codeToDisplay, langToUse])

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(codeToDisplay)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const executeCode = async () => {
    if (!executable || langToUse !== 'javascript') return

    setIsExecuting(true)
    setOutput('')

    try {
      const result = await new Function(codeToDisplay)()
      setOutput(String(result || 'Code executed successfully'))
    } catch (error) {
      setOutput(`Error: ${error.message}`)
    }

    setIsExecuting(false)
  }

  return (
    <div className='my-6 rounded-lg border border-primary-500/20 bg-neutral-900/50 overflow-hidden'>
      {/* Header */}
      <div className='flex items-center justify-between px-4 py-3 bg-neutral-800/80 border-b border-primary-500/20'>
        <div className='flex items-center space-x-3'>
          <span className='text-xs font-mono font-semibold text-primary-400 uppercase'>
            {langToUse}
          </span>
          {title && <span className='text-sm text-neutral-400'>{title}</span>}
        </div>

        <div className='flex items-center space-x-2'>
          {executable && langToUse === 'javascript' && (
            <button
              onClick={executeCode}
              disabled={isExecuting}
              className='flex items-center space-x-1 px-3 py-1 text-xs font-semibold text-primary-400 hover:text-primary-300 bg-primary-950/50 hover:bg-primary-950 rounded transition-colors duration-250 disabled:opacity-50'
            >
              <Play className='w-3 h-3' />
              <span>{isExecuting ? 'Running...' : 'Run'}</span>
            </button>
          )}

          <button
            onClick={copyToClipboard}
            className='flex items-center space-x-1 px-3 py-1 text-xs font-semibold text-neutral-400 hover:text-primary-400 bg-neutral-700/50 hover:bg-neutral-700 rounded transition-colors duration-250'
          >
            <Copy className='w-3 h-3' />
            <span>{copied ? 'Copied!' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* OS Tabs (if provided) */}
      {os && (
        <div className='flex border-b border-primary-500/20 bg-neutral-850'>
          {os.map((osName, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedTab(idx)}
              className={`flex-1 px-3 py-2 text-xs font-medium transition-colors duration-250 ${
                selectedTab === idx
                  ? 'text-primary-400 bg-primary-950/30 border-b-2 border-primary-500'
                  : 'text-neutral-400 hover:text-neutral-300'
              }`}
            >
              {osName}
            </button>
          ))}
        </div>
      )}

      {/* Code Block */}
      <pre className='overflow-x-auto p-4 bg-neutral-950'>
        <code
          ref={codeRef}
          className={`language-${langToUse} text-sm leading-relaxed text-neutral-300`}
        >
          {codeToDisplay}
        </code>
      </pre>

      {/* Output (if code was executed) */}
      {output && (
        <div
          ref={outputRef}
          className='px-4 py-3 bg-neutral-900 border-t border-primary-500/20 text-sm font-mono text-emerald-400'
        >
          <div className='text-xs uppercase font-bold text-neutral-400 mb-2'>Output</div>
          <div className='whitespace-pre-wrap break-words'>{output}</div>
        </div>
      )}

      {/* CodeSandbox Embed (if provided) */}
      {codesandboxId && (
        <div className='p-4 border-t border-primary-500/20 bg-neutral-900/50'>
          <div className='text-xs text-neutral-400 mb-2'>Edit on CodeSandbox</div>
          <iframe
            src={`https://codesandbox.io/embed/${codesandboxId}?view=split&hidenavigation=1`}
            style={{
              width: '100%',
              height: '500px',
              border: '1px solid #333',
              borderRadius: '4px',
            }}
            title={title}
            allow="accelerated-video-decoding; camera '*'; microphone '*'; payment '*'; usb '*'; vr '*'; xr-spatial-tracking '*'; fullscreen '*'"
            sandbox='allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts'
          ></iframe>
        </div>
      )}

      {/* Description (if provided) */}
      {description && (
        <div className='px-4 py-3 bg-neutral-900/30 border-t border-primary-500/20 text-xs text-neutral-400 leading-relaxed'>
          {description}
        </div>
      )}
    </div>
  )
}

export default CodeBox
