import { z } from "zod"

const envSchema = z.object({
     CLOUDINARY_CLOUD_NAME: z.string(),
     CLOUDINARY_API_KEY: z.string(),
     CLOUDINARY_API_SECRET: z.string(),
     CLIENT_URL: z.string(),
     ACCESS_TOKEN_EXPIRY: z.string(),
     REFRESH_TOKEN_EXPIRY: z.string(),
     REFRESH_TOKEN_SECRET: z.string(),
     PORT: z.string(),
     REDIS_USERNAME: z.string(),
     DATABASE_URL: z.string(),
     REDIS_HOST: z.string(),
     REDIS_PORT: z.string(),
     REDIS_PASSWORD: z.string(),
     ACCESS_TOKEN_SECRET: z.string(),
     NODE_ENV: z.string().optional(),
})

export const env = envSchema.parse(process.env)
