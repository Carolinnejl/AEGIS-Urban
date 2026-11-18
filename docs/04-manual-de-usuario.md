# AEGIS Urban — Manual de usuario

La misma guía está dentro de la aplicación, en **Ayuda** (`/ayuda`), en español e inglés, con ayudas contextuales (ⓘ) en las pantallas que lo necesitan.

> **En una emergencia real** llamá al **911** (policía), **100** (bomberos) o **103** (Defensa Civil). AEGIS Urban es un prototipo y no reemplaza a los organismos oficiales.

## Idioma

Con el selector **ES / EN** de la esquina superior cambia todo el texto de la interfaz. La elección se recuerda en ese navegador.

## Ciudadanía

1. En la pantalla de ingreso, abrí **«Ver como ciudadano»**: no hace falta cuenta.
2. Mirá el **clima actual** y los **avisos**. Cada aviso dice si es **REAL** (clima de Open-Meteo) o **SIMULADO** (sensores de demostración).
3. Si querés alertas por ubicación, tocá **«Permitir ubicación»**. Tu posición se usa solo para calcular la distancia a las zonas de riesgo y no se guarda. Podés revocarlo cuando quieras.
4. Si estás dentro de una zona de peligro vas a ver un **cartel rojo** que indica hacia dónde alejarte. El **modo prueba** simula tu posición para ver el cartel sin moverte.
5. **Crear cuenta:** completá los datos, aceptá los términos y verificá tu correo y tu celular con los códigos de 6 dígitos. En esta versión el SMS es simulado: el código aparece en pantalla.
6. **Mis datos:** *Descargar mis datos* (Ley 25.326) y *Dar de baja mi cuenta*.

## Operación y tránsito

1. Ingresá con tu usuario y contraseña.
2. En el **Panel** mirá el resumen de sensores y alertas.
3. En el **Mapa** ubicá los sensores por zona.
4. En **Alertas** filtrá por severidad, zona, estado o fecha.

## Defensa Civil

1. **Reconocé** la alerta antes de iniciar una evacuación.
2. **Iniciá la evacuación:** el sistema elige la estrategia (zonal, masiva o refugio en el lugar) según la severidad y el tipo, y centra el plan en la ubicación real del sensor. El plan muestra radio afectado, personas estimadas (con una densidad de referencia, no datos del censo), puntos de reunión e instrucciones.
3. En **Simulación** creá ejercicios con sensores simulados, intensidad y duración, y detenelos cuando quieras.
4. **Resolvé** la alerta cuando termina la emergencia.

## Auditoría

1. **Administración → Bitácora** muestra las acciones registradas.
2. **Verificar integridad** recalcula DVH (huella por fila) y DVV (cadena entre filas). Si alguien alteró la bitácora, indica la fila.
3. El acceso es de solo lectura: no se puede cambiar el estado de las alertas.

## Administración

1. **Usuarios y Familias:** revisá quién tiene acceso y con qué rol.
2. **Respaldos:** *Crear respaldo ahora*; hacé el **simulacro de restauración** con regularidad (restaura en una base temporal y verifica la integridad sin tocar la base en uso).
3. **Restaurar** reemplaza los datos actuales: pide una confirmación escrita y antes crea un respaldo de seguridad.
4. Cada 24 h se crea un respaldo automático y se conservan los últimos 7. Detalle técnico: [operación de la base de datos](06-base-de-datos.md).

## Problemas frecuentes

| Problema | Qué hacer |
|---|---|
| No llegó el código | Revisá spam y esperá 30 s para pedir otro. Cada código vence a los 10 minutos y permite 5 intentos |
| «Demasiados intentos de inicio de sesión» | Esperá 15 minutos (límite de 10 intentos) |
| No veo un botón | Tu familia no tiene esa patente; pedíselo a un administrador |
