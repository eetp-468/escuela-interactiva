[README.md](https://github.com/user-attachments/files/34038708/README.md)# Chatbot Gemini para Escuela Interactiva

Este paquete agrega un botón flotante de chat con una interfaz que usa la paleta azul del sitio. La API Key se lee en el servidor desde `.env`; nunca se envía al navegador.

## Antes de empezar

- Node.js 20 o posterior.
- Tu archivo `style.css` original y la carpeta `img/` de la web.
- Una API Key de Gemini creada en https://aistudio.google.com/apikey.

## Preparar el proyecto

1. Conservá una copia de seguridad de tu web actual.
2. Copiá tu `style.css` original dentro de `public/`.
3. Copiá la carpeta `img/` original dentro de `public/` (si la web la usa).
4. En la carpeta de este proyecto, duplicá `.env.example` y llamá a la copia `.env`.
5. Abrí `.env` y reemplazá `PEGAR_API_KEY_AQUI` por tu clave real. No compartas ese archivo ni lo subas a internet.
6. Abrí una terminal en esta carpeta y ejecutá:

   ```bash
   npm install
   npm start
   ```

7. Abrí http://localhost:3000 en tu navegador. No abras `index.html` haciendo doble clic: el chatbot necesita el servidor.

## Qué se cambió

- `public/index.html`: agrega el botón flotante, el panel del chat y los archivos CSS/JS nuevos.
- `public/chatbot.css`: diseño responsive del chat.
- `public/chatbot.js`: interfaz, historial temporal y petición a `/api/chat`.
- `server.js`: servidor backend que llama a Gemini y aplica límite básico de solicitudes.

El historial del chat se mantiene solo en memoria del navegador y no se guarda en una base de datos. La API puede tener límites de uso o cargos según tu cuenta y el modelo. Revisá el uso en Google AI Studio. Para publicar la web, desplegá el backend en un servicio compatible con Node y configurá `GEMINI_API_KEY` como secreto del entorno; no publiques `.env`.

