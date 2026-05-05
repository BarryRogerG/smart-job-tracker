const { z } = require("zod");

const registerSchema = z.object({  
  body: z.object({ 
    email: z
      .string()
      .email("Please provide a valid email")
      .transform((value) => value.toLowerCase()),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters long")
      .max(128, "Password is too long"),
    name: z.string().min(1).max(100).optional(),  
  }),
});

const loginSchema = z.object({
  body: z.object({
    email: z
      .string()
      .email("Please provide a valid email")
      .transform((value) => value.toLowerCase()),
    password: z.string().min(1, "Password is required"),
  }),
});

module.exports = {
  registerSchema,
  loginSchema,
};
