'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RefreshCw, CheckCircle2, AlertCircle, Clock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import type { SyncResult } from '@/lib/types/consumption'

interface SyncStatusProps {
  lastSyncAt: string | null
}

export function SyncStatus({ lastSyncAt }: SyncStatusProps) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<SyncResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSync() {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch('/api/datadis/sync', { method: 'POST' })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Error durante la sincronización')
      } else {
        setResult(data as SyncResult)
      }
    } catch {
      setError('Error de red al sincronizar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Clock className="h-4 w-4" />
        {lastSyncAt ? (
          <span>
            Última sync:{' '}
            {formatDistanceToNow(new Date(lastSyncAt), { addSuffix: true, locale: es })}
          </span>
        ) : (
          <span>Sin sincronizar</span>
        )}
      </div>

      <Button
        size="sm"
        variant="outline"
        onClick={handleSync}
        disabled={loading}
      >
        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
        {loading ? 'Sincronizando...' : 'Sincronizar ahora'}
      </Button>

      {result && (
        <Badge variant="secondary" className="gap-1">
          <CheckCircle2 className="h-3 w-3 text-green-400" />
          {result.synced} registros
        </Badge>
      )}
      {error && (
        <Badge variant="destructive" className="gap-1">
          <AlertCircle className="h-3 w-3" />
          {error}
        </Badge>
      )}
    </div>
  )
}
