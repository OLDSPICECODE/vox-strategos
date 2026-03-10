# Usa una imagen ligera de Node
FROM node:20-alpine

# Crear directorio de trabajo
WORKDIR /app

# Configuración para evitar errores de conexión con npm
RUN npm config set registry https://registry.npmjs.org/

# Instalar dependencias primero (para aprovechar el caché de Docker)
COPY package*.json ./
RUN npm install

# Copiar el resto del código fuente
COPY . .

# Exponer el puerto que usa tu API de Node/Express
EXPOSE 3000

# Comando para iniciar el servidor
# Asegúrate de tener un script "start" en tu package.json
CMD ["npm", "start"]