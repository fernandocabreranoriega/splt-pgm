# splt-pgm (Split Program) · prototipo experimental

Enviar un mismo texto a ventanas de aplicaciones diferentes en **GNOME Shell 50
sobre Wayland**. Licencia MIT. Proyecto local, todavía no publicado.

## Qué hace esta versión

Seleccionas entre dos y cuatro ventanas del espacio de trabajo activo, escribes
una línea en el menú de splt-pgm y pulsas Enviar. La extensión activa cada
ventana, comprueba el foco y simula su secuencia de teclas. **El envío es
secuencial por lotes: todavía no duplica en vivo lo que escribes directamente
en otra aplicación.** Es una prueba del mecanismo de entrega.

No necesita root, servicios de teclado ni modificar Mutter. No usa el
portapapeles, red o archivos para guardar el texto. El borrador permanece en
memoria mientras la extensión está activa. No hay captura global del teclado.

## Instalar en Arch

Construye el paquete con Python 3 (sin dependencias adicionales):

```bash
cd /data/fcn/projects-fer/splt-pgm
python3 tools/package.py
gnome-extensions install dist/splt-pgm@local.community.shell-extension.zip
```

Cierra sesión y vuelve a entrar para que GNOME descubra la extensión. Luego:

```bash
gnome-extensions enable splt-pgm@local.community
```

Si ya tienes una versión instalada, desactívala, instala con
`gnome-extensions install --force ...`, cierra sesión y vuelve a entrar antes
de habilitarla. No hace falta desactivar la validación de versiones.

## Primera prueba

1. Abre dos documentos de prueba, por ejemplo en un editor y LibreOffice Writer,
   en el mismo espacio de trabajo. Mantén ambas ventanas sin minimizar.
2. En cada una, haz clic en el campo donde debe aparecer el texto.
3. Abre **⇉** en la barra superior y marca ambas ventanas.
4. Escribe `Hola 123` en el cuadro común y pulsa **Enviar texto**.
5. No escribas ni cambies de ventana durante el envío. Comprueba manualmente el
   contenido de ambos documentos; la notificación solo confirma la secuencia
   enviada, no la recepción por la aplicación.

Para interrumpir, abre el menú y pulsa **Detener envío**. Un cambio de foco
detectado, un diálogo de Shell, teclas modificadoras pulsadas, bloqueo de sesión
o el cierre de una ventana detienen el envío. Puede quedar texto parcial; no se
reintenta ni deshace automáticamente. Para desactivar:

```bash
gnome-extensions disable splt-pgm@local.community
```

## Límites conocidos

- Solo una línea y hasta 256 caracteres. No se envían Enter ni Tab, tampoco
  retroceso, atajos, formato, ratón o cambios de selección.
- No identifica el campo interno de la aplicación. El cursor debe estar colocado
  antes de enviar. Un cambio de campo dentro de la misma ventana no se detecta.
- Se activa una ventana después de otra y el foco queda en el último destino.
- La entrega depende del mapa de teclado, modificadores de bloqueo e IME. Acentos,
  caracteres fuera del mapa y emoji necesitan pruebas reales; no se garantiza su
  recepción aunque puedan convertirse a keysyms.
- Los eventos se procesan de forma asíncrona: comprobar el foco reduce errores,
  pero no garantiza que un evento ya encolado no se entregue tras otro cambio.
- La primera prueba debe hacerse con documentos vacíos de prueba y campos de
  texto ordinarios. No hay detección de contraseñas o del significado de un campo.
- No hay compatibilidad universal confirmada con LibreOffice, VS Code,
  navegadores, Electron o aplicaciones XWayland.
- Declara únicamente GNOME 50. Otras versiones requieren revisión y pruebas.

## Desarrollo y validación

```bash
node --test tests/core.test.js
node --check extension/extension.js
python3 tools/package.py
```

Las pruebas unitarias verifican secuencias Unicode, validación previa de destinos,
cancelación, cambio de foco y exclusión de envíos concurrentes. Usan un backend
simulado; no prueban recepción en aplicaciones.

Prueba de integración en una sesión desechable (requiere las herramientas de
desarrollo de GNOME y un entorno que permita iniciar un compositor):

```bash
GTK_A11Y=none NO_AT_BRIDGE=1 dbus-run-session -- \
  gnome-shell-test-tool --headless --disable-animations \
  --extra-filter org.community.SpltPgm.TestA \
  --extra-filter org.community.SpltPgm.TestB \
  --extension "$PWD/dist/splt-pgm@local.community.shell-extension.zip" \
  "$PWD/tests/shell-smoke.js"
```

Esto instala la extensión en directorios temporales y crea su propio compositor;
no habilita la extensión en la sesión habitual. El smoke test comprueba carga,
menú, activación de destinos, recepción exacta de `Hola 123` en dos procesos
separados (GTK3 y GTK4) y limpieza. Requiere los bindings de GTK3 y GTK4 para GJS.
Los fallos del entorno D-Bus o de los clientes de prueba se deben distinguir de
un fallo de la extensión.

Resultado inicial, 16 de octubre de 2026: seis pruebas unitarias aprobadas y
smoke test aprobado en GNOME Shell/Mutter 50.3. La sesión aislada emitió avisos
de servicios auxiliares y una aserción de Mutter sobre orden de ventanas, sin
impedir la recepción exacta del texto ni la salida con código 0. Todavía no hay
prueba manual en LibreOffice o VS Code, ni prueba de entrada Unicode real.

Para diagnosticar una instalación normal:

```bash
gnome-extensions info splt-pgm@local.community
journalctl --user -b -o cat
```

Al reportar un problema incluye versión de GNOME, distribución, aplicación y
versión, mapa de teclado, pasos y resultado. Reproduce con texto de ejemplo y
revisa los registros antes de compartirlos.

## Camino hacia escritura compartida en vivo

1. Confirmar entrega exacta entre aplicaciones distintas y mapas de teclado.
2. Añadir un compositor de texto persistente con entrega de cambios ordenada;
   estudiar qué ocurre con IME, selecciones y retroceso.
3. Investigar una integración con Mutter para duplicar entrada sin alternar foco.
   No hay un backend de duplicación directa implementado en esta versión.
4. Añadir preferencias, traducciones, pruebas de accesibilidad y empaquetado de
   distribución tras comprobar los resultados.

## Compartir y contribuir

El código y la licencia están listos para alojarse en un repositorio. Antes de
una publicación, elige una identidad/UUID permanente y registra las pruebas
reales de compatibilidad. El UUID actual es provisional. El ZIP de `dist/` es
instalable; no equivale a una aprobación de extensions.gnome.org ni a un paquete
de los repositorios de Arch.

Las contribuciones deberían incluir una reproducción con ventanas de prueba y
explicar qué sucede con pérdida de foco, cancelación y desactivación. No registrar
el texto del usuario ni introducir captura global sin diseñar antes su alcance.

Referencias: [extensiones de GNOME](https://gjs.guide/extensions/),
[portar a GNOME 50](https://gjs.guide/extensions/upgrading/gnome-shell-50.html),
[Meta.Window.activate](https://mutter.gnome.org/meta/method.Window.activate.html),
[Clutter.VirtualInputDevice](https://mutter.gnome.org/clutter/class.VirtualInputDevice.html).
