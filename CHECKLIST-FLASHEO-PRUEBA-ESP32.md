# CHECKLIST ESP32: FLASH + SERIAL + BOTON SINCRONIZAR

Objetivo: confirmar en hardware real que la sincronizacion funciona de punta a punta sin afectar el boton "Sincronizar".

## 1) Precondiciones

- [ ] ESP32 conectado por USB al PC.
- [ ] Arduino IDE instalado con soporte ESP32.
- [ ] App movil BioSense instalada y con sesion iniciada.
- [ ] Bluetooth y ubicacion activados en el movil.
- [ ] Red WiFi 2.4GHz disponible (SSID y password correctos).
- [ ] Backend accesible (entorno productivo o staging operativo).

## 2) Verificacion rapida del codigo antes de flashear

Archivo: hardware/esp32_biosense/biosense_esp32_SECURE.ino

- [ ] Existe header Authorization Bearer:
  - `http.addHeader("Authorization", authHeader);`
- [ ] `authHeader` se construye como Bearer:
  - `String authHeader = "Bearer " + apiSecret;`
- [ ] Payload BLE esperado por firmware:
  - `SSID,PASSWORD,API_SECRET`

## 3) Flasheo en Arduino IDE

1. Abrir Arduino IDE.
2. Abrir archivo:
   - `hardware/esp32_biosense/biosense_esp32_SECURE.ino`
3. Configurar:
   - Board: ESP32 Dev Module
   - Port: COM correcto del ESP32
   - Upload Speed: 115200 (estable) o 921600 (rapido)
   - Flash Size: 4MB
   - Partition Scheme: Huge APP (3MB No OTA)
4. Compilar (Verify).
5. Subir (Upload).

Criterio de OK:
- [ ] Upload termina sin error.
- [ ] Mensaje final tipo "Hard resetting via RTS pin..." o equivalente.

## 4) Verificacion por Serial Monitor

1. Abrir Serial Monitor a 115200 baud.
2. Reiniciar placa si hace falta.

Esperado en arranque:
- [ ] Se muestran logs de inicializacion.
- [ ] Se imprime MAC del dispositivo.

Camino A (sin credenciales guardadas):
- [ ] Mensaje indicando modo BLE/sincronizacion.
- [ ] Anuncio BLE visible como `BioSense-XX:XX`.

Camino B (con credenciales guardadas):
- [ ] Conecta a WiFi y muestra IP.
- [ ] Luego comienza ciclo de lectura cada 10s.

Durante envio al backend (cada 10s):
- [ ] Log de envio de datos.
- [ ] `Respuesta HTTP: 200` (o 201).

Criterio de FALLA:
- [ ] `Respuesta HTTP: 401` (token/secret invalido).
- [ ] `Respuesta HTTP: 403` (dispositivo no vinculado o auth no valida).
- [ ] `Respuesta HTTP: -1` (error de conexion/red).

## 5) Prueba del boton "Sincronizar" (flujo completo)

1. En la app: ir a Perfil > Sincronizar.
2. Escanear BLE.
3. Seleccionar dispositivo `BioSense-XX:XX`.
4. Ingresar nombre de dispositivo, SSID y password.
5. Tocar "Vincular" / "Sincronizar".
6. Esperar confirmacion y reinicio automatico del ESP32.

Validaciones obligatorias:
- [ ] App no muestra error de vinculacion.
- [ ] ESP32 recibe payload BLE (SSID,PASSWORD,API_SECRET).
- [ ] ESP32 guarda credenciales y reinicia.
- [ ] ESP32 conecta WiFi.
- [ ] En <= 30-60s, aparecen lecturas en dashboard.
- [ ] Serial muestra HTTP 200/201 en envios periodicos.

## 6) Confirmacion backend + app

Backend (logs):
- [ ] Hay eventos de ingestion exitosos.
- [ ] No hay errores repetidos 401/403 para ese dispositivo.

App (dashboard):
- [ ] Dispositivo en estado conectado/activo.
- [ ] Timestamp de lectura reciente.
- [ ] Valores de sensores actualizan periodicamente.

## 7) Matriz de diagnostico rapido

- Si BLE no aparece:
  - Revisar alimentacion USB, reiniciar ESP32, confirmar Bluetooth ON.
- Si vincula pero no envia:
  - Revisar WiFi 2.4GHz, SSID/password, RSSI.
- Si envia pero da 401:
  - Repetir sincronizacion para refrescar apiSecret en dispositivo.
- Si envia pero da 403:
  - Verificar dispositivo vinculado al usuario correcto en backend.
- Si da -1:
  - Revisar internet/salida HTTPS y host de backend.

## 8) Criterio de aprobacion final (GO / NO-GO)

GO (aprobado 100%):
- [ ] Flasheo correcto
- [ ] BLE sincroniza correctamente
- [ ] WiFi conecta
- [ ] HTTP 200/201 sostenido por al menos 3 ciclos consecutivos
- [ ] Dashboard muestra lecturas actualizadas
- [ ] Boton "Sincronizar" funciona sin regresiones

NO-GO (bloquear despliegue):
- [ ] Fallo en cualquiera de los puntos GO

## 9) Evidencia minima a guardar

- [ ] Foto/captura de Arduino IDE con upload exitoso.
- [ ] Captura de Serial Monitor con al menos 3 respuestas HTTP 200/201.
- [ ] Captura de app dashboard con lectura reciente.
- [ ] Hora de prueba, MAC del dispositivo y usuario de prueba.
