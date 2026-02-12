# Guía de Conexión: TTS App -> Sonic Boom

Esta guía te explica cómo conectar tu aplicación TTS (alojada en `fly.dev`) con tu Sonic Boom local para controlar la música.

## 1. Iniciar Sonic Boom

Primero, asegúrate de que tu Sonic Boom esté corriendo en tu computadora. Necesitas iniciar tanto el **Frontend** (la web que ves) como el **Backend** (el servidor que recibe las órdenes).

Abre dos terminales en la carpeta del proyecto:

**Terminal 1 (Backend/API):**
```bash
# Inicia el servidor de control remoto en el puerto 3001
npm run server
```

**Terminal 2 (Frontend/App):**
```bash
# Inicia la aplicación web normal
npm run dev
```

Ahora deberías poder entrar a `http://localhost:5173` y ver tu Sonic Boom funcionando.

---

## 2. Exponer Sonic Boom a Internet (ngrok)

Como tu app TTS está en internet (`fly.dev`) y tu Sonic Boom está en tu casa (`localhost`), no se pueden ver directamente. Necesitas un túnel seguro. Usaremos **ngrok** (es gratis y fácil).

1.  Descarga e instala [ngrok](https://ngrok.com/download).
2.  Abre una nueva terminal y ejecuta:

```bash
ngrok http 3001
```

Esto te dará una URL pública, algo como `https://a1b2-c3d4.ngrok-free.app`. **Copia esta URL**, es la dirección pública de tu Sonic Boom.

---

## 3. Configurar tu App TTS

Ahora tienes que decirle a tu app TTS que envíe las órdenes a esa URL de ngrok.

Tu app TTS debe hacer una petición **HTTP POST** a la dirección de ngrok seguida de `/api/play`.

### Ejemplo de código (JavaScript / Node.js) para tu TTS:

Si tu TTS es una web app o usa Node.js, usa este código cuando quieras poner música:

```javascript
// La URL que te dio ngrok + /api/play
const SONIC_BOOM_URL = "https://tu-url-de-ngrok.ngrok-free.app/api/play";

async function ponerMusica(cancion) {
  try {
    const respuesta = await fetch(SONIC_BOOM_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        query: cancion // El nombre de la canción que leyó el TTS
      })
    });

    const datos = await respuesta.json();
    console.log("Sonic Boom dice:", datos.message);

  } catch (error) {
    console.error("Error al conectar con Sonic Boom:", error);
  }
}

// Ejemplo de uso:
ponerMusica("Despacito");
```

### Otros Comandos Disponibles

Además de `/api/play`, puedes usar:

-   **Pausar/Reanudar:** `POST /api/pause`
-   **Siguiente Canción:** `POST /api/next`
-   **Canción Anterior:** `POST /api/prev`
-   **Añadir a la Cola:** `POST /api/queue` (enviando `{ "query": "nombre" }`)

---

## Opción Alternativa: TikTok Live Directo

Si prefieres no usar tu app TTS como intermediaria y quieres que Sonic Boom lea el chat de TikTok directamente:

1.  Detén el servidor de la Terminal 1.
2.  Inícialo con tu usuario de TikTok:

```bash
# Reemplaza 'usuario_tiktok' con tu nombre de usuario real (sin @)
TIKTOK_USER=usuario_tiktok npm run server
```

Ahora Sonic Boom escuchará automáticamente comandos en el chat de tu live:
-   `!play Cancion`
-   `!skip` o `!next`
-   `!pause`
