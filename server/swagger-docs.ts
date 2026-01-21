/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Registrar novo usuário
 *     description: Cria um novo usuário no sistema com username e senha
 *     tags: [Autenticação]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 100
 *                 description: Nome de usuário único
 *                 example: "joao.silva"
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 description: Senha do usuário (mínimo 6 caracteres)
 *                 example: "senha123"
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email do usuário (opcional)
 *                 example: "joao@email.com"
 *               firstName:
 *                 type: string
 *                 description: Nome do usuário
 *                 example: "João"
 *               lastName:
 *                 type: string
 *                 description: Sobrenome do usuário
 *                 example: "Silva"
 *               role:
 *                 type: string
 *                 enum: [admin, operador, visualizador, motorista, portaria]
 *                 description: Função do usuário no sistema
 *                 example: "operador"
 *     responses:
 *       201:
 *         description: Usuário criado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Usuário criado com sucesso"
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Dados inválidos ou username/email já em uso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               usernameInUse:
 *                 value:
 *                   message: "Username já está em uso"
 *               emailInUse:
 *                 value:
 *                   message: "Email já está em uso"
 */

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Realizar login
 *     description: |
 *       Autentica o usuário com username e senha, retornando tokens JWT.
 *       
 *       - **accessToken**: Token de acesso com validade de 15 minutos
 *       - **refreshToken**: Token de renovação com validade de 7 dias
 *       
 *       Use o accessToken no header Authorization: Bearer {token}
 *     tags: [Autenticação]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 description: Nome de usuário
 *                 example: "joao.silva"
 *               password:
 *                 type: string
 *                 description: Senha do usuário
 *                 example: "senha123"
 *     responses:
 *       200:
 *         description: Login realizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Login realizado com sucesso"
 *                 accessToken:
 *                   type: string
 *                   description: Token JWT de acesso (15 min)
 *                   example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                 refreshToken:
 *                   type: string
 *                   description: Token JWT de renovação (7 dias)
 *                   example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Credenciais inválidas
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               message: "Credenciais inválidas"
 */

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Renovar tokens
 *     description: |
 *       Renova o accessToken usando o refreshToken.
 *       Use quando o accessToken expirar (erro 401).
 *     tags: [Autenticação]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: Token de renovação obtido no login
 *                 example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *     responses:
 *       200:
 *         description: Tokens renovados com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                   description: Novo token de acesso
 *                 refreshToken:
 *                   type: string
 *                   description: Novo token de renovação
 *       401:
 *         description: Refresh token inválido ou expirado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Realizar logout
 *     description: Invalida o refresh token do usuário, forçando novo login
 *     tags: [Autenticação]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout realizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Logout realizado com sucesso"
 */

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Obter usuário autenticado
 *     description: Retorna as informações do usuário atualmente autenticado
 *     tags: [Autenticação]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dados do usuário autenticado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Não autenticado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /collects:
 *   post:
 *     summary: Criar uma nova coleta
 *     description: |
 *       Cria uma nova coleta de veículo. Ao criar a coleta:
 *       - Um veículo é criado automaticamente com status "pré-estoque" se não existir
 *       - A coleta é criada com status "em_trânsito"
 *     tags: [Coletas]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateCollect'
 *           example:
 *             vehicleChassi: "9BWZZZ377VT004251"
 *             manufacturerId: "380b776b-dd38-4714-9148-459ac9f2c876"
 *             yardId: "65981fdf-ceba-44b2-a046-63045b162de9"
 *             driverId: "64d72138-55b7-4b4e-a4f6-3c41f4d09bf1"
 *             collectDate: "2026-01-11T10:30:00"
 *             notes: "Veículo com documentação completa"
 *     responses:
 *       201:
 *         description: Coleta criada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Collect'
 *       400:
 *         description: Dados inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Não autenticado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /collects/{id}:
 *   patch:
 *     summary: Atualizar coleta (Check-in / Check-out)
 *     description: |
 *       Atualiza os dados de uma coleta existente. Este endpoint é utilizado para:
 *       
 *       **Check-in:** Registra a retirada do veículo na montadora
 *       - Enviar campos checkinDateTime, checkinLatitude, checkinLongitude, checkinSelfiePhoto, etc.
 *       
 *       **Check-out:** Registra a entrega do veículo no pátio
 *       - Enviar campos checkoutDateTime, checkoutLatitude, checkoutLongitude, checkoutSelfiePhoto, etc.
 *       - Ao realizar check-out, o veículo é atualizado para status "em_estoque" e a coleta para "finalizada"
 *     tags: [Coletas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID da coleta
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             oneOf:
 *               - $ref: '#/components/schemas/CheckinData'
 *               - $ref: '#/components/schemas/CheckoutData'
 *           examples:
 *             checkin:
 *               summary: Exemplo de Check-in
 *               value:
 *                 checkinDateTime: "2026-01-11T10:30:00Z"
 *                 checkinLatitude: "-23.550520"
 *                 checkinLongitude: "-46.633308"
 *                 checkinSelfiePhoto: "https://storage.example.com/photos/selfie123.jpg"
 *                 checkinBodyPhotos: ["https://storage.example.com/photos/body1.jpg"]
 *                 checkinOdometerPhoto: "https://storage.example.com/photos/odometer.jpg"
 *                 checkinDamagePhotos: []
 *                 checkinNotes: "Veículo em bom estado"
 *             checkout:
 *               summary: Exemplo de Check-out
 *               value:
 *                 checkoutDateTime: "2026-01-11T14:45:00Z"
 *                 checkoutLatitude: "-23.520000"
 *                 checkoutLongitude: "-46.600000"
 *                 checkoutSelfiePhoto: "https://storage.example.com/photos/selfie456.jpg"
 *                 checkoutBodyPhotos: ["https://storage.example.com/photos/body3.jpg"]
 *                 checkoutOdometerPhoto: "https://storage.example.com/photos/odometer2.jpg"
 *                 checkoutDamagePhotos: []
 *                 checkoutNotes: "Entrega realizada"
 *     responses:
 *       200:
 *         description: Coleta atualizada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Collect'
 *       401:
 *         description: Não autenticado
 *       404:
 *         description: Coleta não encontrada
 */

/**
 * @swagger
 * /collects:
 *   get:
 *     summary: Listar todas as coletas
 *     description: Retorna a lista de todas as coletas cadastradas no sistema
 *     tags: [Coletas]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de coletas
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Collect'
 *       401:
 *         description: Não autenticado
 */

/**
 * @swagger
 * /collects/{id}:
 *   get:
 *     summary: Obter coleta por ID
 *     description: Retorna os detalhes de uma coleta específica
 *     tags: [Coletas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID da coleta
 *     responses:
 *       200:
 *         description: Detalhes da coleta
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Collect'
 *       401:
 *         description: Não autenticado
 *       404:
 *         description: Coleta não encontrada
 */

/**
 * @swagger
 * /portaria/authorize/{id}:
 *   post:
 *     summary: Autorizar entrada de veículo na portaria
 *     description: |
 *       Autoriza a entrada de um veículo no pátio através da portaria.
 *       Esta operação realiza automaticamente o check-out da coleta.
 *     tags: [Coletas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID da coleta a ser autorizada
 *     responses:
 *       200:
 *         description: Entrada autorizada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Collect'
 *       401:
 *         description: Não autenticado
 *       404:
 *         description: Coleta não encontrada
 */
