const { z } = require("zod");

// Zod validation schemas for user routes
const createUserSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const changePasswordSchema = z.object({
  oldPassword: z.string().min(8, "Old password must be at least 8 characters"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
});

const updateUserSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters").optional(),
  email: z.string().email("Invalid email format").optional(),
  age: z.number().int().min(0, "Age must be a positive integer").optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: "At least one field must be provided for update",
});

module.exports = {
  createUserSchema,
  loginSchema,
  changePasswordSchema,
  updateUserSchema,
};