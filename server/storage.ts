import {
  drivers, type Driver, type InsertDriver,
  manufacturers, type Manufacturer, type InsertManufacturer,
  yards, type Yard, type InsertYard,
  clients, type Client, type InsertClient,
  deliveryLocations, type DeliveryLocation, type InsertDeliveryLocation,
  vehicles, type Vehicle, type InsertVehicle,
  collects, type Collect, type InsertCollect,
  transports, type Transport, type InsertTransport,
  driverNotifications, type DriverNotification, type InsertDriverNotification,
  requestCounter,
  systemUsers, type SystemUser, type InsertSystemUser,
  rolePermissions, type RolePermission, type InsertRolePermission, type FeatureKey,
  expenseSettlements, type ExpenseSettlement, type InsertExpenseSettlement,
  expenseSettlementItems, type ExpenseSettlementItem, type InsertExpenseSettlementItem,
  checkpoints, type Checkpoint, type InsertCheckpoint,
  contracts, type Contract, type InsertContract,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql } from "drizzle-orm";

export interface IStorage {
  // Drivers
  getDrivers(): Promise<Driver[]>;
  getDriver(id: string): Promise<Driver | undefined>;
  createDriver(driver: InsertDriver): Promise<Driver>;
  updateDriver(id: string, driver: Partial<InsertDriver>): Promise<Driver | undefined>;
  deleteDriver(id: string): Promise<void>;

  // Manufacturers
  getManufacturers(): Promise<Manufacturer[]>;
  getManufacturer(id: string): Promise<Manufacturer | undefined>;
  createManufacturer(manufacturer: InsertManufacturer): Promise<Manufacturer>;
  updateManufacturer(id: string, manufacturer: Partial<InsertManufacturer>): Promise<Manufacturer | undefined>;
  deleteManufacturer(id: string): Promise<void>;

  // Yards
  getYards(): Promise<Yard[]>;
  getYard(id: string): Promise<Yard | undefined>;
  createYard(yard: InsertYard): Promise<Yard>;
  updateYard(id: string, yard: Partial<InsertYard>): Promise<Yard | undefined>;
  deleteYard(id: string): Promise<void>;

  // Clients
  getClients(): Promise<Client[]>;
  getClient(id: string): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: string, client: Partial<InsertClient>): Promise<Client | undefined>;
  deleteClient(id: string): Promise<void>;

  // Delivery Locations
  getAllDeliveryLocations(): Promise<DeliveryLocation[]>;
  getDeliveryLocations(clientId: string): Promise<DeliveryLocation[]>;
  getDeliveryLocation(id: string): Promise<DeliveryLocation | undefined>;
  createDeliveryLocation(location: InsertDeliveryLocation): Promise<DeliveryLocation>;
  updateDeliveryLocation(id: string, location: Partial<InsertDeliveryLocation>): Promise<DeliveryLocation | undefined>;
  deleteDeliveryLocation(id: string): Promise<void>;

  // Vehicles
  getVehicles(): Promise<Vehicle[]>;
  getVehicle(chassi: string): Promise<Vehicle | undefined>;
  createVehicle(vehicle: InsertVehicle): Promise<Vehicle>;
  updateVehicle(chassi: string, vehicle: Partial<InsertVehicle>): Promise<Vehicle | undefined>;
  deleteVehicle(chassi: string): Promise<void>;

  // Collects
  getCollects(): Promise<Collect[]>;
  getRecentCollects(limit?: number): Promise<Collect[]>;
  getCollect(id: string): Promise<Collect | undefined>;
  createCollect(collect: InsertCollect): Promise<Collect>;
  updateCollect(id: string, collect: Partial<InsertCollect>): Promise<Collect | undefined>;
  deleteCollect(id: string): Promise<void>;

  // Transports
  getTransports(): Promise<Transport[]>;
  getRecentTransports(limit?: number): Promise<Transport[]>;
  getTransport(id: string): Promise<Transport | undefined>;
  createTransport(transport: InsertTransport): Promise<Transport>;
  updateTransport(id: string, transport: Partial<InsertTransport>): Promise<Transport | undefined>;
  clearTransportCheckin(id: string): Promise<Transport | undefined>;
  clearTransportCheckout(id: string): Promise<Transport | undefined>;
  deleteTransport(id: string): Promise<void>;
  getNextRequestNumber(): Promise<string>;

  // Driver Notifications
  getDriverNotifications(yardId: string, deliveryLocationId: string, departureDate: string): Promise<DriverNotification[]>;
  createDriverNotification(notification: InsertDriverNotification): Promise<DriverNotification>;
  updateDriverNotification(id: string, data: Partial<InsertDriverNotification>): Promise<DriverNotification | undefined>;

  // System Users
  getSystemUsers(): Promise<SystemUser[]>;
  getSystemUser(id: string): Promise<SystemUser | undefined>;
  createSystemUser(user: InsertSystemUser): Promise<SystemUser>;
  updateSystemUser(id: string, user: Partial<InsertSystemUser>): Promise<SystemUser | undefined>;
  deleteSystemUser(id: string): Promise<void>;

  // Role Permissions
  getRolePermissions(): Promise<RolePermission[]>;
  getPermissionsByRole(role: string): Promise<RolePermission[]>;
  setRolePermissions(role: string, features: FeatureKey[]): Promise<void>;

  // Dashboard
  getDashboardStats(): Promise<{
    totalTransports: number;
    collectsInTransit: number;
    vehiclesInStock: number;
    activeDrivers: number;
  }>;

  // Expense Settlements
  getExpenseSettlements(): Promise<ExpenseSettlement[]>;
  getExpenseSettlement(id: string): Promise<ExpenseSettlement | undefined>;
  getExpenseSettlementByTransport(transportId: string): Promise<ExpenseSettlement | undefined>;
  createExpenseSettlement(settlement: InsertExpenseSettlement): Promise<ExpenseSettlement>;
  updateExpenseSettlement(id: string, settlement: Partial<InsertExpenseSettlement>): Promise<ExpenseSettlement | undefined>;
  deleteExpenseSettlement(id: string): Promise<void>;

  // Expense Settlement Items
  getExpenseSettlementItems(settlementId: string): Promise<ExpenseSettlementItem[]>;
  createExpenseSettlementItem(item: InsertExpenseSettlementItem): Promise<ExpenseSettlementItem>;
  updateExpenseSettlementItem(id: string, item: Partial<InsertExpenseSettlementItem>): Promise<ExpenseSettlementItem | undefined>;
  deleteExpenseSettlementItem(id: string): Promise<void>;

  // Checkpoints
  getCheckpoints(): Promise<Checkpoint[]>;
  getCheckpoint(id: string): Promise<Checkpoint | undefined>;
  createCheckpoint(checkpoint: InsertCheckpoint): Promise<Checkpoint>;
  updateCheckpoint(id: string, checkpoint: Partial<InsertCheckpoint>): Promise<Checkpoint | undefined>;
  deleteCheckpoint(id: string): Promise<void>;

  // Contracts
  getContracts(): Promise<Contract[]>;
  getContract(id: string): Promise<Contract | undefined>;
  createContract(contract: InsertContract): Promise<Contract>;
  updateContract(id: string, contract: Partial<InsertContract>): Promise<Contract | undefined>;
  deleteContract(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // Drivers
  async getDrivers(): Promise<Driver[]> {
    return db.select().from(drivers).orderBy(desc(drivers.createdAt));
  }

  async getDriver(id: string): Promise<Driver | undefined> {
    const [driver] = await db.select().from(drivers).where(eq(drivers.id, id));
    return driver;
  }

  async createDriver(driver: InsertDriver): Promise<Driver> {
    const [created] = await db.insert(drivers).values(driver).returning();
    return created;
  }

  async updateDriver(id: string, driver: Partial<InsertDriver>): Promise<Driver | undefined> {
    const [updated] = await db.update(drivers).set(driver).where(eq(drivers.id, id)).returning();
    return updated;
  }

  async deleteDriver(id: string): Promise<void> {
    await db.delete(drivers).where(eq(drivers.id, id));
  }

  // Manufacturers
  async getManufacturers(): Promise<Manufacturer[]> {
    return db.select().from(manufacturers).orderBy(desc(manufacturers.createdAt));
  }

  async getManufacturer(id: string): Promise<Manufacturer | undefined> {
    const [manufacturer] = await db.select().from(manufacturers).where(eq(manufacturers.id, id));
    return manufacturer;
  }

  async createManufacturer(manufacturer: InsertManufacturer): Promise<Manufacturer> {
    const [created] = await db.insert(manufacturers).values(manufacturer).returning();
    return created;
  }

  async updateManufacturer(id: string, manufacturer: Partial<InsertManufacturer>): Promise<Manufacturer | undefined> {
    const [updated] = await db.update(manufacturers).set(manufacturer).where(eq(manufacturers.id, id)).returning();
    return updated;
  }

  async deleteManufacturer(id: string): Promise<void> {
    await db.delete(manufacturers).where(eq(manufacturers.id, id));
  }

  // Yards
  async getYards(): Promise<Yard[]> {
    return db.select().from(yards).orderBy(desc(yards.createdAt));
  }

  async getYard(id: string): Promise<Yard | undefined> {
    const [yard] = await db.select().from(yards).where(eq(yards.id, id));
    return yard;
  }

  async createYard(yard: InsertYard): Promise<Yard> {
    const [created] = await db.insert(yards).values(yard).returning();
    return created;
  }

  async updateYard(id: string, yard: Partial<InsertYard>): Promise<Yard | undefined> {
    const [updated] = await db.update(yards).set(yard).where(eq(yards.id, id)).returning();
    return updated;
  }

  async deleteYard(id: string): Promise<void> {
    await db.delete(yards).where(eq(yards.id, id));
  }

  // Clients
  async getClients(): Promise<Client[]> {
    return db.select().from(clients).orderBy(desc(clients.createdAt));
  }

  async getClient(id: string): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.id, id));
    return client;
  }

  async createClient(client: InsertClient): Promise<Client> {
    const [created] = await db.insert(clients).values(client).returning();
    return created;
  }

  async updateClient(id: string, client: Partial<InsertClient>): Promise<Client | undefined> {
    const [updated] = await db.update(clients).set(client).where(eq(clients.id, id)).returning();
    return updated;
  }

  async deleteClient(id: string): Promise<void> {
    await db.delete(clients).where(eq(clients.id, id));
  }

  // Delivery Locations
  async getAllDeliveryLocations(): Promise<DeliveryLocation[]> {
    return db.select().from(deliveryLocations);
  }

  async getDeliveryLocations(clientId: string): Promise<DeliveryLocation[]> {
    return db.select().from(deliveryLocations).where(eq(deliveryLocations.clientId, clientId));
  }

  async getDeliveryLocation(id: string): Promise<DeliveryLocation | undefined> {
    const [location] = await db.select().from(deliveryLocations).where(eq(deliveryLocations.id, id));
    return location;
  }

  async createDeliveryLocation(location: InsertDeliveryLocation): Promise<DeliveryLocation> {
    const [created] = await db.insert(deliveryLocations).values(location).returning();
    return created;
  }

  async updateDeliveryLocation(id: string, location: Partial<InsertDeliveryLocation>): Promise<DeliveryLocation | undefined> {
    const [updated] = await db.update(deliveryLocations).set(location).where(eq(deliveryLocations.id, id)).returning();
    return updated;
  }

  async deleteDeliveryLocation(id: string): Promise<void> {
    await db.delete(deliveryLocations).where(eq(deliveryLocations.id, id));
  }

  // Vehicles
  async getVehicles(): Promise<Vehicle[]> {
    return db.select().from(vehicles).orderBy(desc(vehicles.createdAt));
  }

  async getVehicle(chassi: string): Promise<Vehicle | undefined> {
    const [vehicle] = await db.select().from(vehicles).where(eq(vehicles.chassi, chassi));
    return vehicle;
  }

  async createVehicle(vehicle: InsertVehicle): Promise<Vehicle> {
    const [created] = await db.insert(vehicles).values(vehicle).returning();
    return created;
  }

  async updateVehicle(chassi: string, vehicle: Partial<InsertVehicle>): Promise<Vehicle | undefined> {
    const [updated] = await db.update(vehicles).set(vehicle).where(eq(vehicles.chassi, chassi)).returning();
    return updated;
  }

  async deleteVehicle(chassi: string): Promise<void> {
    await db.delete(vehicles).where(eq(vehicles.chassi, chassi));
  }

  // Collects
  async getCollects(): Promise<Collect[]> {
    return db.select().from(collects).orderBy(desc(collects.createdAt));
  }

  async getRecentCollects(limit = 5): Promise<Collect[]> {
    return db.select().from(collects).orderBy(desc(collects.createdAt)).limit(limit);
  }

  async getCollect(id: string): Promise<Collect | undefined> {
    const [collect] = await db.select().from(collects).where(eq(collects.id, id));
    return collect;
  }

  async createCollect(collect: InsertCollect): Promise<Collect> {
    const [created] = await db.insert(collects).values(collect).returning();
    return created;
  }

  async updateCollect(id: string, collect: Partial<InsertCollect>): Promise<Collect | undefined> {
    const [updated] = await db.update(collects).set(collect).where(eq(collects.id, id)).returning();
    return updated;
  }

  async deleteCollect(id: string): Promise<void> {
    await db.delete(collects).where(eq(collects.id, id));
  }

  // Transports
  async getTransports(): Promise<Transport[]> {
    return db.select().from(transports).orderBy(desc(transports.createdAt));
  }

  async getRecentTransports(limit = 5): Promise<Transport[]> {
    return db.select().from(transports).orderBy(desc(transports.createdAt)).limit(limit);
  }

  async getTransport(id: string): Promise<Transport | undefined> {
    const [transport] = await db.select().from(transports).where(eq(transports.id, id));
    return transport;
  }

  async createTransport(transport: InsertTransport): Promise<Transport> {
    const requestNumber = await this.getNextRequestNumber();
    const [created] = await db.insert(transports).values({ ...transport, requestNumber }).returning();
    return created;
  }

  async updateTransport(id: string, transport: Partial<InsertTransport>): Promise<Transport | undefined> {
    const [updated] = await db.update(transports).set(transport).where(eq(transports.id, id)).returning();
    return updated;
  }

  async clearTransportCheckin(id: string): Promise<Transport | undefined> {
    const [updated] = await db.update(transports).set({
      checkinDateTime: sql`NULL`,
      checkinLatitude: "",
      checkinLongitude: "",
      checkinFrontalPhoto: "",
      checkinLateral1Photo: "",
      checkinLateral2Photo: "",
      checkinTraseiraPhoto: "",
      checkinOdometerPhoto: "",
      checkinFuelLevelPhoto: "",
      checkinDamagePhotos: [],
      checkinSelfiePhoto: "",
      checkinNotes: "",
      status: "pendente",
    } as any).where(eq(transports.id, id)).returning();
    return updated;
  }

  async clearTransportCheckout(id: string): Promise<Transport | undefined> {
    const [updated] = await db.update(transports).set({
      checkoutDateTime: sql`NULL`,
      checkoutLatitude: "",
      checkoutLongitude: "",
      checkoutFrontalPhoto: "",
      checkoutLateral1Photo: "",
      checkoutLateral2Photo: "",
      checkoutTraseiraPhoto: "",
      checkoutOdometerPhoto: "",
      checkoutFuelLevelPhoto: "",
      checkoutDamagePhotos: [],
      checkoutSelfiePhoto: "",
      checkoutNotes: "",
      status: "em_transito",
    } as any).where(eq(transports.id, id)).returning();
    return updated;
  }

  async deleteTransport(id: string): Promise<void> {
    await db.delete(transports).where(eq(transports.id, id));
  }

  async getNextRequestNumber(): Promise<string> {
    const result = await db
      .insert(requestCounter)
      .values({ id: "transport_counter", lastNumber: 1 })
      .onConflictDoUpdate({
        target: requestCounter.id,
        set: { lastNumber: sql`${requestCounter.lastNumber} + 1` },
      })
      .returning();

    const num = result[0]?.lastNumber || 1;
    return `OTD${String(num).padStart(5, "0")}`;
  }

  // Driver Notifications
  async getDriverNotifications(yardId: string, deliveryLocationId: string, departureDate: string): Promise<DriverNotification[]> {
    return db
      .select()
      .from(driverNotifications)
      .where(
        and(
          eq(driverNotifications.yardId, yardId),
          eq(driverNotifications.deliveryLocationId, deliveryLocationId),
          eq(driverNotifications.departureDate, departureDate)
        )
      )
      .orderBy(desc(driverNotifications.createdAt));
  }

  async createDriverNotification(notification: InsertDriverNotification): Promise<DriverNotification> {
    const [created] = await db.insert(driverNotifications).values(notification).returning();
    return created;
  }

  async updateDriverNotification(id: string, data: Partial<InsertDriverNotification>): Promise<DriverNotification | undefined> {
    const [updated] = await db
      .update(driverNotifications)
      .set({ ...data, respondedAt: new Date() })
      .where(eq(driverNotifications.id, id))
      .returning();
    return updated;
  }

  // System Users
  async getSystemUsers(): Promise<SystemUser[]> {
    return db.select().from(systemUsers).orderBy(desc(systemUsers.createdAt));
  }

  async getSystemUser(id: string): Promise<SystemUser | undefined> {
    const [user] = await db.select().from(systemUsers).where(eq(systemUsers.id, id));
    return user;
  }

  async createSystemUser(user: InsertSystemUser): Promise<SystemUser> {
    const [created] = await db.insert(systemUsers).values(user).returning();
    return created;
  }

  async updateSystemUser(id: string, user: Partial<InsertSystemUser>): Promise<SystemUser | undefined> {
    const [updated] = await db.update(systemUsers).set(user).where(eq(systemUsers.id, id)).returning();
    return updated;
  }

  async deleteSystemUser(id: string): Promise<void> {
    await db.delete(systemUsers).where(eq(systemUsers.id, id));
  }

  // Role Permissions
  async getRolePermissions(): Promise<RolePermission[]> {
    return db.select().from(rolePermissions);
  }

  async getPermissionsByRole(role: string): Promise<RolePermission[]> {
    return db.select().from(rolePermissions).where(eq(rolePermissions.role, role as any));
  }

  async setRolePermissions(role: string, features: FeatureKey[]): Promise<void> {
    await db.delete(rolePermissions).where(eq(rolePermissions.role, role as any));
    if (features.length > 0) {
      await db.insert(rolePermissions).values(
        features.map((feature) => ({ role: role as any, feature }))
      );
    }
  }

  // Dashboard
  async getDashboardStats(): Promise<{
    totalTransports: number;
    collectsInTransit: number;
    vehiclesInStock: number;
    activeDrivers: number;
  }> {
    const [transportCount] = await db.select({ count: sql<number>`count(*)` }).from(transports);
    const [collectCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(collects)
      .where(eq(collects.status, "em_transito"));
    const [vehicleCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(vehicles)
      .where(eq(vehicles.status, "em_estoque"));
    const [driverCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(drivers)
      .where(eq(drivers.isActive, "true"));

    return {
      totalTransports: Number(transportCount?.count || 0),
      collectsInTransit: Number(collectCount?.count || 0),
      vehiclesInStock: Number(vehicleCount?.count || 0),
      activeDrivers: Number(driverCount?.count || 0),
    };
  }

  // Expense Settlements
  async getExpenseSettlements(): Promise<ExpenseSettlement[]> {
    return db.select().from(expenseSettlements).orderBy(desc(expenseSettlements.createdAt));
  }

  async getExpenseSettlement(id: string): Promise<ExpenseSettlement | undefined> {
    const [settlement] = await db.select().from(expenseSettlements).where(eq(expenseSettlements.id, id));
    return settlement;
  }

  async getExpenseSettlementByTransport(transportId: string): Promise<ExpenseSettlement | undefined> {
    const [settlement] = await db.select().from(expenseSettlements).where(eq(expenseSettlements.transportId, transportId));
    return settlement;
  }

  async createExpenseSettlement(settlement: InsertExpenseSettlement): Promise<ExpenseSettlement> {
    const [created] = await db.insert(expenseSettlements).values(settlement).returning();
    return created;
  }

  async updateExpenseSettlement(id: string, settlement: Partial<InsertExpenseSettlement>): Promise<ExpenseSettlement | undefined> {
    const [updated] = await db.update(expenseSettlements).set(settlement).where(eq(expenseSettlements.id, id)).returning();
    return updated;
  }

  async deleteExpenseSettlement(id: string): Promise<void> {
    // First delete items
    await db.delete(expenseSettlementItems).where(eq(expenseSettlementItems.settlementId, id));
    // Then delete settlement
    await db.delete(expenseSettlements).where(eq(expenseSettlements.id, id));
  }

  // Expense Settlement Items
  async getExpenseSettlementItems(settlementId: string): Promise<ExpenseSettlementItem[]> {
    return db.select().from(expenseSettlementItems).where(eq(expenseSettlementItems.settlementId, settlementId)).orderBy(desc(expenseSettlementItems.createdAt));
  }

  async createExpenseSettlementItem(item: InsertExpenseSettlementItem): Promise<ExpenseSettlementItem> {
    const [created] = await db.insert(expenseSettlementItems).values(item).returning();
    return created;
  }

  async updateExpenseSettlementItem(id: string, item: Partial<InsertExpenseSettlementItem>): Promise<ExpenseSettlementItem | undefined> {
    const [updated] = await db.update(expenseSettlementItems).set(item).where(eq(expenseSettlementItems.id, id)).returning();
    return updated;
  }

  async deleteExpenseSettlementItem(id: string): Promise<void> {
    await db.delete(expenseSettlementItems).where(eq(expenseSettlementItems.id, id));
  }

  // Checkpoints
  async getCheckpoints(): Promise<Checkpoint[]> {
    return db.select().from(checkpoints).orderBy(desc(checkpoints.createdAt));
  }

  async getCheckpoint(id: string): Promise<Checkpoint | undefined> {
    const [checkpoint] = await db.select().from(checkpoints).where(eq(checkpoints.id, id));
    return checkpoint;
  }

  async createCheckpoint(checkpoint: InsertCheckpoint): Promise<Checkpoint> {
    const [created] = await db.insert(checkpoints).values(checkpoint).returning();
    return created;
  }

  async updateCheckpoint(id: string, checkpoint: Partial<InsertCheckpoint>): Promise<Checkpoint | undefined> {
    const [updated] = await db.update(checkpoints).set(checkpoint).where(eq(checkpoints.id, id)).returning();
    return updated;
  }

  async deleteCheckpoint(id: string): Promise<void> {
    await db.delete(checkpoints).where(eq(checkpoints.id, id));
  }

  // Contracts
  async getContracts(): Promise<Contract[]> {
    return db.select().from(contracts).orderBy(desc(contracts.createdAt));
  }

  async getContract(id: string): Promise<Contract | undefined> {
    const [contract] = await db.select().from(contracts).where(eq(contracts.id, id));
    return contract;
  }

  async createContract(contract: InsertContract): Promise<Contract> {
    const [created] = await db.insert(contracts).values(contract).returning();
    return created;
  }

  async updateContract(id: string, contract: Partial<InsertContract>): Promise<Contract | undefined> {
    const [updated] = await db.update(contracts).set({ ...contract, updatedAt: new Date() }).where(eq(contracts.id, id)).returning();
    return updated;
  }

  async deleteContract(id: string): Promise<void> {
    await db.delete(contracts).where(eq(contracts.id, id));
  }
}

export const storage = new DatabaseStorage();
