'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react'
import type { ProfileRow } from '@/lib/supabase/types-helper'
import type { DatadisSupply } from '@/lib/types/datadis'

interface ConfigFormProps {
  profile: ProfileRow | null
}

export function ConfigForm({ profile }: ConfigFormProps) {
  const supabase = createClient()

  const [datadisUsername, setDatadisUsername] = useState(profile?.datadis_username ?? '')
  const [datadisPassword, setDatadisPassword] = useState('')
  const [authorizedNif, setAuthorizedNif] = useState(profile?.datadis_authorized_nif ?? '')
  const [cups, setCups] = useState(profile?.cups ?? '')
  const [distributorCode, setDistributorCode] = useState(profile?.distributor_code ?? '')
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '')

  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [testResult, setTestResult] = useState<{ ok: boolean; supplies?: DatadisSupply[]; error?: string } | null>(null)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaveMsg(null)

    const updates: Record<string, unknown> = {
      display_name: displayName || null,
      datadis_username: datadisUsername || null,
      datadis_authorized_nif: authorizedNif || null,
      cups: cups || null,
      distributor_code: distributorCode || null,
    }

    // Solo sobreescribir contraseña si se ha escrito algo nuevo
    // TODO en producción: cifrar con Supabase Vault antes de persistir
    if (datadisPassword) {
      updates.datadis_password_encrypted = datadisPassword
    }

    
    const { error } = await (supabase as any)
      .from('profiles')
      .update(updates)
      .eq('id', profile?.id ?? '')

    if (error) {
      setSaveMsg({ ok: false, text: (error as { message: string }).message })
    } else {
      setSaveMsg({ ok: true, text: 'Configuración guardada' })
      setDatadisPassword('')
    }

    setSaving(false)
  }

  async function handleTestConnection() {
    setTesting(true)
    setTestResult(null)

    try {
      const res = await fetch('/api/datadis/supplies')
      const data = await res.json()

      if (!res.ok) {
        setTestResult({ ok: false, error: data.error ?? 'Error de conexión' })
      } else {
        setTestResult({ ok: true, supplies: data.supplies ?? [] })
      }
    } catch {
      setTestResult({ ok: false, error: 'Error de red' })
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Perfil</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="displayName">Nombre</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Tu nombre"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Credenciales Datadis</CardTitle>
          <CardDescription className="flex items-center gap-1 text-xs">
            <ShieldCheck className="h-3 w-3" />
            Las credenciales se procesan únicamente en el servidor
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="datadisUsername">NIF / Usuario Datadis</Label>
              <Input
                id="datadisUsername"
                value={datadisUsername}
                onChange={(e) => setDatadisUsername(e.target.value)}
                placeholder="12345678A"
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="datadisPassword">
                Contraseña Datadis
                {profile?.datadis_password_encrypted && (
                  <span className="text-muted-foreground font-normal ml-2">(guardada)</span>
                )}
              </Label>
              <Input
                id="datadisPassword"
                type="password"
                value={datadisPassword}
                onChange={(e) => setDatadisPassword(e.target.value)}
                placeholder={profile?.datadis_password_encrypted ? '••••••••' : 'Nueva contraseña'}
                autoComplete="new-password"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="authorizedNif">NIF autorizado (opcional)</Label>
            <Input
              id="authorizedNif"
              value={authorizedNif}
              onChange={(e) => setAuthorizedNif(e.target.value)}
              placeholder="Solo si no eres el titular del contrato"
              autoComplete="off"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Suministro</CardTitle>
          <CardDescription className="text-xs">CUPS y distribuidora del contador principal</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cups">CUPS</Label>
              <Input
                id="cups"
                value={cups}
                onChange={(e) => setCups(e.target.value)}
                placeholder="ES0021000XXXXXXXXX"
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="distributorCode">Código distribuidora</Label>
              <Input
                id="distributorCode"
                value={distributorCode}
                onChange={(e) => setDistributorCode(e.target.value)}
                placeholder="8 (IDE), 2 (e-distribución)..."
              />
            </div>
          </div>

          <div className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleTestConnection}
              disabled={testing || !datadisUsername}
            >
              {testing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Verificar credenciales
            </Button>

            {testResult && (
              <div className="mt-3">
                {testResult.ok ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-green-400">
                      <CheckCircle2 className="h-4 w-4" />
                      Conexión correcta — {testResult.supplies?.length ?? 0} suministro(s)
                    </div>
                    {testResult.supplies && testResult.supplies.length > 0 && (
                      <div className="space-y-2 mt-2">
                        {testResult.supplies.map((s) => (
                          <div key={s.cups} className="text-xs p-3 rounded-md bg-muted space-y-1">
                            <div className="font-mono font-medium">{s.cups}</div>
                            <div className="text-muted-foreground">{s.address}</div>
                            <div className="flex gap-2">
                              <Badge variant="outline" className="text-xs">Dist. {s.distributorCode}</Badge>
                              <Badge variant="outline" className="text-xs">Punto {s.pointType}</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    {testResult.error}
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSave} className="flex items-center gap-3">
        <Button type="submit" disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Guardar configuración
        </Button>
        {saveMsg && (
          <span className={`text-sm ${saveMsg.ok ? 'text-green-400' : 'text-destructive'}`}>
            {saveMsg.text}
          </span>
        )}
      </form>
    </div>
  )
}
