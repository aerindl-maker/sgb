import z from "zod"

//

const ThresholdOp = ["<", "<=", "=", "!=", ">=", ">"] as const
type ThresholdOp = (typeof ThresholdOp)[number]

//

const ThresholdSchema = z.object({
    id: z.coerce.number().int(),
    icon: z.string().default("mdi-water"),
    value: z.coerce.number(),
    reading: z.string(),
    message: z.string(),
    operator: z.enum(ThresholdOp),
    espId: z.number().int().nullish(),
    createdAt: z.coerce.date(),
    updatedAt: z.coerce.date(),
})

const ThresholdQuerySchema = ThresholdSchema
    .omit({ icon: true })
    .extend({ icon: z.string() })
    .partial()

const ThresholdCreateSchema = ThresholdSchema.omit({ id: true, espId: true, createdAt: true, updatedAt: true })
const ThresholdUpdateSchema = ThresholdSchema.omit({ id: true, espId: true, createdAt: true, updatedAt: true }).partial()
const ThresholdDeleteSchema = ThresholdSchema.pick({ reading: true })

//

type ThresholdSchema = z.infer<typeof ThresholdSchema>
type ThresholdQuerySchema = z.infer<typeof ThresholdQuerySchema>
type ThresholdCreateSchema = z.infer<typeof ThresholdCreateSchema>
type ThresholdUpdateSchema = z.infer<typeof ThresholdUpdateSchema>
type ThresholdDeleteSchema = z.infer<typeof ThresholdDeleteSchema>

//

export {
    ThresholdOp,
    ThresholdSchema,
    ThresholdQuerySchema,
    ThresholdCreateSchema,
    ThresholdUpdateSchema,
    ThresholdDeleteSchema,
}
