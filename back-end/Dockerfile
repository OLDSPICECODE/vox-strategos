# Usa una versión de Node.js ligera
FROM node:20-alpine

# Crear directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias (incluyendo las necesarias para NestJS o Express)
RUN npm install

# Copiar el resto del código del backend
COPY . .

# Si usas NestJS o TypeScript, descomenta la siguiente línea para compilar:
# RUN npm run build

# Exponer el puerto que usa tu API
EXPOSE 3000

# Comando para arrancar el servidor
# Si usas NestJS en prod suele ser: CMD ["node", "dist/main"]
# Si usas Node directo: CMD ["node", "index.js"] o ["npm", "start"]
CMD ["npm", "start"]