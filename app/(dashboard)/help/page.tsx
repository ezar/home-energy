import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plug, Key, Zap, ShieldCheck, Clock, TrendingUp, BarChart3, HelpCircle, RefreshCw } from 'lucide-react'

export default function AyudaPage() {
  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-10">
      <div>
        <h1 className="text-xl font-semibold mb-1 flex items-center gap-2">
          <HelpCircle size={20} className="text-blue-400" />
          Guía de uso
        </h1>
        <p className="text-sm text-muted-foreground">
          Todo lo que necesitas saber para configurar y sacar partido al dashboard.
        </p>
      </div>

      {/* --- Datadis --- */}
      <section className="space-y-4">
        <h2 className="text-base font-semibold border-b border-border pb-2">Conectar Datadis</h2>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Plug size={14} className="text-blue-400" />
              ¿Qué es Datadis?
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              Datadis (<span className="font-mono text-foreground">datadis.es</span>) es la plataforma
              oficial de las distribuidoras eléctricas españolas. Centraliza los datos de tu contador
              inteligente: consumo horario, maxímetro y datos de suministro.
            </p>
            <p>
              Para registrarte necesitas tu NIF y los datos de tu contrato de luz
              (CUPS o referencia de factura). La activación de la cuenta puede tardar 24–48 h.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Key size={14} className="text-yellow-400" />
              Añadir tus credenciales
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              Ve a <strong>Configuración</strong> e introduce tu NIF y contraseña de Datadis.
              Pulsa <em>Verificar conexión</em> para confirmar que son correctas.
              Si tienes varios puntos de suministro (CUPS), aparecerán listados y podrás
              seleccionar los que quieras monitorizar.
            </p>
            <p>
              Si tienes acceso autorizado al contador de otra persona (p. ej., un familiar),
              introduce su NIF en el campo <em>NIF autorizado</em>.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <ShieldCheck size={14} className="text-purple-400" />
              Seguridad de tus credenciales
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              Tu contraseña de Datadis se guarda <strong>cifrada</strong> en la base de datos
              con AES-256-GCM. Nunca se envía al navegador ni aparece en los logs.
              Todas las llamadas a la API de Datadis se realizan exclusivamente desde el servidor.
            </p>
          </CardContent>
        </Card>
      </section>

      {/* --- Sincronización --- */}
      <section className="space-y-4">
        <h2 className="text-base font-semibold border-b border-border pb-2">Sincronización de datos</h2>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <RefreshCw size={14} className="text-green-400" />
              ¿Cuándo se actualizan los datos?
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              La sincronización automática se ejecuta cada noche a las <strong>05:00</strong>.
              También puedes lanzarla manualmente desde la página de Configuración o con el botón
              de la barra superior.
            </p>
            <p>
              Datadis publica los datos con un <strong>retraso de hasta 2 días</strong>, por lo que
              los últimos registros disponibles suelen ser de anteayer.
            </p>
            <p>
              En la primera sincronización se importa hasta <strong>2 años</strong> de histórico.
            </p>
          </CardContent>
        </Card>
      </section>

      {/* --- Tarifas --- */}
      <section className="space-y-4">
        <h2 className="text-base font-semibold border-b border-border pb-2">Períodos tarifarios 2.0TD</h2>

        <Card>
          <CardContent className="pt-4 text-sm text-muted-foreground space-y-3">
            <p>
              La tarifa doméstica estándar en España (2.0TD) divide el día en tres períodos
              con diferente precio de la energía:
            </p>
            <div className="space-y-2">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 w-3 h-3 rounded-full flex-shrink-0" style={{ background: '#ef4444' }} />
                <div>
                  <span className="font-medium text-foreground">P1 — Punta</span>
                  <p className="text-xs mt-0.5">Lunes a viernes de 10:00 a 14:00 y de 18:00 a 22:00. Precio más caro.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="mt-0.5 w-3 h-3 rounded-full flex-shrink-0" style={{ background: '#f59e0b' }} />
                <div>
                  <span className="font-medium text-foreground">P2 — Llano</span>
                  <p className="text-xs mt-0.5">Lunes a viernes de 08:00 a 10:00, de 14:00 a 18:00 y de 22:00 a 00:00. Precio intermedio.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="mt-0.5 w-3 h-3 rounded-full flex-shrink-0" style={{ background: '#22c55e' }} />
                <div>
                  <span className="font-medium text-foreground">P3 — Valle</span>
                  <p className="text-xs mt-0.5">Noches (00:00–08:00), fines de semana y festivos nacionales. Precio más barato.</p>
                </div>
              </div>
            </div>
            <p className="text-xs pt-1">
              Los festivos nacionales se tratan como P3 en su totalidad.
              Si tienes tarifa PVPC, el precio varía hora a hora según el mercado.
            </p>
          </CardContent>
        </Card>
      </section>

      {/* --- Secciones del dashboard --- */}
      <section className="space-y-4">
        <h2 className="text-base font-semibold border-b border-border pb-2">Secciones del dashboard</h2>

        <div className="grid gap-3 sm:grid-cols-2">
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-sm flex items-center gap-2">
                <Zap size={14} className="text-yellow-400" />
                Resumen
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              Consumo del mes actual, coste estimado, precio PVPC en tiempo real y
              recomendaciones de las horas más baratas para electrodomésticos.
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart3 size={14} className="text-blue-400" />
                Consumo
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              Gráficas horarias, diarias y mensuales. Comparativa con la misma franja
              de las semanas anteriores y desglose por período P1/P2/P3.
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock size={14} className="text-orange-400" />
                Coste
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              Estimación de factura según tu tarifa configurada. Puedes simular
              distintos precios para comparar opciones comerciales.
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp size={14} className="text-sky-400" />
                PVPC
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              Comparativa entre tu consumo real y el precio de mercado (REData).
              Útil para evaluar si el PVPC te conviene o si sería mejor una tarifa fija.
            </CardContent>
          </Card>
        </div>
      </section>

      {/* --- FAQ --- */}
      <section className="space-y-4">
        <h2 className="text-base font-semibold border-b border-border pb-2">Preguntas frecuentes</h2>

        <div className="space-y-3 text-sm text-muted-foreground">
          <div>
            <p className="font-medium text-foreground mb-1">No aparecen datos tras sincronizar</p>
            <p>
              Comprueba que el CUPS está seleccionado en Configuración y que la cuenta de Datadis
              tiene historial disponible. Recuerda que los datos llegan con hasta 2 días de retraso.
            </p>
          </div>
          <div>
            <p className="font-medium text-foreground mb-1">¿Puedo añadir varios suministros?</p>
            <p>
              Sí. Si tu cuenta de Datadis tiene acceso a varios CUPS (p. ej., casa y garaje),
              aparecerán todos al verificar la conexión. Activa los que quieras monitorizar.
              Usa el selector de suministro en la parte superior del dashboard para cambiar entre ellos.
            </p>
          </div>
          <div>
            <p className="font-medium text-foreground mb-1">El precio estimado no coincide con mi factura</p>
            <p>
              El coste que muestra el dashboard es una <strong>estimación</strong> basada solo en la
              energía consumida. La factura real incluye además el término de potencia, impuestos
              (IVA, impuesto eléctrico) y otros cargos que dependen de tu comercializadora.
            </p>
          </div>
          <div>
            <p className="font-medium text-foreground mb-1">¿Cómo activo las notificaciones de precio?</p>
            <p>
              En Configuración → <em>Notificaciones de precio</em>, establece un umbral en €/kWh
              y activa las notificaciones push. El navegador pedirá permiso la primera vez.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
