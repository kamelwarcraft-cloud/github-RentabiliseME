import { z } from "zod";

export const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  companyName: z.string().min(2),
  hourlyCost: z.number().min(1), // €/h
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const ProjectCreateSchema = z.object({
  name: z.string().min(2),
  clientName: z.string().optional(),
  address: z.string().optional(),
  revenue: z.number().min(0), // €
  plannedLaborHours: z.number().min(0).optional(),
  plannedMaterials: z.number().min(0).optional(),
  plannedSubcontract: z.number().min(0).optional(),
  plannedOther: z.number().min(0).optional(),
});

export const TimeEntryCreateSchema = z.object({
  projectId: z.string(),
  date: z.string(),
  // Hard limits to avoid data corruption / abuse
  minutes: z.number().int().min(1).max(24 * 60),
  task: z.string().optional(),
  note: z.string().optional(),
});

export const ExpenseCreateSchema = z.object({
  projectId: z.string(),
  date: z.string(),
  category: z.enum(["MATERIAL", "RENTAL", "TRAVEL", "SUBCONTRACT", "OTHER"]),
  // Prevent absurd values that would break charts
  amount: z.number().min(0).max(1_000_000), // €
  vendor: z.string().optional(),
  note: z.string().optional(),
});
