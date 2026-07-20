import z from "zod"

export const LoginSchema=z.object({
    name:z.string(),
    email:z.string(),
    
})