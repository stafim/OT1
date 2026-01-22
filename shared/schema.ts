import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, date, integer, pgEnum, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Re-export auth models
export * from "./models/auth";

// Enums
export const vehicleStatusEnum = pgEnum("vehicle_status", [
  "pre_estoque",
  "em_estoque",
  "despachado",
  "entregue",
  "retirado"
]);

export const transportStatusEnum = pgEnum("transport_status", [
  "pendente",
  "aguardando_saida",
  "em_transito",
  "entregue",
  "cancelado"
]);

export const collectStatusEnum = pgEnum("collect_status", [
  "em_transito",
  "aguardando_checkout",
  "finalizada"
]);

export const driverModalityEnum = pgEnum("driver_modality", [
  "pj",
  "clt",
  "agregado"
]);

export const driverNotificationStatusEnum = pgEnum("driver_notification_status", [
  "pendente",
  "aceito",
  "recusado"
]);

// Brazilian states
export const brazilianStates = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO"
] as const;

// CNH Types
export const cnhTypes = ["A", "B", "C", "D", "E", "AB", "AC", "AD", "AE"] as const;

// ============== MOTORISTAS (Drivers) ==============
export const drivers = pgTable("drivers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  cpf: varchar("cpf", { length: 14 }).notNull().unique(),
  phone: varchar("phone", { length: 20 }).notNull(),
  email: varchar("email", { length: 255 }),
  birthDate: date("birth_date"),
  cep: varchar("cep", { length: 10 }),
  address: text("address"),
  addressNumber: varchar("address_number", { length: 20 }),
  complement: text("complement"),
  neighborhood: text("neighborhood"),
  city: text("city"),
  state: varchar("state", { length: 2 }),
  latitude: text("latitude"),
  longitude: text("longitude"),
  modality: driverModalityEnum("modality").notNull(),
  cnhType: varchar("cnh_type", { length: 5 }).notNull(),
  cnhFrontPhoto: text("cnh_front_photo"),
  cnhBackPhoto: text("cnh_back_photo"),
  isApto: text("is_apto").default("false"),
  isActive: text("is_active").default("true"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const driversRelations = relations(drivers, ({ many }) => ({
  transports: many(transports),
  collects: many(collects),
  driverNotifications: many(driverNotifications),
}));

export const insertDriverSchema = createInsertSchema(drivers).omit({
  id: true,
  createdAt: true,
}).extend({
  cpf: z.string().min(11, "CPF inválido").max(14),
  phone: z.string().min(10, "Telefone inválido"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  modality: z.enum(["pj", "clt", "agregado"]),
  cnhType: z.enum(cnhTypes),
  state: z.enum(brazilianStates).optional(),
});

export type InsertDriver = z.infer<typeof insertDriverSchema>;
export type Driver = typeof drivers.$inferSelect;

// ============== MONTADORAS (Manufacturers) ==============
export const manufacturers = pgTable("manufacturers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  cep: varchar("cep", { length: 10 }),
  address: text("address"),
  addressNumber: varchar("address_number", { length: 20 }),
  complement: text("complement"),
  neighborhood: text("neighborhood"),
  city: text("city"),
  state: varchar("state", { length: 2 }),
  latitude: text("latitude"),
  longitude: text("longitude"),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 255 }),
  contactName: text("contact_name"),
  isActive: text("is_active").default("true"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const manufacturersRelations = relations(manufacturers, ({ many }) => ({
  collects: many(collects),
  vehicles: many(vehicles),
}));

export const insertManufacturerSchema = createInsertSchema(manufacturers).omit({
  id: true,
  createdAt: true,
}).extend({
  name: z.string().min(2, "Nome é obrigatório"),
  state: z.enum(brazilianStates).optional(),
});

export type InsertManufacturer = z.infer<typeof insertManufacturerSchema>;
export type Manufacturer = typeof manufacturers.$inferSelect;

// ============== PÁTIOS (Yards) ==============
export const yards = pgTable("yards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  cep: varchar("cep", { length: 10 }),
  address: text("address"),
  addressNumber: varchar("address_number", { length: 20 }),
  complement: text("complement"),
  neighborhood: text("neighborhood"),
  city: text("city"),
  state: varchar("state", { length: 2 }),
  latitude: text("latitude"),
  longitude: text("longitude"),
  phone: varchar("phone", { length: 20 }),
  maxVehicles: integer("max_vehicles"),
  isActive: text("is_active").default("true"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const yardsRelations = relations(yards, ({ many }) => ({
  collectsAsDestination: many(collects),
  transportsAsOrigin: many(transports),
  vehicles: many(vehicles),
  driverNotifications: many(driverNotifications),
}));

export const insertYardSchema = createInsertSchema(yards).omit({
  id: true,
  createdAt: true,
}).extend({
  name: z.string().min(2, "Nome é obrigatório"),
  state: z.enum(brazilianStates).optional(),
});

export type InsertYard = z.infer<typeof insertYardSchema>;
export type Yard = typeof yards.$inferSelect;

// ============== CLIENTES (Clients) ==============
export const clients = pgTable("clients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  cnpj: varchar("cnpj", { length: 20 }),
  cep: varchar("cep", { length: 10 }),
  address: text("address"),
  addressNumber: varchar("address_number", { length: 20 }),
  complement: text("complement"),
  neighborhood: text("neighborhood"),
  city: text("city"),
  state: varchar("state", { length: 2 }),
  latitude: text("latitude"),
  longitude: text("longitude"),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 255 }),
  contactName: text("contact_name"),
  dailyCost: text("daily_cost"),
  username: varchar("username", { length: 100 }),
  password: varchar("password", { length: 255 }),
  isActive: text("is_active").default("true"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const clientsRelations = relations(clients, ({ many }) => ({
  deliveryLocations: many(deliveryLocations),
  vehicles: many(vehicles),
  transports: many(transports),
}));

export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  createdAt: true,
}).extend({
  name: z.string().min(2, "Nome é obrigatório"),
  cnpj: z.string().optional(),
});

export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clients.$inferSelect;

// ============== LOCAIS DE ENTREGA (Delivery Locations) ==============
export const deliveryLocations = pgTable("delivery_locations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id),
  name: text("name").notNull(),
  cnpj: varchar("cnpj", { length: 20 }),
  cep: varchar("cep", { length: 20 }),
  address: text("address").notNull(),
  addressNumber: varchar("address_number", { length: 20 }),
  complement: text("complement"),
  neighborhood: text("neighborhood"),
  city: text("city").notNull(),
  state: varchar("state", { length: 50 }),
  country: varchar("country", { length: 50 }).default("Brasil"),
  latitude: text("latitude"),
  longitude: text("longitude"),
  responsibleName: text("responsible_name"),
  responsiblePhone: varchar("responsible_phone", { length: 20 }),
  emails: text("emails").array(),
  isActive: text("is_active").default("true"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const deliveryLocationsRelations = relations(deliveryLocations, ({ one, many }) => ({
  client: one(clients, {
    fields: [deliveryLocations.clientId],
    references: [clients.id],
  }),
  transports: many(transports),
  driverNotifications: many(driverNotifications),
}));

export const insertDeliveryLocationSchema = createInsertSchema(deliveryLocations).omit({
  id: true,
  createdAt: true,
}).extend({
  name: z.string().min(2, "Nome do local é obrigatório"),
  cnpj: z.string().optional(),
  cep: z.string().optional(),
  address: z.string().min(5, "Endereço é obrigatório"),
  addressNumber: z.string().optional(),
  complement: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().min(2, "Município é obrigatório"),
  state: z.string().optional(),
  responsibleName: z.string().min(2, "Nome do responsável é obrigatório"),
  responsiblePhone: z.string().optional(),
  emails: z.array(z.string().email("Email inválido")).min(1, "Pelo menos um email é obrigatório"),
});

export type InsertDeliveryLocation = z.infer<typeof insertDeliveryLocationSchema>;
export type DeliveryLocation = typeof deliveryLocations.$inferSelect;

// ============== ESTOQUE / VEÍCULOS (Vehicles) ==============
export const vehicles = pgTable("vehicles", {
  chassi: varchar("chassi", { length: 50 }).primaryKey(),
  clientId: varchar("client_id").references(() => clients.id),
  yardId: varchar("yard_id").references(() => yards.id),
  manufacturerId: varchar("manufacturer_id").references(() => manufacturers.id),
  color: text("color"),
  status: vehicleStatusEnum("status").default("pre_estoque").notNull(),
  collectDateTime: timestamp("collect_date_time"),
  yardEntryDateTime: timestamp("yard_entry_date_time"),
  dispatchDateTime: timestamp("dispatch_date_time"),
  deliveryDateTime: timestamp("delivery_date_time"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const vehiclesRelations = relations(vehicles, ({ one, many }) => ({
  client: one(clients, {
    fields: [vehicles.clientId],
    references: [clients.id],
  }),
  yard: one(yards, {
    fields: [vehicles.yardId],
    references: [yards.id],
  }),
  manufacturer: one(manufacturers, {
    fields: [vehicles.manufacturerId],
    references: [manufacturers.id],
  }),
  collects: many(collects),
  transports: many(transports),
}));

export const insertVehicleSchema = createInsertSchema(vehicles).omit({
  createdAt: true,
}).extend({
  chassi: z.string().min(17, "Chassi deve ter no mínimo 17 caracteres").max(50),
  status: z.enum(["pre_estoque", "em_estoque", "despachado", "entregue", "retirado"]).optional(),
});

export type InsertVehicle = z.infer<typeof insertVehicleSchema>;
export type Vehicle = typeof vehicles.$inferSelect;

// ============== COLETAS (Collects) ==============
export const collects = pgTable("collects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vehicleChassi: varchar("vehicle_chassi", { length: 50 }).notNull(),
  manufacturerId: varchar("manufacturer_id").notNull().references(() => manufacturers.id),
  yardId: varchar("yard_id").notNull().references(() => yards.id),
  driverId: varchar("driver_id").references(() => drivers.id),
  status: collectStatusEnum("status").default("em_transito").notNull(),
  collectDate: timestamp("collect_date"),
  notes: text("notes"),
  // Check-in fields (at manufacturer pickup)
  checkinDateTime: timestamp("checkin_date_time"),
  checkinLatitude: text("checkin_latitude"),
  checkinLongitude: text("checkin_longitude"),
  checkinFrontalPhoto: text("checkin_frontal_photo"),
  checkinLateral1Photo: text("checkin_lateral1_photo"),
  checkinLateral2Photo: text("checkin_lateral2_photo"),
  checkinTraseiraPhoto: text("checkin_traseira_photo"),
  checkinOdometerPhoto: text("checkin_odometer_photo"),
  checkinFuelLevelPhoto: text("checkin_fuel_level_photo"),
  checkinDamagePhotos: text("checkin_damage_photos").array(),
  checkinSelfiePhoto: text("checkin_selfie_photo"),
  checkinNotes: text("checkin_notes"),
  // Check-out fields (at yard delivery)
  checkoutDateTime: timestamp("checkout_date_time"),
  checkoutLatitude: text("checkout_latitude"),
  checkoutLongitude: text("checkout_longitude"),
  checkoutApprovedById: varchar("checkout_approved_by_id"),
  checkoutFrontalPhoto: text("checkout_frontal_photo"),
  checkoutLateral1Photo: text("checkout_lateral1_photo"),
  checkoutLateral2Photo: text("checkout_lateral2_photo"),
  checkoutTraseiraPhoto: text("checkout_traseira_photo"),
  checkoutOdometerPhoto: text("checkout_odometer_photo"),
  checkoutFuelLevelPhoto: text("checkout_fuel_level_photo"),
  checkoutDamagePhotos: text("checkout_damage_photos").array(),
  checkoutSelfiePhoto: text("checkout_selfie_photo"),
  checkoutNotes: text("checkout_notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const collectsRelations = relations(collects, ({ one }) => ({
  vehicle: one(vehicles, {
    fields: [collects.vehicleChassi],
    references: [vehicles.chassi],
  }),
  manufacturer: one(manufacturers, {
    fields: [collects.manufacturerId],
    references: [manufacturers.id],
  }),
  yard: one(yards, {
    fields: [collects.yardId],
    references: [yards.id],
  }),
  driver: one(drivers, {
    fields: [collects.driverId],
    references: [drivers.id],
  }),
}));

export const insertCollectSchema = createInsertSchema(collects).omit({
  id: true,
  createdAt: true,
}).extend({
  vehicleChassi: z.string().min(17, "Chassi deve ter no mínimo 17 caracteres"),
  manufacturerId: z.string().min(1, "Montadora é obrigatória"),
  yardId: z.string().min(1, "Pátio de destino é obrigatório"),
  driverId: z.string().optional(),
  collectDate: z.union([z.string(), z.date()]).optional().transform(val => val ? new Date(val) : undefined),
  notes: z.string().optional(),
  checkinDateTime: z.union([z.string(), z.date()]).optional().transform(val => val ? new Date(val) : undefined),
  checkinFrontalPhoto: z.string().optional(),
  checkinLateral1Photo: z.string().optional(),
  checkinLateral2Photo: z.string().optional(),
  checkinTraseiraPhoto: z.string().optional(),
  checkinOdometerPhoto: z.string().optional(),
  checkinFuelLevelPhoto: z.string().optional(),
  checkinDamagePhotos: z.array(z.string()).optional(),
  checkinSelfiePhoto: z.string().optional(),
  checkinNotes: z.string().optional(),
  checkoutDateTime: z.union([z.string(), z.date()]).optional().transform(val => val ? new Date(val) : undefined),
  checkoutFrontalPhoto: z.string().optional(),
  checkoutLateral1Photo: z.string().optional(),
  checkoutLateral2Photo: z.string().optional(),
  checkoutTraseiraPhoto: z.string().optional(),
  checkoutOdometerPhoto: z.string().optional(),
  checkoutFuelLevelPhoto: z.string().optional(),
  checkoutDamagePhotos: z.array(z.string()).optional(),
  checkoutSelfiePhoto: z.string().optional(),
  checkoutNotes: z.string().optional(),
});

export type InsertCollect = z.infer<typeof insertCollectSchema>;
export type Collect = typeof collects.$inferSelect;

// ============== TRANSPORTES (Transports) ==============
export const transports = pgTable("transports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  requestNumber: varchar("request_number", { length: 20 }).notNull().unique(),
  vehicleChassi: varchar("vehicle_chassi", { length: 50 }).notNull().references(() => vehicles.chassi),
  clientId: varchar("client_id").notNull().references(() => clients.id),
  originYardId: varchar("origin_yard_id").notNull().references(() => yards.id),
  deliveryLocationId: varchar("delivery_location_id").notNull().references(() => deliveryLocations.id),
  driverId: varchar("driver_id").references(() => drivers.id),
  status: transportStatusEnum("status").default("pendente").notNull(),
  deliveryDate: date("delivery_date"),
  notes: text("notes"),
  documents: text("documents").array(),
  createdAt: timestamp("created_at").defaultNow(),
  createdByUserId: varchar("created_by_user_id"),
  driverAssignedByUserId: varchar("driver_assigned_by_user_id"),
  driverAssignedAt: timestamp("driver_assigned_at"),
  transitStartedAt: timestamp("transit_started_at"),
  // Check-in fields (pickup from yard)
  checkinDateTime: timestamp("checkin_date_time"),
  checkinLatitude: text("checkin_latitude"),
  checkinLongitude: text("checkin_longitude"),
  checkinFrontalPhoto: text("checkin_frontal_photo"),
  checkinLateral1Photo: text("checkin_lateral1_photo"),
  checkinLateral2Photo: text("checkin_lateral2_photo"),
  checkinTraseiraPhoto: text("checkin_traseira_photo"),
  checkinOdometerPhoto: text("checkin_odometer_photo"),
  checkinFuelLevelPhoto: text("checkin_fuel_level_photo"),
  checkinDamagePhotos: text("checkin_damage_photos").array(),
  checkinSelfiePhoto: text("checkin_selfie_photo"),
  checkinNotes: text("checkin_notes"),
  // Check-out fields (delivery to client)
  checkoutDateTime: timestamp("checkout_date_time"),
  checkoutLatitude: text("checkout_latitude"),
  checkoutLongitude: text("checkout_longitude"),
  checkoutFrontalPhoto: text("checkout_frontal_photo"),
  checkoutLateral1Photo: text("checkout_lateral1_photo"),
  checkoutLateral2Photo: text("checkout_lateral2_photo"),
  checkoutTraseiraPhoto: text("checkout_traseira_photo"),
  checkoutOdometerPhoto: text("checkout_odometer_photo"),
  checkoutFuelLevelPhoto: text("checkout_fuel_level_photo"),
  checkoutDamagePhotos: text("checkout_damage_photos").array(),
  checkoutSelfiePhoto: text("checkout_selfie_photo"),
  checkoutNotes: text("checkout_notes"),
  // Route information (calculated when transport is created)
  routeDistanceKm: numeric("route_distance_km"),
  routeDurationMinutes: integer("route_duration_minutes"),
  estimatedTolls: numeric("estimated_tolls"),
  estimatedFuel: numeric("estimated_fuel"),
});

export const transportsRelations = relations(transports, ({ one }) => ({
  vehicle: one(vehicles, {
    fields: [transports.vehicleChassi],
    references: [vehicles.chassi],
  }),
  client: one(clients, {
    fields: [transports.clientId],
    references: [clients.id],
  }),
  originYard: one(yards, {
    fields: [transports.originYardId],
    references: [yards.id],
  }),
  deliveryLocation: one(deliveryLocations, {
    fields: [transports.deliveryLocationId],
    references: [deliveryLocations.id],
  }),
  driver: one(drivers, {
    fields: [transports.driverId],
    references: [drivers.id],
  }),
  createdByUser: one(systemUsers, {
    fields: [transports.createdByUserId],
    references: [systemUsers.id],
  }),
  driverAssignedByUser: one(systemUsers, {
    fields: [transports.driverAssignedByUserId],
    references: [systemUsers.id],
  }),
}));

export const insertTransportSchema = createInsertSchema(transports).omit({
  id: true,
  requestNumber: true,
  createdAt: true,
}).extend({
  vehicleChassi: z.string().min(17, "Chassi é obrigatório"),
  clientId: z.string().min(1, "Cliente é obrigatório"),
  originYardId: z.string().min(1, "Pátio de origem é obrigatório"),
  deliveryLocationId: z.string().min(1, "Local de entrega é obrigatório"),
  driverId: z.string().optional().nullable(),
  status: z.enum(["pendente", "em_transito", "entregue", "cancelado"]).default("pendente"),
  deliveryDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  documents: z.array(z.string()).optional().nullable(),
  // Check-in fields
  checkinDateTime: z.union([z.string(), z.date()]).optional().transform(val => val ? new Date(val) : undefined),
  checkinFrontalPhoto: z.string().optional(),
  checkinLateral1Photo: z.string().optional(),
  checkinLateral2Photo: z.string().optional(),
  checkinTraseiraPhoto: z.string().optional(),
  checkinOdometerPhoto: z.string().optional(),
  checkinFuelLevelPhoto: z.string().optional(),
  checkinDamagePhotos: z.array(z.string()).optional(),
  checkinSelfiePhoto: z.string().optional(),
  checkinNotes: z.string().optional(),
  // Check-out fields
  checkoutDateTime: z.union([z.string(), z.date()]).optional().transform(val => val ? new Date(val) : undefined),
  checkoutFrontalPhoto: z.string().optional(),
  checkoutLateral1Photo: z.string().optional(),
  checkoutLateral2Photo: z.string().optional(),
  checkoutTraseiraPhoto: z.string().optional(),
  checkoutOdometerPhoto: z.string().optional(),
  checkoutFuelLevelPhoto: z.string().optional(),
  checkoutDamagePhotos: z.array(z.string()).optional(),
  checkoutSelfiePhoto: z.string().optional(),
  checkoutNotes: z.string().optional(),
});

export type InsertTransport = z.infer<typeof insertTransportSchema>;
export type Transport = typeof transports.$inferSelect;

// ============== NOTIFICAÇÕES DE MOTORISTA (Driver Notifications) ==============
export const driverNotifications = pgTable("driver_notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  yardId: varchar("yard_id").notNull().references(() => yards.id),
  deliveryLocationId: varchar("delivery_location_id").notNull().references(() => deliveryLocations.id),
  departureDate: date("departure_date").notNull(),
  driverId: varchar("driver_id").notNull().references(() => drivers.id),
  status: driverNotificationStatusEnum("status").default("pendente").notNull(),
  respondedAt: timestamp("responded_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const driverNotificationsRelations = relations(driverNotifications, ({ one }) => ({
  yard: one(yards, {
    fields: [driverNotifications.yardId],
    references: [yards.id],
  }),
  deliveryLocation: one(deliveryLocations, {
    fields: [driverNotifications.deliveryLocationId],
    references: [deliveryLocations.id],
  }),
  driver: one(drivers, {
    fields: [driverNotifications.driverId],
    references: [drivers.id],
  }),
}));

export const insertDriverNotificationSchema = createInsertSchema(driverNotifications).omit({
  id: true,
  createdAt: true,
  respondedAt: true,
});

export type InsertDriverNotification = z.infer<typeof insertDriverNotificationSchema>;
export type DriverNotification = typeof driverNotifications.$inferSelect;

// ============== REQUEST COUNTER (for OTD numbers) ==============
export const requestCounter = pgTable("request_counter", {
  id: varchar("id").primaryKey().default("transport_counter"),
  lastNumber: integer("last_number").default(0).notNull(),
});

export type RequestCounter = typeof requestCounter.$inferSelect;

// ============== USUÁRIOS DO SISTEMA (System Users) ==============
export const userRoleEnum = pgEnum("user_role", [
  "admin",
  "operador",
  "visualizador"
]);

export const systemUsers = pgTable("system_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  username: varchar("username", { length: 100 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  role: userRoleEnum("role").default("operador").notNull(),
  isActive: text("is_active").default("true"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSystemUserSchema = createInsertSchema(systemUsers).omit({
  id: true,
  createdAt: true,
}).extend({
  name: z.string().min(2, "Nome é obrigatório"),
  email: z.string().email("E-mail inválido"),
  username: z.string().min(3, "Usuário deve ter no mínimo 3 caracteres"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
});

export type InsertSystemUser = z.infer<typeof insertSystemUserSchema>;
export type SystemUser = typeof systemUsers.$inferSelect;

// ============== PERMISSÕES POR PERFIL (Role Permissions) ==============
export const featureKeys = [
  "dashboard",
  "transportes",
  "coletas",
  "motoristas",
  "montadoras",
  "api-docs",
  "patios",
  "clientes",
  "locais",
  "veiculos",
  "usuarios",
  "localizar-motorista",
  "trafego-agora",
  "portaria",
  "financeiro",
] as const;

export type FeatureKey = typeof featureKeys[number];

export const rolePermissions = pgTable("role_permissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  role: userRoleEnum("role").notNull(),
  feature: varchar("feature", { length: 50 }).notNull().$type<FeatureKey>(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertRolePermissionSchema = createInsertSchema(rolePermissions).omit({
  id: true,
  createdAt: true,
});

export type InsertRolePermission = z.infer<typeof insertRolePermissionSchema>;
export type RolePermission = typeof rolePermissions.$inferSelect;

// ============== PRESTAÇÃO DE CONTAS (Expense Settlements) ==============
export const expenseSettlementStatusEnum = pgEnum("expense_settlement_status", [
  "pendente",        // Aguardando envio pelo motorista
  "enviado",         // Enviado pelo motorista, aguardando análise
  "devolvido",       // Devolvido para o motorista (foto ruim, etc)
  "aprovado",        // Aprovado pelo financeiro
  "assinado"         // Assinado pelo motorista no app
]);

export const expenseTypeEnum = pgEnum("expense_type", [
  "pedagio",
  "combustivel",
  "alimentacao",
  "hospedagem",
  "manutencao",
  "multa",
  "estacionamento",
  "lavagem",
  "outros"
]);

export const expenseSettlements = pgTable("expense_settlements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  transportId: varchar("transport_id").notNull().references(() => transports.id),
  driverId: varchar("driver_id").notNull().references(() => drivers.id),
  status: expenseSettlementStatusEnum("status").default("pendente"),
  
  // Resumo enviado pelo motorista
  driverNotes: text("driver_notes"),
  totalExpenses: text("total_expenses"),  // Valor total das despesas
  
  // Valores do transporte (copiados para referência)
  routeDistance: text("route_distance"),
  estimatedTolls: text("estimated_tolls"),
  estimatedFuel: text("estimated_fuel"),
  
  // Datas importantes
  submittedAt: timestamp("submitted_at"),        // Quando motorista enviou
  reviewedAt: timestamp("reviewed_at"),          // Quando foi analisado
  approvedAt: timestamp("approved_at"),          // Quando foi aprovado
  signedAt: timestamp("signed_at"),              // Quando foi assinado
  
  // Usuário que analisou
  reviewedByUserId: varchar("reviewed_by_user_id").references(() => systemUsers.id),
  
  // Motivo da devolução (se aplicável)
  returnReason: text("return_reason"),
  
  // Documento gerado (URL do PDF)
  settlementDocumentUrl: text("settlement_document_url"),
  
  // Assinatura do motorista (imagem base64 ou URL)
  driverSignature: text("driver_signature"),
  
  createdAt: timestamp("created_at").defaultNow(),
});

export const expenseSettlementsRelations = relations(expenseSettlements, ({ one, many }) => ({
  transport: one(transports, {
    fields: [expenseSettlements.transportId],
    references: [transports.id],
  }),
  driver: one(drivers, {
    fields: [expenseSettlements.driverId],
    references: [drivers.id],
  }),
  reviewedByUser: one(systemUsers, {
    fields: [expenseSettlements.reviewedByUserId],
    references: [systemUsers.id],
  }),
  items: many(expenseSettlementItems),
}));

// Itens da prestação de contas (cada despesa com foto)
export const expenseSettlementItems = pgTable("expense_settlement_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  settlementId: varchar("settlement_id").notNull().references(() => expenseSettlements.id),
  type: expenseTypeEnum("type").notNull(),
  description: text("description"),
  amount: text("amount").notNull(),         // Valor em R$
  photoUrl: text("photo_url").notNull(),    // Foto do comprovante
  
  // Status da foto (para devoluções)
  photoStatus: text("photo_status").default("ok"),  // ok, borrada, ilegivel
  photoRejectionReason: text("photo_rejection_reason"),
  
  createdAt: timestamp("created_at").defaultNow(),
});

export const expenseSettlementItemsRelations = relations(expenseSettlementItems, ({ one }) => ({
  settlement: one(expenseSettlements, {
    fields: [expenseSettlementItems.settlementId],
    references: [expenseSettlements.id],
  }),
}));

export const insertExpenseSettlementSchema = createInsertSchema(expenseSettlements).omit({
  id: true,
  createdAt: true,
});

export const insertExpenseSettlementItemSchema = createInsertSchema(expenseSettlementItems).omit({
  id: true,
  createdAt: true,
});

export type InsertExpenseSettlement = z.infer<typeof insertExpenseSettlementSchema>;
export type ExpenseSettlement = typeof expenseSettlements.$inferSelect;
export type InsertExpenseSettlementItem = z.infer<typeof insertExpenseSettlementItemSchema>;
export type ExpenseSettlementItem = typeof expenseSettlementItems.$inferSelect;

// ============== CHECK POINTS ==============
export const checkpoints = pgTable("checkpoints", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  address: text("address"),
  city: text("city"),
  state: varchar("state", { length: 2 }),
  latitude: text("latitude").notNull(),
  longitude: text("longitude").notNull(),
  isActive: text("is_active").default("true"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCheckpointSchema = createInsertSchema(checkpoints).omit({
  id: true,
  createdAt: true,
});

export type InsertCheckpoint = z.infer<typeof insertCheckpointSchema>;
export type Checkpoint = typeof checkpoints.$inferSelect;

// Transport Checkpoints - associação de checkpoints a transportes
export const transportCheckpoints = pgTable("transport_checkpoints", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  transportId: varchar("transport_id").notNull().references(() => transports.id),
  checkpointId: varchar("checkpoint_id").notNull().references(() => checkpoints.id),
  orderIndex: integer("order_index").notNull(), // ordem do checkpoint na rota
  status: varchar("status", { length: 20 }).default("pendente").notNull(), // pendente, alcancado, concluido
  reachedAt: timestamp("reached_at"), // quando o motorista alcançou o checkpoint
  latitude: text("latitude"), // localização real quando alcançou
  longitude: text("longitude"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const transportCheckpointsRelations = relations(transportCheckpoints, ({ one }) => ({
  transport: one(transports, {
    fields: [transportCheckpoints.transportId],
    references: [transports.id],
  }),
  checkpoint: one(checkpoints, {
    fields: [transportCheckpoints.checkpointId],
    references: [checkpoints.id],
  }),
}));

export const insertTransportCheckpointSchema = createInsertSchema(transportCheckpoints).omit({
  id: true,
  createdAt: true,
});

export type InsertTransportCheckpoint = z.infer<typeof insertTransportCheckpointSchema>;
export type TransportCheckpoint = typeof transportCheckpoints.$inferSelect;

// ============== AVALIAÇÕES DE MOTORISTAS (Driver Evaluations) ==============
export const ratingValueEnum = pgEnum("rating_value", [
  "pessimo",
  "ruim",
  "regular",
  "bom",
  "excelente"
]);

export const driverEvaluations = pgTable("driver_evaluations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  transportId: varchar("transport_id").notNull().references(() => transports.id),
  driverId: varchar("driver_id").notNull().references(() => drivers.id),
  evaluatorId: varchar("evaluator_id").notNull(),
  evaluatorName: text("evaluator_name").notNull(),
  
  posturaProfissional: ratingValueEnum("postura_profissional").notNull(),
  pontualidade: ratingValueEnum("pontualidade").notNull(),
  apresentacaoPessoal: ratingValueEnum("apresentacao_pessoal").notNull(),
  cordialidade: ratingValueEnum("cordialidade").notNull(),
  cumpriuProcesso: ratingValueEnum("cumpriu_processo").notNull(),
  
  hadIncident: text("had_incident").default("false"),
  incidentDescription: text("incident_description"),
  
  averageScore: numeric("average_score", { precision: 3, scale: 2 }),
  
  createdAt: timestamp("created_at").defaultNow(),
});

export const driverEvaluationsRelations = relations(driverEvaluations, ({ one }) => ({
  transport: one(transports, {
    fields: [driverEvaluations.transportId],
    references: [transports.id],
  }),
  driver: one(drivers, {
    fields: [driverEvaluations.driverId],
    references: [drivers.id],
  }),
}));

export const insertDriverEvaluationSchema = createInsertSchema(driverEvaluations).omit({
  id: true,
  createdAt: true,
});

export type InsertDriverEvaluation = z.infer<typeof insertDriverEvaluationSchema>;
export type DriverEvaluation = typeof driverEvaluations.$inferSelect;
