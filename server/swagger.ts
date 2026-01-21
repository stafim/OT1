import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import type { Express } from "express";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "API de Logística de Veículos",
      version: "1.0.0",
      description: "API REST para gerenciamento de logística de veículos - Coletas, Check-in, Check-out e Autenticação",
      contact: {
        name: "Suporte",
      },
    },
    servers: [
      {
        url: "/api",
        description: "Servidor de desenvolvimento",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Token JWT de acesso. Obtenha através do endpoint /auth/login",
        },
      },
      schemas: {
        Collect: {
          type: "object",
          properties: {
            id: {
              type: "string",
              format: "uuid",
              description: "ID único da coleta",
            },
            vehicleChassi: {
              type: "string",
              description: "Chassi do veículo",
            },
            manufacturerId: {
              type: "string",
              format: "uuid",
              description: "ID da montadora",
            },
            yardId: {
              type: "string",
              format: "uuid",
              description: "ID do pátio de destino",
            },
            driverId: {
              type: "string",
              format: "uuid",
              description: "ID do motorista",
            },
            status: {
              type: "string",
              enum: ["em_transito", "finalizada"],
              description: "Status da coleta",
            },
            collectDate: {
              type: "string",
              format: "date-time",
              description: "Data e hora da coleta",
            },
            notes: {
              type: "string",
              description: "Observações da coleta",
            },
            checkinDateTime: {
              type: "string",
              format: "date-time",
              nullable: true,
              description: "Data/hora do check-in",
            },
            checkinLatitude: {
              type: "string",
              description: "Latitude do check-in",
            },
            checkinLongitude: {
              type: "string",
              description: "Longitude do check-in",
            },
            checkinSelfiePhoto: {
              type: "string",
              description: "URL da foto selfie do motorista no check-in",
            },
            checkinBodyPhotos: {
              type: "array",
              items: { type: "string" },
              description: "URLs das fotos da carroceria no check-in",
            },
            checkinOdometerPhoto: {
              type: "string",
              description: "URL da foto do hodômetro no check-in",
            },
            checkinDamagePhotos: {
              type: "array",
              items: { type: "string" },
              description: "URLs das fotos de avarias no check-in",
            },
            checkinNotes: {
              type: "string",
              description: "Observações do check-in",
            },
            checkoutDateTime: {
              type: "string",
              format: "date-time",
              nullable: true,
              description: "Data/hora do check-out",
            },
            checkoutLatitude: {
              type: "string",
              description: "Latitude do check-out",
            },
            checkoutLongitude: {
              type: "string",
              description: "Longitude do check-out",
            },
            checkoutSelfiePhoto: {
              type: "string",
              description: "URL da foto selfie do motorista no check-out",
            },
            checkoutBodyPhotos: {
              type: "array",
              items: { type: "string" },
              description: "URLs das fotos da carroceria no check-out",
            },
            checkoutOdometerPhoto: {
              type: "string",
              description: "URL da foto do hodômetro no check-out",
            },
            checkoutDamagePhotos: {
              type: "array",
              items: { type: "string" },
              description: "URLs das fotos de avarias no check-out",
            },
            checkoutNotes: {
              type: "string",
              description: "Observações do check-out",
            },
            createdAt: {
              type: "string",
              format: "date-time",
              description: "Data de criação",
            },
          },
        },
        CreateCollect: {
          type: "object",
          required: ["vehicleChassi", "manufacturerId", "yardId", "driverId", "collectDate"],
          properties: {
            vehicleChassi: {
              type: "string",
              description: "Chassi do veículo",
              example: "9BWZZZ377VT004251",
            },
            manufacturerId: {
              type: "string",
              format: "uuid",
              description: "ID da montadora",
            },
            yardId: {
              type: "string",
              format: "uuid",
              description: "ID do pátio de destino",
            },
            driverId: {
              type: "string",
              format: "uuid",
              description: "ID do motorista",
            },
            collectDate: {
              type: "string",
              format: "date-time",
              description: "Data e hora da coleta",
              example: "2026-01-11T10:30:00",
            },
            notes: {
              type: "string",
              description: "Observações da coleta",
            },
          },
        },
        CheckinData: {
          type: "object",
          properties: {
            checkinDateTime: {
              type: "string",
              format: "date-time",
              description: "Data/hora do check-in (preenchida automaticamente)",
            },
            checkinLatitude: {
              type: "string",
              description: "Latitude do check-in",
              example: "-23.550520",
            },
            checkinLongitude: {
              type: "string",
              description: "Longitude do check-in",
              example: "-46.633308",
            },
            checkinSelfiePhoto: {
              type: "string",
              description: "URL da foto selfie do motorista",
            },
            checkinBodyPhotos: {
              type: "array",
              items: { type: "string" },
              description: "URLs das fotos da carroceria",
            },
            checkinOdometerPhoto: {
              type: "string",
              description: "URL da foto do hodômetro",
            },
            checkinDamagePhotos: {
              type: "array",
              items: { type: "string" },
              description: "URLs das fotos de avarias",
            },
            checkinNotes: {
              type: "string",
              description: "Observações do check-in",
            },
          },
        },
        CheckoutData: {
          type: "object",
          properties: {
            checkoutDateTime: {
              type: "string",
              format: "date-time",
              description: "Data/hora do check-out (preenchida automaticamente)",
            },
            checkoutLatitude: {
              type: "string",
              description: "Latitude do check-out",
              example: "-23.550520",
            },
            checkoutLongitude: {
              type: "string",
              description: "Longitude do check-out",
              example: "-46.633308",
            },
            checkoutSelfiePhoto: {
              type: "string",
              description: "URL da foto selfie do motorista",
            },
            checkoutBodyPhotos: {
              type: "array",
              items: { type: "string" },
              description: "URLs das fotos da carroceria",
            },
            checkoutOdometerPhoto: {
              type: "string",
              description: "URL da foto do hodômetro",
            },
            checkoutDamagePhotos: {
              type: "array",
              items: { type: "string" },
              description: "URLs das fotos de avarias",
            },
            checkoutNotes: {
              type: "string",
              description: "Observações do check-out",
            },
          },
        },
        User: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "ID do usuário",
            },
            email: {
              type: "string",
              description: "Email do usuário",
            },
            firstName: {
              type: "string",
              description: "Nome do usuário",
            },
            lastName: {
              type: "string",
              nullable: true,
              description: "Sobrenome do usuário",
            },
            profileImageUrl: {
              type: "string",
              nullable: true,
              description: "URL da imagem de perfil",
            },
            role: {
              type: "string",
              enum: ["admin", "operador", "motorista", "portaria"],
              description: "Função do usuário no sistema",
            },
            createdAt: {
              type: "string",
              format: "date-time",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
            },
          },
        },
        Error: {
          type: "object",
          properties: {
            message: {
              type: "string",
              description: "Mensagem de erro",
            },
          },
        },
      },
    },
    tags: [
      {
        name: "Autenticação",
        description: "Endpoints de autenticação e gerenciamento de sessão",
      },
      {
        name: "Coletas",
        description: "Operações de coleta de veículos",
      },
    ],
  },
  apis: ["./server/swagger-docs.ts"],
};

const swaggerSpec = swaggerJsdoc(options);

export function setupSwagger(app: Express) {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: "API Logística de Veículos - Documentação",
  }));
  
  app.get("/api-docs.json", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(swaggerSpec);
  });
}
