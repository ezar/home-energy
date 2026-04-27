'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Zap, ShieldCheck, Key, Plug, HelpCircle } from 'lucide-react'
import Link from 'next/link'

export default function BienvenidaPage() {
  const router = useRouter()

  async function handleContinue() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('id', user.id)
    }
    router.push('/configuracion')
  }

  return (
    <div className="max-w-2xl mx-auto py-10 px-4 space-y-8">
      {/* Cabecera */}
      <div className="text-center space-y-3">
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,rgba(245,158,11,0.25),rgba(249,115,22,0.12))', border: '1px solid rgba(245,158,11,0.3)' }}>
            <Zap size={28} color="#f59e0b" fill="rgba(245,158,11,0.2)" />
          </div>
        </div>
        <h1 className="text-2xl font-semibold">¡Bienvenido a Energy Dashboard!</h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Para empezar a ver tu consumo eléctrico necesitas conectar tu cuenta de <strong>Datadis</strong>,
          la plataforma oficial de las distribuidoras eléctricas españolas.
        </p>
      </div>

      {/* Pasos */}
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Plug size={16} className="text-blue-400" />
              Paso 1 — Crear cuenta en Datadis
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              Si aún no tienes cuenta, regístrate en{' '}
              <span className="font-mono text-foreground">datadis.es</span> con tu NIF y los datos
              del contrato de luz. La validación suele tardar 24–48 h.
            </p>
            <p>
              Si ya tienes cuenta activa, pasa directamente al paso 2.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Key size={16} className="text-yellow-400" />
              Paso 2 — Introducir tus credenciales aquí
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              En la página de <strong>Configuración</strong> introduce tu NIF y contraseña de Datadis.
              Tu contraseña se guarda <strong>cifrada</strong> en la base de datos y nunca se envía
              al navegador.
            </p>
            <p>
              Después pulsa <em>Verificar conexión</em> para comprobar que todo funciona
              y selecciona tu punto de suministro (CUPS).
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap size={16} className="text-green-400" />
              Paso 3 — Sincronizar datos
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              Usa el botón <em>Sincronizar</em> para importar hasta 2 años de histórico.
              A partir de entonces la sincronización se ejecuta automáticamente cada noche a las 05:00.
            </p>
            <p className="text-xs">
              Datadis publica los datos con un retraso de hasta 2 días.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck size={16} className="text-purple-400" />
              Privacidad y seguridad
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>
              Tus credenciales de Datadis nunca salen del servidor. Las llamadas a la API de
              Datadis se realizan siempre desde el backend, no desde el navegador.
              Tu contraseña se almacena cifrada con AES-256-GCM.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Acciones */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <Button className="flex-1" onClick={handleContinue}>
          Ir a Configuración
        </Button>
        <Button variant="outline" className="flex-1" asChild>
          <Link href="/ayuda">
            <HelpCircle size={15} className="mr-2" />
            Ver guía completa
          </Link>
        </Button>
      </div>
    </div>
  )
}
