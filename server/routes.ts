import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { registerJWTAuthRoutes, isAuthenticatedJWT, hashPassword, type AuthenticatedRequest } from "./auth-jwt";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";
import { setupSwagger } from "./swagger";
import * as fs from "fs";
import * as path from "path";
import { randomUUID } from "crypto";
import {
  insertDriverSchema,
  insertManufacturerSchema,
  insertYardSchema,
  insertClientSchema,
  insertDeliveryLocationSchema,
  insertVehicleSchema,
  insertCollectSchema,
  insertTransportSchema,
  insertSystemUserSchema,
  drivers,
  manufacturers,
  yards,
  clients,
  deliveryLocations,
  collects,
  featureKeys,
  systemUsers,
  type FeatureKey,
} from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";
import { users } from "@shared/models/auth";

async function createDefaultAdmin() {
  try {
    const existingAdmin = await db.select().from(users)
      .where(eq(users.username, "admin"))
      .limit(1);

    if (existingAdmin.length === 0) {
      const passwordHash = await hashPassword("admin123");
      await db.insert(users).values({
        username: "admin",
        passwordHash,
        email: "admin@otdentregas.com",
        firstName: "Administrador",
        lastName: "Sistema",
        role: "admin",
        isActive: "true",
      });
      console.log("Default admin user created: admin / admin123");
    }
  } catch (error) {
    console.error("Error creating default admin:", error);
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await createDefaultAdmin();
  registerJWTAuthRoutes(app);
  registerObjectStorageRoutes(app);
  setupSwagger(app);

  // Alternative upload route (fallback when Object Storage fails)
  const uploadsDir = path.join(process.cwd(), "uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  app.post("/api/uploads/local", isAuthenticatedJWT, async (req, res) => {
    try {
      const { data, filename, contentType } = req.body;
      if (!data || !filename) {
        return res.status(400).json({ error: "Missing data or filename" });
      }

      // Remove base64 prefix if present
      const base64Data = data.replace(/^data:.*;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");

      const ext = path.extname(filename) || ".jpg";
      const uniqueFilename = `${randomUUID()}${ext}`;
      const filePath = path.join(uploadsDir, uniqueFilename);

      fs.writeFileSync(filePath, buffer);

      res.json({
        objectPath: `/uploads/${uniqueFilename}`,
        filename: uniqueFilename,
      });
    } catch (error) {
      console.error("Error uploading file locally:", error);
      res.status(500).json({ error: "Failed to upload file" });
    }
  });

  // Serve uploaded files
  app.get("/uploads/:filename", (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(uploadsDir, filename);
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).json({ error: "File not found" });
    }
  });

  // Dashboard
  app.get("/api/dashboard/stats", isAuthenticatedJWT, async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Drivers
  app.get("/api/drivers", isAuthenticatedJWT, async (req, res) => {
    try {
      const data = await storage.getDrivers();
      res.json(data);
    } catch (error) {
      console.error("Error fetching drivers:", error);
      res.status(500).json({ message: "Failed to fetch drivers" });
    }
  });

  app.get("/api/drivers/:id", isAuthenticatedJWT, async (req, res) => {
    try {
      const driver = await storage.getDriver(req.params.id);
      if (!driver) {
        return res.status(404).json({ message: "Driver not found" });
      }
      res.json(driver);
    } catch (error) {
      console.error("Error fetching driver:", error);
      res.status(500).json({ message: "Failed to fetch driver" });
    }
  });

  app.post("/api/drivers", isAuthenticatedJWT, async (req, res) => {
    try {
      const data = insertDriverSchema.parse(req.body);
      const driver = await storage.createDriver(data);
      res.status(201).json(driver);
    } catch (error: any) {
      console.error("Error creating driver:", error);
      res.status(400).json({ message: error.message || "Failed to create driver" });
    }
  });

  app.patch("/api/drivers/:id", isAuthenticatedJWT, async (req, res) => {
    try {
      const data = insertDriverSchema.partial().parse(req.body);
      const driver = await storage.updateDriver(req.params.id, data);
      if (!driver) {
        return res.status(404).json({ message: "Driver not found" });
      }
      res.json(driver);
    } catch (error: any) {
      console.error("Error updating driver:", error);
      res.status(400).json({ message: error.message || "Failed to update driver" });
    }
  });

  app.delete("/api/drivers/:id", isAuthenticatedJWT, async (req, res) => {
    try {
      await storage.deleteDriver(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting driver:", error);
      res.status(500).json({ message: "Failed to delete driver" });
    }
  });

  // Manufacturers
  app.get("/api/manufacturers", isAuthenticatedJWT, async (req, res) => {
    try {
      const data = await storage.getManufacturers();
      res.json(data);
    } catch (error) {
      console.error("Error fetching manufacturers:", error);
      res.status(500).json({ message: "Failed to fetch manufacturers" });
    }
  });

  app.get("/api/manufacturers/:id", isAuthenticatedJWT, async (req, res) => {
    try {
      const manufacturer = await storage.getManufacturer(req.params.id);
      if (!manufacturer) {
        return res.status(404).json({ message: "Manufacturer not found" });
      }
      res.json(manufacturer);
    } catch (error) {
      console.error("Error fetching manufacturer:", error);
      res.status(500).json({ message: "Failed to fetch manufacturer" });
    }
  });

  app.post("/api/manufacturers", isAuthenticatedJWT, async (req, res) => {
    try {
      const data = insertManufacturerSchema.parse(req.body);
      const manufacturer = await storage.createManufacturer(data);
      res.status(201).json(manufacturer);
    } catch (error: any) {
      console.error("Error creating manufacturer:", error);
      res.status(400).json({ message: error.message || "Failed to create manufacturer" });
    }
  });

  app.patch("/api/manufacturers/:id", isAuthenticatedJWT, async (req, res) => {
    try {
      const data = insertManufacturerSchema.partial().parse(req.body);
      const manufacturer = await storage.updateManufacturer(req.params.id, data);
      if (!manufacturer) {
        return res.status(404).json({ message: "Manufacturer not found" });
      }
      res.json(manufacturer);
    } catch (error: any) {
      console.error("Error updating manufacturer:", error);
      res.status(400).json({ message: error.message || "Failed to update manufacturer" });
    }
  });

  app.delete("/api/manufacturers/:id", isAuthenticatedJWT, async (req, res) => {
    try {
      await storage.deleteManufacturer(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting manufacturer:", error);
      res.status(500).json({ message: "Failed to delete manufacturer" });
    }
  });

  // Yards
  app.get("/api/yards", isAuthenticatedJWT, async (req, res) => {
    try {
      const data = await storage.getYards();
      res.json(data);
    } catch (error) {
      console.error("Error fetching yards:", error);
      res.status(500).json({ message: "Failed to fetch yards" });
    }
  });

  app.get("/api/yards/:id", isAuthenticatedJWT, async (req, res) => {
    try {
      const yard = await storage.getYard(req.params.id);
      if (!yard) {
        return res.status(404).json({ message: "Yard not found" });
      }
      res.json(yard);
    } catch (error) {
      console.error("Error fetching yard:", error);
      res.status(500).json({ message: "Failed to fetch yard" });
    }
  });

  app.post("/api/yards", isAuthenticatedJWT, async (req, res) => {
    try {
      const data = insertYardSchema.parse(req.body);
      const yard = await storage.createYard(data);
      res.status(201).json(yard);
    } catch (error: any) {
      console.error("Error creating yard:", error);
      res.status(400).json({ message: error.message || "Failed to create yard" });
    }
  });

  app.patch("/api/yards/:id", isAuthenticatedJWT, async (req, res) => {
    try {
      const data = insertYardSchema.partial().parse(req.body);
      const yard = await storage.updateYard(req.params.id, data);
      if (!yard) {
        return res.status(404).json({ message: "Yard not found" });
      }
      res.json(yard);
    } catch (error: any) {
      console.error("Error updating yard:", error);
      res.status(400).json({ message: error.message || "Failed to update yard" });
    }
  });

  app.delete("/api/yards/:id", isAuthenticatedJWT, async (req, res) => {
    try {
      await storage.deleteYard(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting yard:", error);
      res.status(500).json({ message: "Failed to delete yard" });
    }
  });

  // Clients
  app.get("/api/clients", isAuthenticatedJWT, async (req, res) => {
    try {
      const data = await storage.getClients();
      res.json(data);
    } catch (error) {
      console.error("Error fetching clients:", error);
      res.status(500).json({ message: "Failed to fetch clients" });
    }
  });

  app.get("/api/clients/:id", isAuthenticatedJWT, async (req, res) => {
    try {
      const client = await storage.getClient(req.params.id);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      res.json(client);
    } catch (error) {
      console.error("Error fetching client:", error);
      res.status(500).json({ message: "Failed to fetch client" });
    }
  });

  app.post("/api/clients", isAuthenticatedJWT, async (req, res) => {
    try {
      const data = insertClientSchema.parse(req.body);
      const client = await storage.createClient(data);
      res.status(201).json(client);
    } catch (error: any) {
      console.error("Error creating client:", error);
      res.status(400).json({ message: error.message || "Failed to create client" });
    }
  });

  app.patch("/api/clients/:id", isAuthenticatedJWT, async (req, res) => {
    try {
      const data = insertClientSchema.partial().parse(req.body);
      const client = await storage.updateClient(req.params.id, data);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      res.json(client);
    } catch (error: any) {
      console.error("Error updating client:", error);
      res.status(400).json({ message: error.message || "Failed to update client" });
    }
  });

  app.delete("/api/clients/:id", isAuthenticatedJWT, async (req, res) => {
    try {
      await storage.deleteClient(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting client:", error);
      res.status(500).json({ message: "Failed to delete client" });
    }
  });

  // Delivery Locations
  app.get("/api/delivery-locations", isAuthenticatedJWT, async (req, res) => {
    try {
      const data = await storage.getAllDeliveryLocations();
      res.json(data);
    } catch (error) {
      console.error("Error fetching all delivery locations:", error);
      res.status(500).json({ message: "Failed to fetch delivery locations" });
    }
  });

  app.get("/api/clients/:clientId/locations", isAuthenticatedJWT, async (req, res) => {
    try {
      const data = await storage.getDeliveryLocations(req.params.clientId);
      res.json(data);
    } catch (error) {
      console.error("Error fetching delivery locations:", error);
      res.status(500).json({ message: "Failed to fetch delivery locations" });
    }
  });

  app.post("/api/clients/:clientId/locations", isAuthenticatedJWT, async (req, res) => {
    try {
      const data = insertDeliveryLocationSchema.parse({
        ...req.body,
        clientId: req.params.clientId,
      });
      const location = await storage.createDeliveryLocation(data);
      res.status(201).json(location);
    } catch (error: any) {
      console.error("Error creating delivery location:", error);
      res.status(400).json({ message: error.message || "Failed to create delivery location" });
    }
  });

  app.patch("/api/delivery-locations/:id", isAuthenticatedJWT, async (req, res) => {
    try {
      const data = insertDeliveryLocationSchema.partial().parse(req.body);
      const location = await storage.updateDeliveryLocation(req.params.id, data);
      if (!location) {
        return res.status(404).json({ message: "Delivery location not found" });
      }
      res.json(location);
    } catch (error: any) {
      console.error("Error updating delivery location:", error);
      res.status(400).json({ message: error.message || "Failed to update delivery location" });
    }
  });

  app.delete("/api/delivery-locations/:id", isAuthenticatedJWT, async (req, res) => {
    try {
      await storage.deleteDeliveryLocation(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting delivery location:", error);
      res.status(500).json({ message: "Failed to delete delivery location" });
    }
  });

  // Vehicles
  app.get("/api/vehicles", isAuthenticatedJWT, async (req, res) => {
    try {
      const data = await storage.getVehicles();
      res.json(data);
    } catch (error) {
      console.error("Error fetching vehicles:", error);
      res.status(500).json({ message: "Failed to fetch vehicles" });
    }
  });

  app.get("/api/vehicles/:chassi", isAuthenticatedJWT, async (req, res) => {
    try {
      const vehicle = await storage.getVehicle(decodeURIComponent(req.params.chassi));
      if (!vehicle) {
        return res.status(404).json({ message: "Vehicle not found" });
      }
      res.json(vehicle);
    } catch (error) {
      console.error("Error fetching vehicle:", error);
      res.status(500).json({ message: "Failed to fetch vehicle" });
    }
  });

  app.post("/api/vehicles", isAuthenticatedJWT, async (req, res) => {
    try {
      const data = insertVehicleSchema.parse(req.body);
      const vehicle = await storage.createVehicle(data);
      res.status(201).json(vehicle);
    } catch (error: any) {
      console.error("Error creating vehicle:", error);
      res.status(400).json({ message: error.message || "Failed to create vehicle" });
    }
  });

  app.patch("/api/vehicles/:chassi", isAuthenticatedJWT, async (req, res) => {
    try {
      const chassi = decodeURIComponent(req.params.chassi);
      const data = insertVehicleSchema.partial().parse(req.body);
      
      // Convert empty strings to null for nullable foreign key fields
      if (data.clientId === "") data.clientId = null;
      if (data.yardId === "") data.yardId = null;
      if (data.manufacturerId === "") data.manufacturerId = null;
      
      // Get current vehicle to check status transition
      const currentVehicle = await storage.getVehicle(chassi);
      
      // If status is changing from pre_estoque to em_estoque, set yard entry date/time
      if (currentVehicle?.status === "pre_estoque" && data.status === "em_estoque") {
        data.yardEntryDateTime = new Date();
      }
      
      // If status is changing to despachado, set dispatch date/time
      if (currentVehicle?.status !== "despachado" && data.status === "despachado") {
        data.dispatchDateTime = new Date();
      }
      
      const vehicle = await storage.updateVehicle(chassi, data);
      if (!vehicle) {
        return res.status(404).json({ message: "Vehicle not found" });
      }
      
      // If vehicle status changed from pre_estoque to em_estoque, finalize the active collect
      if (currentVehicle?.status === "pre_estoque" && data.status === "em_estoque") {
        // Only update collects that are still em_transito (active)
        await db.update(collects)
          .set({ status: "finalizada" })
          .where(and(
            eq(collects.vehicleChassi, chassi),
            eq(collects.status, "em_transito")
          ));
      }
      
      res.json(vehicle);
    } catch (error: any) {
      console.error("Error updating vehicle:", error);
      res.status(400).json({ message: error.message || "Failed to update vehicle" });
    }
  });

  app.delete("/api/vehicles/:chassi", isAuthenticatedJWT, async (req, res) => {
    try {
      const chassi = decodeURIComponent(req.params.chassi);
      // Delete associated collects first
      await db.delete(collects).where(eq(collects.vehicleChassi, chassi));
      await storage.deleteVehicle(chassi);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting vehicle:", error);
      res.status(500).json({ message: "Failed to delete vehicle" });
    }
  });

  // Collects
  app.get("/api/collects", isAuthenticatedJWT, async (req, res) => {
    try {
      const collectsList = await storage.getCollects();
      const collectsWithRelations = await Promise.all(
        collectsList.map(async (collect) => {
          const [manufacturer] = await db.select().from(manufacturers).where(eq(manufacturers.id, collect.manufacturerId));
          const [yard] = await db.select().from(yards).where(eq(yards.id, collect.yardId));
          const [driver] = collect.driverId
            ? await db.select().from(drivers).where(eq(drivers.id, collect.driverId))
            : [null];
          const [checkoutApprovedBy] = collect.checkoutApprovedById
            ? await db.select({ firstName: users.firstName, lastName: users.lastName, username: users.username }).from(users).where(eq(users.id, collect.checkoutApprovedById))
            : [null];
          return { ...collect, manufacturer, yard, driver, checkoutApprovedBy };
        })
      );
      res.json(collectsWithRelations);
    } catch (error) {
      console.error("Error fetching collects:", error);
      res.status(500).json({ message: "Failed to fetch collects" });
    }
  });

  app.get("/api/collects/recent", isAuthenticatedJWT, async (req, res) => {
    try {
      const data = await storage.getRecentCollects(5);
      res.json(data);
    } catch (error) {
      console.error("Error fetching recent collects:", error);
      res.status(500).json({ message: "Failed to fetch recent collects" });
    }
  });

  app.get("/api/collects/by-chassi/:chassi", isAuthenticatedJWT, async (req, res) => {
    try {
      const chassi = decodeURIComponent(req.params.chassi);
      const collectsList = await db.select().from(collects).where(eq(collects.vehicleChassi, chassi)).orderBy(collects.createdAt);
      const collectsWithRelations = await Promise.all(
        collectsList.map(async (collect) => {
          const [manufacturer] = await db.select().from(manufacturers).where(eq(manufacturers.id, collect.manufacturerId));
          const [yard] = await db.select().from(yards).where(eq(yards.id, collect.yardId));
          const [driver] = collect.driverId
            ? await db.select().from(drivers).where(eq(drivers.id, collect.driverId))
            : [null];
          const [checkoutApprovedBy] = collect.checkoutApprovedById
            ? await db.select({ firstName: users.firstName, lastName: users.lastName, username: users.username }).from(users).where(eq(users.id, collect.checkoutApprovedById))
            : [null];
          return { ...collect, manufacturer, yard, driver, checkoutApprovedBy };
        })
      );
      res.json(collectsWithRelations);
    } catch (error) {
      console.error("Error fetching collects by chassi:", error);
      res.status(500).json({ message: "Failed to fetch collects" });
    }
  });

  app.get("/api/collects/:id", isAuthenticatedJWT, async (req, res) => {
    try {
      const collect = await storage.getCollect(req.params.id);
      if (!collect) {
        return res.status(404).json({ message: "Collect not found" });
      }
      res.json(collect);
    } catch (error) {
      console.error("Error fetching collect:", error);
      res.status(500).json({ message: "Failed to fetch collect" });
    }
  });

  app.post("/api/collects", isAuthenticatedJWT, async (req, res) => {
    try {
      const data = insertCollectSchema.parse(req.body);
      
      // Automatically create vehicle with pre_estoque status
      const existingVehicle = await storage.getVehicle(data.vehicleChassi);
      if (!existingVehicle) {
        await storage.createVehicle({
          chassi: data.vehicleChassi,
          manufacturerId: data.manufacturerId,
          status: "pre_estoque",
        });
      }
      
      // Create collect with em_transito status (default)
      const collect = await storage.createCollect({
        ...data,
        status: "em_transito",
      });
      res.status(201).json(collect);
    } catch (error: any) {
      console.error("Error creating collect:", error);
      res.status(400).json({ message: error.message || "Failed to create collect" });
    }
  });

  app.patch("/api/collects/:id", isAuthenticatedJWT, async (req, res) => {
    try {
      const data = insertCollectSchema.partial().parse(req.body);
      
      // Get existing collect to check for checkout transition
      const existingCollect = await storage.getCollect(req.params.id);
      if (!existingCollect) {
        return res.status(404).json({ message: "Collect not found" });
      }
      
      const collect = await storage.updateCollect(req.params.id, data);
      if (!collect) {
        return res.status(404).json({ message: "Collect not found" });
      }
      
      // If checkout was just completed, update vehicle with yard and status
      if (data.checkoutDateTime && !existingCollect.checkoutDateTime) {
        await storage.updateVehicle(collect.vehicleChassi, {
          yardId: collect.yardId,
          status: "em_estoque",
          yardEntryDateTime: new Date(data.checkoutDateTime),
        });
        // Also update collect status to finalizada
        await storage.updateCollect(req.params.id, { status: "finalizada" });
      }
      
      res.json(collect);
    } catch (error: any) {
      console.error("Error updating collect:", error);
      res.status(400).json({ message: error.message || "Failed to update collect" });
    }
  });

  app.delete("/api/collects/:id", isAuthenticatedJWT, async (req, res) => {
    try {
      await storage.deleteCollect(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting collect:", error);
      res.status(500).json({ message: "Failed to delete collect" });
    }
  });

  // Portaria - Authorize entry
  app.post("/api/portaria/authorize/:id", isAuthenticatedJWT, async (req, res) => {
    try {
      const collect = await storage.getCollect(req.params.id);
      if (!collect) {
        return res.status(404).json({ message: "Coleta não encontrada" });
      }

      if (collect.status !== "em_transito") {
        return res.status(400).json({ message: "Coleta não está em trânsito" });
      }

      // Update vehicle status from pre_estoque to em_estoque
      const vehicle = await storage.getVehicle(collect.vehicleChassi);
      if (vehicle) {
        await storage.updateVehicle(collect.vehicleChassi, {
          status: "em_estoque",
          yardId: collect.yardId,
          yardEntryDateTime: new Date(),
        });
      }

      // Update collect status to aguardando_checkout (driver will do checkout manually)
      await storage.updateCollect(req.params.id, { 
        status: "aguardando_checkout",
      });

      res.json({ success: true, message: "Entrada autorizada com sucesso" });
    } catch (error: any) {
      console.error("Error authorizing entry:", error);
      res.status(500).json({ message: error.message || "Erro ao autorizar entrada" });
    }
  });

  // Authorize transport exit (portaria approves vehicle leaving the yard)
  app.post("/api/portaria/authorize-exit/:id", isAuthenticatedJWT, async (req, res) => {
    try {
      const transport = await storage.getTransport(req.params.id);
      if (!transport) {
        return res.status(404).json({ message: "Transporte não encontrado" });
      }

      if (transport.status !== "pendente") {
        return res.status(400).json({ message: "Transporte não está pendente" });
      }

      // Update vehicle status from em_estoque to despachado
      const vehicle = await storage.getVehicle(transport.vehicleChassi);
      if (vehicle) {
        if (vehicle.status !== "em_estoque") {
          return res.status(400).json({ message: "Veículo não está em estoque" });
        }
        await storage.updateVehicle(transport.vehicleChassi, {
          status: "despachado",
          dispatchDateTime: new Date(),
        });
      }

      // Update transport status to em_transito and set transit start time
      await storage.updateTransport(req.params.id, { 
        status: "em_transito",
        transitStartedAt: new Date(),
      });

      res.json({ success: true, message: "Saída autorizada com sucesso" });
    } catch (error: any) {
      console.error("Error authorizing exit:", error);
      res.status(500).json({ message: error.message || "Erro ao autorizar saída" });
    }
  });

  // Transports
  app.get("/api/transports", isAuthenticatedJWT, async (req, res) => {
    try {
      const transportsList = await storage.getTransports();
      const transportsWithRelations = await Promise.all(
        transportsList.map(async (transport) => {
          const [client] = await db.select().from(clients).where(eq(clients.id, transport.clientId));
          const [deliveryLocation] = await db
            .select()
            .from(deliveryLocations)
            .where(eq(deliveryLocations.id, transport.deliveryLocationId));
          const [driver] = transport.driverId
            ? await db.select().from(drivers).where(eq(drivers.id, transport.driverId))
            : [null];
          let createdByUser = null;
          if (transport.createdByUserId) {
            const users = await db.select().from(systemUsers).where(eq(systemUsers.id, transport.createdByUserId));
            if (users.length > 0) {
              const u = users[0];
              createdByUser = { id: u.id, username: u.username, firstName: u.firstName, lastName: u.lastName };
            }
          }
          let driverAssignedByUser = null;
          if (transport.driverAssignedByUserId) {
            const users = await db.select().from(systemUsers).where(eq(systemUsers.id, transport.driverAssignedByUserId));
            if (users.length > 0) {
              const u = users[0];
              driverAssignedByUser = { id: u.id, username: u.username, firstName: u.firstName, lastName: u.lastName };
            }
          }
          return { ...transport, client, deliveryLocation, driver, createdByUser, driverAssignedByUser };
        })
      );
      res.json(transportsWithRelations);
    } catch (error) {
      console.error("Error fetching transports:", error);
      res.status(500).json({ message: "Failed to fetch transports" });
    }
  });

  app.get("/api/transports/recent", isAuthenticatedJWT, async (req, res) => {
    try {
      const data = await storage.getRecentTransports(5);
      res.json(data);
    } catch (error) {
      console.error("Error fetching recent transports:", error);
      res.status(500).json({ message: "Failed to fetch recent transports" });
    }
  });

  app.get("/api/transports/:id", isAuthenticatedJWT, async (req, res) => {
    try {
      const transport = await storage.getTransport(req.params.id);
      if (!transport) {
        return res.status(404).json({ message: "Transport not found" });
      }
      res.json(transport);
    } catch (error) {
      console.error("Error fetching transport:", error);
      res.status(500).json({ message: "Failed to fetch transport" });
    }
  });

  app.post("/api/transports", isAuthenticatedJWT, async (req: AuthenticatedRequest, res) => {
    try {
      const data = insertTransportSchema.parse(req.body);
      const userId = req.user?.id;
      const transportData = {
        ...data,
        createdByUserId: userId,
        driverAssignedByUserId: data.driverId ? userId : undefined,
        driverAssignedAt: data.driverId ? new Date() : undefined,
      };
      const transport = await storage.createTransport(transportData);
      res.status(201).json(transport);
    } catch (error: any) {
      console.error("Error creating transport:", error);
      res.status(400).json({ message: error.message || "Failed to create transport" });
    }
  });

  app.patch("/api/transports/:id", isAuthenticatedJWT, async (req: AuthenticatedRequest, res) => {
    try {
      const data = insertTransportSchema.partial().parse(req.body);
      const userId = req.user?.id;
      
      // Check if driver is being assigned for the first time
      const existingTransport = await storage.getTransport(req.params.id);
      let updateData: any = { ...data };
      
      if (data.driverId && !existingTransport?.driverId) {
        updateData.driverAssignedByUserId = userId;
        updateData.driverAssignedAt = new Date();
      }
      
      const transport = await storage.updateTransport(req.params.id, updateData);
      if (!transport) {
        return res.status(404).json({ message: "Transport not found" });
      }
      res.json(transport);
    } catch (error: any) {
      console.error("Error updating transport:", error);
      res.status(400).json({ message: error.message || "Failed to update transport" });
    }
  });

  app.delete("/api/transports/:id", isAuthenticatedJWT, async (req, res) => {
    try {
      await storage.deleteTransport(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting transport:", error);
      res.status(500).json({ message: "Failed to delete transport" });
    }
  });

  // Transport Check-in (pickup from yard)
  app.patch("/api/transports/:id/checkin", isAuthenticatedJWT, async (req, res) => {
    try {
      const { latitude, longitude, frontalPhoto, lateral1Photo, lateral2Photo, traseiraPhoto, odometerPhoto, fuelLevelPhoto, damagePhotos, selfiePhoto, notes } = req.body;
      
      const existingTransport = await storage.getTransport(req.params.id);
      if (!existingTransport) {
        return res.status(404).json({ message: "Transport not found" });
      }
      
      const transport = await storage.updateTransport(req.params.id, {
        checkinDateTime: new Date(),
        checkinLatitude: latitude,
        checkinLongitude: longitude,
        checkinFrontalPhoto: frontalPhoto,
        checkinLateral1Photo: lateral1Photo,
        checkinLateral2Photo: lateral2Photo,
        checkinTraseiraPhoto: traseiraPhoto,
        checkinOdometerPhoto: odometerPhoto,
        checkinFuelLevelPhoto: fuelLevelPhoto,
        checkinDamagePhotos: damagePhotos || [],
        checkinSelfiePhoto: selfiePhoto,
        checkinNotes: notes,
        status: "aguardando_saida",
      });
      
      // Update vehicle status to "despachado" (dispatched)
      await storage.updateVehicle(existingTransport.vehicleChassi, {
        status: "despachado",
      });
      
      res.json(transport);
    } catch (error: any) {
      console.error("Error performing transport check-in:", error);
      res.status(400).json({ message: error.message || "Failed to perform check-in" });
    }
  });

  // Transport Check-out (delivery to client)
  app.patch("/api/transports/:id/checkout", isAuthenticatedJWT, async (req, res) => {
    try {
      const { latitude, longitude, frontalPhoto, lateral1Photo, lateral2Photo, traseiraPhoto, odometerPhoto, fuelLevelPhoto, damagePhotos, selfiePhoto, notes } = req.body;
      
      const existingTransport = await storage.getTransport(req.params.id);
      if (!existingTransport) {
        return res.status(404).json({ message: "Transport not found" });
      }
      
      // Validate that check-in was performed first
      if (!existingTransport.checkinDateTime) {
        return res.status(400).json({ message: "Check-in must be performed before check-out" });
      }
      
      const transport = await storage.updateTransport(req.params.id, {
        checkoutDateTime: new Date(),
        checkoutLatitude: latitude,
        checkoutLongitude: longitude,
        checkoutFrontalPhoto: frontalPhoto,
        checkoutLateral1Photo: lateral1Photo,
        checkoutLateral2Photo: lateral2Photo,
        checkoutTraseiraPhoto: traseiraPhoto,
        checkoutOdometerPhoto: odometerPhoto,
        checkoutFuelLevelPhoto: fuelLevelPhoto,
        checkoutDamagePhotos: damagePhotos || [],
        checkoutSelfiePhoto: selfiePhoto,
        checkoutNotes: notes,
        status: "entregue",
      });
      
      // Update vehicle status to "entregue" (delivered)
      await storage.updateVehicle(existingTransport.vehicleChassi, {
        status: "entregue",
      });
      
      res.json(transport);
    } catch (error: any) {
      console.error("Error performing transport check-out:", error);
      res.status(400).json({ message: error.message || "Failed to perform check-out" });
    }
  });

  // Clear Transport Check-in (admin only)
  app.delete("/api/transports/:id/checkin", isAuthenticatedJWT, async (req, res) => {
    try {
      const existingTransport = await storage.getTransport(req.params.id);
      if (!existingTransport) {
        return res.status(404).json({ message: "Transport not found" });
      }
      
      // If checkout exists, must clear it first
      if (existingTransport.checkoutDateTime) {
        return res.status(400).json({ message: "Check-out must be cleared before clearing check-in" });
      }
      
      const transport = await storage.clearTransportCheckin(req.params.id);
      
      // Revert vehicle status back to em_estoque
      await storage.updateVehicle(existingTransport.vehicleChassi, {
        status: "em_estoque",
      });
      
      res.json(transport);
    } catch (error: any) {
      console.error("Error clearing transport check-in:", error);
      res.status(400).json({ message: error.message || "Failed to clear check-in" });
    }
  });

  // Clear Transport Check-out (admin only)
  app.delete("/api/transports/:id/checkout", isAuthenticatedJWT, async (req, res) => {
    try {
      const existingTransport = await storage.getTransport(req.params.id);
      if (!existingTransport) {
        return res.status(404).json({ message: "Transport not found" });
      }
      
      const transport = await storage.clearTransportCheckout(req.params.id);
      
      // Revert vehicle status back to despachado
      await storage.updateVehicle(existingTransport.vehicleChassi, {
        status: "despachado",
      });
      
      res.json(transport);
    } catch (error: any) {
      console.error("Error clearing transport check-out:", error);
      res.status(400).json({ message: error.message || "Failed to clear check-out" });
    }
  });

  // Driver Notifications
  app.get("/api/driver-notifications", isAuthenticatedJWT, async (req, res) => {
    try {
      const { yardId, deliveryLocationId, departureDate } = req.query;
      if (!yardId || !deliveryLocationId || !departureDate) {
        return res.status(400).json({ message: "Missing required parameters" });
      }
      const notifications = await storage.getDriverNotifications(
        yardId as string,
        deliveryLocationId as string,
        departureDate as string
      );
      const notificationsWithDrivers = await Promise.all(
        notifications.map(async (notification) => {
          const [driver] = await db.select().from(drivers).where(eq(drivers.id, notification.driverId));
          return { ...notification, driver };
        })
      );
      res.json(notificationsWithDrivers);
    } catch (error) {
      console.error("Error fetching driver notifications:", error);
      res.status(500).json({ message: "Failed to fetch driver notifications" });
    }
  });

  app.post("/api/driver-notifications/notify", isAuthenticatedJWT, async (req, res) => {
    try {
      const { yardId, deliveryLocationId, departureDate } = req.body;
      const activeDrivers = await storage.getDrivers();
      const notifications = await Promise.all(
        activeDrivers
          .filter((d) => d.isActive === "true")
          .map((driver) =>
            storage.createDriverNotification({
              yardId,
              deliveryLocationId,
              departureDate,
              driverId: driver.id,
              status: "pendente",
            })
          )
      );
      res.status(201).json(notifications);
    } catch (error: any) {
      console.error("Error creating driver notifications:", error);
      res.status(400).json({ message: error.message || "Failed to create notifications" });
    }
  });

  app.post("/api/driver-notifications/:id/accept", isAuthenticatedJWT, async (req, res) => {
    try {
      const notification = await storage.updateDriverNotification(req.params.id, {
        status: "aceito",
      });
      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }
      res.json(notification);
    } catch (error) {
      console.error("Error accepting notification:", error);
      res.status(500).json({ message: "Failed to accept notification" });
    }
  });

  // System Users
  app.get("/api/system-users", isAuthenticatedJWT, async (req, res) => {
    try {
      const data = await storage.getSystemUsers();
      res.json(data);
    } catch (error) {
      console.error("Error fetching system users:", error);
      res.status(500).json({ message: "Failed to fetch system users" });
    }
  });

  app.get("/api/system-users/:id", isAuthenticatedJWT, async (req, res) => {
    try {
      const user = await storage.getSystemUser(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error fetching system user:", error);
      res.status(500).json({ message: "Failed to fetch system user" });
    }
  });

  app.post("/api/system-users", isAuthenticatedJWT, async (req, res) => {
    try {
      const data = insertSystemUserSchema.parse(req.body);
      const user = await storage.createSystemUser(data);
      res.status(201).json(user);
    } catch (error: any) {
      console.error("Error creating system user:", error);
      res.status(400).json({ message: error.message || "Failed to create system user" });
    }
  });

  app.patch("/api/system-users/:id", isAuthenticatedJWT, async (req, res) => {
    try {
      const data = insertSystemUserSchema.partial().parse(req.body);
      const user = await storage.updateSystemUser(req.params.id, data);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error: any) {
      console.error("Error updating system user:", error);
      res.status(400).json({ message: error.message || "Failed to update system user" });
    }
  });

  app.delete("/api/system-users/:id", isAuthenticatedJWT, async (req, res) => {
    try {
      await storage.deleteSystemUser(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting system user:", error);
      res.status(500).json({ message: "Failed to delete system user" });
    }
  });

  // Role Permissions
  app.get("/api/role-permissions", isAuthenticatedJWT, async (req, res) => {
    try {
      const data = await storage.getRolePermissions();
      res.json(data);
    } catch (error) {
      console.error("Error fetching role permissions:", error);
      res.status(500).json({ message: "Failed to fetch role permissions" });
    }
  });

  app.get("/api/role-permissions/:role", isAuthenticatedJWT, async (req, res) => {
    try {
      const data = await storage.getPermissionsByRole(req.params.role);
      res.json(data);
    } catch (error) {
      console.error("Error fetching role permissions:", error);
      res.status(500).json({ message: "Failed to fetch role permissions" });
    }
  });

  app.post("/api/role-permissions/:role", isAuthenticatedJWT, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const user = await db.select().from(users).where(eq(users.id, userId));
      if (!user[0] || user[0].role !== "admin") {
        return res.status(403).json({ message: "Apenas administradores podem alterar permissões" });
      }

      const { features } = req.body as { features: FeatureKey[] };
      const validFeatures = features.filter((f) => featureKeys.includes(f));
      
      if (req.params.role === "admin" && !validFeatures.includes("usuarios")) {
        validFeatures.push("usuarios");
      }
      
      await storage.setRolePermissions(req.params.role, validFeatures);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error setting role permissions:", error);
      res.status(400).json({ message: error.message || "Failed to set role permissions" });
    }
  });

  // Integrations
  app.get("/api/integrations/status", isAuthenticatedJWT, async (req, res) => {
    try {
      const googleMapsApiKey = !!process.env.GOOGLE_MAPS_API_KEY;
      res.json({ googleMapsApiKey });
    } catch (error) {
      console.error("Error checking integration status:", error);
      res.status(500).json({ message: "Failed to check integration status" });
    }
  });

  // Public route for Google Maps API key (needed by AddressAutocomplete component)
  app.get("/api/integrations/google-maps/api-key", async (req: any, res) => {
    try {
      const key = process.env.GOOGLE_MAPS_API_KEY;
      if (!key) {
        return res.json({ configured: false, apiKey: null });
      }
      res.json({ configured: true, apiKey: key });
    } catch (error) {
      console.error("Error fetching Google Maps API key:", error);
      res.status(500).json({ message: "Failed to fetch API key" });
    }
  });

  // Global place search endpoint using new Places API (v1) - supports Mercosul countries
  app.get("/api/integrations/google-maps/places/search", isAuthenticatedJWT, async (req: any, res) => {
    try {
      const { query } = req.query;
      console.log("[places/search] Received query:", query);
      
      if (!query || typeof query !== "string" || query.length < 3) {
        return res.json({ predictions: [] });
      }

      const apiKey = process.env.GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        console.error("[places/search] No API key configured");
        return res.status(500).json({ message: "Google Maps API key not configured" });
      }

      // Using the new Places API (v1) with POST request - no IP biasing
      const url = `https://places.googleapis.com/v1/places:autocomplete`;
      
      console.log("[places/search] Calling Google Places API for:", query);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
        },
        body: JSON.stringify({
          input: query,
          includedRegionCodes: ['BR', 'AR', 'PE', 'BO', 'PY', 'CL', 'UY', 'VE', 'CO', 'EC'],
        }),
      });
      
      const data = await response.json();
      console.log("[places/search] Google API response status:", response.status, "suggestions count:", data.suggestions?.length || 0);

      if (data.suggestions && data.suggestions.length > 0) {
        const predictions = data.suggestions
          .filter((s: any) => s.placePrediction)
          .map((s: any) => ({
            placeId: s.placePrediction.placeId,
            description: s.placePrediction.text?.text || s.placePrediction.structuredFormat?.mainText?.text || '',
          }));
        console.log("[places/search] Returning", predictions.length, "predictions");
        return res.json({ predictions });
      }

      console.log("[places/search] No suggestions found");
      res.json({ predictions: [] });
    } catch (error) {
      console.error("[places/search] Error:", error);
      res.status(500).json({ message: "Failed to search places" });
    }
  });

  // Get place details by place ID using new Places API (v1)
  app.get("/api/integrations/google-maps/places/:placeId", isAuthenticatedJWT, async (req: any, res) => {
    try {
      const { placeId } = req.params;
      if (!placeId) {
        return res.status(400).json({ message: "Place ID required" });
      }

      const apiKey = process.env.GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ message: "Google Maps API key not configured" });
      }

      // Using new Places API (v1)
      const url = `https://places.googleapis.com/v1/places/${placeId}?fields=formattedAddress,location&key=${apiKey}`;
      
      const response = await fetch(url, {
        headers: {
          'X-Goog-Api-Key': apiKey,
        },
      });
      const data = await response.json();

      if (data.location) {
        return res.json({
          address: data.formattedAddress || '',
          lat: data.location.latitude,
          lng: data.location.longitude,
        });
      }

      res.status(404).json({ message: "Place not found" });
    } catch (error) {
      console.error("Error getting place details:", error);
      res.status(500).json({ message: "Failed to get place details" });
    }
  });

  app.get("/api/integrations/google-maps/key", isAuthenticatedJWT, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const user = await db.select().from(users).where(eq(users.id, userId));
      if (!user[0] || user[0].role !== "admin") {
        return res.status(403).json({ message: "Apenas administradores podem acessar" });
      }

      const key = process.env.GOOGLE_MAPS_API_KEY;
      if (!key) {
        return res.json({ configured: false, maskedKey: null });
      }
      
      const maskedKey = key.slice(0, 8) + "..." + key.slice(-4);
      res.json({ configured: true, maskedKey });
    } catch (error) {
      console.error("Error fetching Google Maps API key:", error);
      res.status(500).json({ message: "Failed to fetch API key status" });
    }
  });

  // Google Maps Static Image Proxy (to avoid exposing API key in frontend)
  app.get("/api/integrations/google-maps/static-image", isAuthenticatedJWT, async (req: any, res) => {
    try {
      const { lat, lng, zoom = "15", size = "400x300" } = req.query;
      
      if (!lat || !lng) {
        return res.status(400).json({ message: "Latitude and longitude are required" });
      }

      const apiKey = process.env.GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ message: "Google Maps API key not configured" });
      }

      const mapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=${zoom}&size=${size}&markers=color:red%7C${lat},${lng}&key=${apiKey}`;
      
      const response = await fetch(mapUrl);
      if (!response.ok) {
        console.error("Google Maps API error:", response.status, await response.text());
        return res.status(500).json({ message: "Failed to fetch map image" });
      }

      const buffer = await response.arrayBuffer();
      res.set("Content-Type", "image/png");
      res.set("Cache-Control", "public, max-age=86400");
      res.send(Buffer.from(buffer));
    } catch (error) {
      console.error("Error fetching static map:", error);
      res.status(500).json({ message: "Failed to fetch map image" });
    }
  });

  // Routing calculation endpoint
  app.post("/api/routing/calculate", isAuthenticatedJWT, async (req: any, res) => {
    try {
      const { origin, destination, waypoints = [], avoidTolls = false, avoidHighways = false } = req.body;
      
      if (!origin?.lat || !origin?.lng || !destination?.lat || !destination?.lng) {
        return res.status(400).json({ message: "Origin and destination coordinates are required" });
      }

      const apiKey = process.env.GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ message: "Google Maps API key not configured" });
      }

      // Build waypoints string for Distance Matrix API
      let waypointsStr = "";
      if (waypoints.length > 0) {
        waypointsStr = "&waypoints=" + waypoints.map((wp: any) => `${wp.lat},${wp.lng}`).join("|");
      }

      // Build avoid string
      let avoidStr = "";
      const avoidList = [];
      if (avoidTolls) avoidList.push("tolls");
      if (avoidHighways) avoidList.push("highways");
      if (avoidList.length > 0) {
        avoidStr = "&avoid=" + avoidList.join("|");
      }

      // Use Directions API for routes with waypoints
      const directionsUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}${waypointsStr}${avoidStr}&departure_time=now&traffic_model=best_guess&key=${apiKey}`;
      
      const directionsResponse = await fetch(directionsUrl);
      const directionsData = await directionsResponse.json();

      if (directionsData.status !== "OK" || !directionsData.routes?.[0]) {
        return res.status(400).json({ message: "Could not calculate route" });
      }

      const route = directionsData.routes[0];
      const legs = route.legs;

      // Calculate total distance and duration
      let totalDistance = 0;
      let totalDuration = 0;
      let totalDurationInTraffic = 0;
      let hasTrafficData = false;

      for (const leg of legs) {
        totalDistance += leg.distance.value;
        totalDuration += leg.duration.value;
        if (leg.duration_in_traffic) {
          totalDurationInTraffic += leg.duration_in_traffic.value;
          hasTrafficData = true;
        } else {
          totalDurationInTraffic += leg.duration.value;
        }
      }

      // Get toll information using Routes API
      let tollCost = null;
      if (!avoidTolls) {
        try {
          const intermediates = waypoints.map((wp: any) => ({
            location: { latLng: { latitude: wp.lat, longitude: wp.lng } }
          }));

          const routesBody: any = {
            origin: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } },
            destination: { location: { latLng: { latitude: destination.lat, longitude: destination.lng } } },
            travelMode: "DRIVE",
            extraComputations: ["TOLLS"],
            routeModifiers: {
              vehicleInfo: {
                emissionType: "DIESEL"
              }
            }
          };

          if (intermediates.length > 0) {
            routesBody.intermediates = intermediates;
          }

          const routesResponse = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Goog-Api-Key": apiKey,
              "X-Goog-FieldMask": "routes.duration,routes.distanceMeters,routes.travelAdvisory.tollInfo,routes.legs.travelAdvisory.tollInfo",
            },
            body: JSON.stringify(routesBody),
          });

          const routesData = await routesResponse.json();
          console.log("Routes API toll response:", JSON.stringify(routesData, null, 2));
          
          // Check for toll info at route level
          if (routesData.routes?.[0]?.travelAdvisory?.tollInfo?.estimatedPrice?.[0]) {
            const toll = routesData.routes[0].travelAdvisory.tollInfo.estimatedPrice[0];
            const amount = parseFloat(toll.units || "0") + (parseFloat(toll.nanos || "0") / 1000000000);
            tollCost = {
              amount: amount.toFixed(2),
              currency: toll.currencyCode || "BRL",
            };
          } 
          // Check for toll info at legs level (sum all legs)
          else if (routesData.routes?.[0]?.legs) {
            let totalToll = 0;
            let currency = "BRL";
            for (const leg of routesData.routes[0].legs) {
              if (leg.travelAdvisory?.tollInfo?.estimatedPrice?.[0]) {
                const toll = leg.travelAdvisory.tollInfo.estimatedPrice[0];
                totalToll += parseFloat(toll.units || "0") + (parseFloat(toll.nanos || "0") / 1000000000);
                currency = toll.currencyCode || "BRL";
              }
            }
            if (totalToll > 0) {
              tollCost = {
                amount: totalToll.toFixed(2),
                currency,
              };
            }
          }
          
          if (routesData.error) {
            console.log("Routes API error:", routesData.error);
          }
        } catch (tollError) {
          console.log("Could not fetch toll information:", tollError);
        }
      }

      // Format distance and duration
      const formatDistance = (meters: number) => {
        if (meters >= 1000) {
          return `${(meters / 1000).toFixed(1)} km`;
        }
        return `${meters} m`;
      };

      const formatDuration = (seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        if (hours > 0) {
          return `${hours} h ${minutes} min`;
        }
        return `${minutes} mins`;
      };

      // Extract waypoint addresses
      const waypointAddresses = waypoints.map((wp: any) => wp.address);

      const result = {
        distance: { text: formatDistance(totalDistance), value: totalDistance },
        duration: { text: formatDuration(totalDuration), value: totalDuration },
        durationInTraffic: hasTrafficData 
          ? { text: formatDuration(totalDurationInTraffic), value: totalDurationInTraffic }
          : null,
        tollCost,
        originAddress: legs[0].start_address,
        destinationAddress: legs[legs.length - 1].end_address,
        waypointAddresses: waypointAddresses.length > 0 ? waypointAddresses : undefined,
      };

      res.json(result);
    } catch (error) {
      console.error("Error calculating route:", error);
      res.status(500).json({ message: "Failed to calculate route" });
    }
  });

  // ============== PRESTAÇÃO DE CONTAS (Expense Settlements) ==============
  app.get("/api/expense-settlements", async (req, res) => {
    try {
      const settlements = await storage.getExpenseSettlements();
      
      // Enrich with related data
      const enrichedSettlements = await Promise.all(
        settlements.map(async (settlement) => {
          const [transport, driver, items] = await Promise.all([
            storage.getTransport(settlement.transportId),
            storage.getDriver(settlement.driverId),
            storage.getExpenseSettlementItems(settlement.id),
          ]);
          
          // Get transport related data
          let client = null;
          let deliveryLocation = null;
          let originYard = null;
          
          if (transport) {
            [client, deliveryLocation, originYard] = await Promise.all([
              transport.clientId ? storage.getClient(transport.clientId) : null,
              transport.deliveryLocationId ? storage.getDeliveryLocation(transport.deliveryLocationId) : null,
              transport.originYardId ? storage.getYard(transport.originYardId) : null,
            ]);
          }
          
          return {
            ...settlement,
            transport: transport ? { ...transport, client, deliveryLocation, originYard } : null,
            driver,
            items,
          };
        })
      );
      
      res.json(enrichedSettlements);
    } catch (error) {
      console.error("Error fetching expense settlements:", error);
      res.status(500).json({ message: "Failed to fetch expense settlements" });
    }
  });

  app.get("/api/expense-settlements/:id", async (req, res) => {
    try {
      const settlement = await storage.getExpenseSettlement(req.params.id);
      if (!settlement) {
        return res.status(404).json({ message: "Expense settlement not found" });
      }
      
      const [transport, driver, items] = await Promise.all([
        storage.getTransport(settlement.transportId),
        storage.getDriver(settlement.driverId),
        storage.getExpenseSettlementItems(settlement.id),
      ]);
      
      let client = null;
      let deliveryLocation = null;
      let originYard = null;
      
      if (transport) {
        [client, deliveryLocation, originYard] = await Promise.all([
          transport.clientId ? storage.getClient(transport.clientId) : null,
          transport.deliveryLocationId ? storage.getDeliveryLocation(transport.deliveryLocationId) : null,
          transport.originYardId ? storage.getYard(transport.originYardId) : null,
        ]);
      }
      
      res.json({
        ...settlement,
        transport: transport ? { ...transport, client, deliveryLocation, originYard } : null,
        driver,
        items,
      });
    } catch (error) {
      console.error("Error fetching expense settlement:", error);
      res.status(500).json({ message: "Failed to fetch expense settlement" });
    }
  });

  app.post("/api/expense-settlements", async (req, res) => {
    try {
      const settlement = await storage.createExpenseSettlement(req.body);
      res.status(201).json(settlement);
    } catch (error) {
      console.error("Error creating expense settlement:", error);
      res.status(500).json({ message: "Failed to create expense settlement" });
    }
  });

  app.patch("/api/expense-settlements/:id", async (req, res) => {
    try {
      const settlement = await storage.updateExpenseSettlement(req.params.id, req.body);
      if (!settlement) {
        return res.status(404).json({ message: "Expense settlement not found" });
      }
      res.json(settlement);
    } catch (error) {
      console.error("Error updating expense settlement:", error);
      res.status(500).json({ message: "Failed to update expense settlement" });
    }
  });

  // Devolver prestação para motorista
  app.post("/api/expense-settlements/:id/return", async (req, res) => {
    try {
      const { returnReason } = req.body;
      const settlement = await storage.updateExpenseSettlement(req.params.id, {
        status: "devolvido",
        returnReason,
        reviewedAt: new Date(),
      });
      if (!settlement) {
        return res.status(404).json({ message: "Expense settlement not found" });
      }
      res.json(settlement);
    } catch (error) {
      console.error("Error returning expense settlement:", error);
      res.status(500).json({ message: "Failed to return expense settlement" });
    }
  });

  // Aprovar prestação de contas
  app.post("/api/expense-settlements/:id/approve", async (req, res) => {
    try {
      const settlement = await storage.updateExpenseSettlement(req.params.id, {
        status: "aprovado",
        approvedAt: new Date(),
        reviewedAt: new Date(),
      });
      if (!settlement) {
        return res.status(404).json({ message: "Expense settlement not found" });
      }
      res.json(settlement);
    } catch (error) {
      console.error("Error approving expense settlement:", error);
      res.status(500).json({ message: "Failed to approve expense settlement" });
    }
  });

  app.delete("/api/expense-settlements/:id", async (req, res) => {
    try {
      await storage.deleteExpenseSettlement(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting expense settlement:", error);
      res.status(500).json({ message: "Failed to delete expense settlement" });
    }
  });

  // Settlement Items
  app.get("/api/expense-settlements/:settlementId/items", async (req, res) => {
    try {
      const items = await storage.getExpenseSettlementItems(req.params.settlementId);
      res.json(items);
    } catch (error) {
      console.error("Error fetching expense settlement items:", error);
      res.status(500).json({ message: "Failed to fetch expense settlement items" });
    }
  });

  app.post("/api/expense-settlements/:settlementId/items", async (req, res) => {
    try {
      const item = await storage.createExpenseSettlementItem({
        ...req.body,
        settlementId: req.params.settlementId,
      });
      res.status(201).json(item);
    } catch (error) {
      console.error("Error creating expense settlement item:", error);
      res.status(500).json({ message: "Failed to create expense settlement item" });
    }
  });

  app.patch("/api/expense-settlement-items/:id", async (req, res) => {
    try {
      const item = await storage.updateExpenseSettlementItem(req.params.id, req.body);
      if (!item) {
        return res.status(404).json({ message: "Expense settlement item not found" });
      }
      res.json(item);
    } catch (error) {
      console.error("Error updating expense settlement item:", error);
      res.status(500).json({ message: "Failed to update expense settlement item" });
    }
  });

  app.delete("/api/expense-settlement-items/:id", async (req, res) => {
    try {
      await storage.deleteExpenseSettlementItem(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting expense settlement item:", error);
      res.status(500).json({ message: "Failed to delete expense settlement item" });
    }
  });

  return httpServer;
}
